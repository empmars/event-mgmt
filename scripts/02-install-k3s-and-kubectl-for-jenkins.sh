#!/bin/bash
# TASK 2 - single-node Kubernetes (k3s) on the SAME instance as Jenkins
set -e
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp /etc/rancher/k3s/k3s.yaml /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube
sudo systemctl restart jenkins
kubectl get nodes
