#!/bin/bash
# TASK 1 - Jenkins install (Ubuntu). Run: bash 01-install-jenkins.sh
set -e
sudo rm -f /etc/apt/sources.list.d/jenkins.list
sudo mkdir -p /etc/apt/keyrings
sudo apt-get update -y
sudo apt-get install -y fontconfig openjdk-21-jre wget curl git docker.io
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list
sudo apt-get update -y
sudo apt-get install -y jenkins
sudo systemctl enable --now docker jenkins
sudo usermod -aG docker jenkins
sudo usermod -aG docker ubuntu
sudo systemctl restart jenkins
echo "Jenkins: http://<EC2-PUBLIC-IP>:8080   Admin password:"
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
