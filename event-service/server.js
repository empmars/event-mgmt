const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
app.use(express.json());
client.collectDefaultMetrics();
const httpCount = new client.Counter({ name: 'event_service_http_requests_total', help: 'HTTP requests', labelNames: ['method', 'status'] });
app.use((req, res, next) => { res.on('finish', () => httpCount.inc({ method: req.method, status: res.statusCode })); next(); });

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres', port: 5432,
  user: process.env.DB_USER || 'eventuser', password: process.env.DB_PASSWORD || 'eventpass',
  database: process.env.DB_NAME || 'eventsdb'
});

async function initDb() {
  for (let i = 0; i < 20; i++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, location TEXT, event_date DATE,
        total_seats INT NOT NULL, available_seats INT NOT NULL)`);
      console.log('DB ready'); return;
    } catch (e) { console.log('Waiting for DB...', e.message); await new Promise(r => setTimeout(r, 3000)); }
  }
  process.exit(1);
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'event-service' }));
app.get('/metrics', async (_, res) => { res.set('Content-Type', client.register.contentType); res.end(await client.register.metrics()); });

app.get('/events', async (_, res) => res.json((await pool.query('SELECT * FROM events ORDER BY event_date')).rows));
app.get('/events/:id', async (req, res) => {
  const r = await pool.query('SELECT * FROM events WHERE id=$1', [req.params.id]);
  r.rows[0] ? res.json(r.rows[0]) : res.status(404).json({ error: 'Not found' });
});
app.post('/events', async (req, res) => {
  const { title, location, event_date, total_seats } = req.body;
  if (!title || !total_seats) return res.status(400).json({ error: 'title and total_seats required' });
  const r = await pool.query(
    'INSERT INTO events(title,location,event_date,total_seats,available_seats) VALUES($1,$2,$3,$4,$4) RETURNING *',
    [title, location, event_date, total_seats]);
  res.status(201).json(r.rows[0]);
});
app.delete('/events/:id', async (req, res) => { await pool.query('DELETE FROM events WHERE id=$1', [req.params.id]); res.status(204).end(); });

// Called by booking-service (service-to-service)
app.post('/events/:id/reserve', async (req, res) => {
  const seats = parseInt(req.body.seats || 1, 10);
  const r = await pool.query(
    'UPDATE events SET available_seats = available_seats - $2 WHERE id=$1 AND available_seats >= $2 RETURNING *',
    [req.params.id, seats]);
  r.rows[0] ? res.json(r.rows[0]) : res.status(409).json({ error: 'Not enough seats or event not found' });
});

initDb().then(() => app.listen(3001, () => console.log('event-service on 3001')));
