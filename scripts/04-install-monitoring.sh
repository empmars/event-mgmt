#!/bin/bash
# TASK 3 - run on EC2 #2 (monitoring). Usage: bash 04-install-monitoring.sh <APP_EC2_PRIVATE_IP>
set -e
APP_IP=${1:?Usage: $0 <APP_EC2_PRIVATE_IP>}
sudo apt-get update -y && sudo apt-get install -y docker.io docker-compose-v2 || sudo apt-get install -y docker.io docker-compose
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
cd "$(dirname "$0")/../monitoring"
sed -i "s|APP_EC2_PRIVATE_IP|$APP_IP|g" prometheus.yml
sudo docker compose up -d || sudo docker-compose up -d
echo "Grafana: http://<MONITOR-EC2-PUBLIC-IP>:3000  (admin / admin)"
