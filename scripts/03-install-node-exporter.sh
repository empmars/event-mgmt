#!/bin/bash
# Run on the APP/JENKINS instance so the monitoring instance can scrape host metrics (port 9100)
docker rm -f node-exporter 2>/dev/null || true
docker run -d --name node-exporter --restart unless-stopped --net host --pid host \
  -v /:/host:ro,rslave prom/node-exporter:latest --path.rootfs=/host
