const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
app.use(express.json());
client.collectDefaultMetrics();
const bookingsCreated = new client.Counter({ name: 'bookings_created_total', help: 'Bookings created' });
const EVENT_URL = process.env.EVENT_SERVICE_URL || 'http://event-service:3001';

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres', port: 5432,
  user: process.env.DB_USER || 'eventuser', password: process.env.DB_PASSWORD || 'eventpass',
  database: process.env.DB_NAME || 'eventsdb'
});

async function initDb() {
  for (let i = 0; i < 20; i++) {
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY, event_id INT NOT NULL, name TEXT NOT NULL, email TEXT NOT NULL,
        seats INT NOT NULL, created_at TIMESTAMP DEFAULT NOW())`);
      console.log('DB ready'); return;
    } catch (e) { console.log('Waiting for DB...', e.message); await new Promise(r => setTimeout(r, 3000)); }
  }
  process.exit(1);
}

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'booking-service' }));
app.get('/metrics', async (_, res) => { res.set('Content-Type', client.register.contentType); res.end(await client.register.metrics()); });

app.get('/bookings', async (_, res) => res.json((await pool.query('SELECT * FROM bookings ORDER BY id DESC')).rows));

app.post('/bookings', async (req, res) => {
  const { event_id, name, email, seats = 1 } = req.body;
  if (!event_id || !name || !email) return res.status(400).json({ error: 'event_id, name, email required' });
  try {
    const r = await fetch(`${EVENT_URL}/events/${event_id}/reserve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seats })
    });
    if (!r.ok) return res.status(r.status).json(await r.json());
    const ins = await pool.query(
      'INSERT INTO bookings(event_id,name,email,seats) VALUES($1,$2,$3,$4) RETURNING *', [event_id, name, email, seats]);
    bookingsCreated.inc();
    res.status(201).json(ins.rows[0]);
  } catch (e) { res.status(502).json({ error: 'event-service unreachable', detail: e.message }); }
});

initDb().then(() => app.listen(3002, () => console.log('booking-service on 3002')));
