pipeline {
  agent any
  triggers { githubPush() }
  environment {
    DOCKER_USER = 'sami01122'
    TAG         = "${env.BUILD_NUMBER}"
    KUBECONFIG  = '/var/lib/jenkins/.kube/config'
    NS          = 'event-system'
  }
  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Test (install deps + syntax check)') {
      steps {
        sh '''
          for s in event-service booking-service; do
            docker run --rm -v "$PWD/$s":/app -w /app node:20-alpine sh -c "npm install --omit=dev && node --check server.js"
          done
        '''
      }
    }

    stage('Build Docker images') {
      steps {
        sh '''
          for s in frontend event-service booking-service; do
            docker build -t $DOCKER_USER/$s:$TAG -t $DOCKER_USER/$s:latest ./$s
          done
        '''
      }
    }

    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'U', passwordVariable: 'P')]) {
          sh '''
            echo "$P" | docker login -u "$U" --password-stdin
            for s in frontend event-service booking-service; do
              docker push $DOCKER_USER/$s:$TAG
              docker push $DOCKER_USER/$s:latest
            done
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          rm -rf rendered && cp -r k8s rendered
          sed -i "s|DOCKER_USER|$DOCKER_USER|g; s|:TAG|:$TAG|g" rendered/*.yaml
          kubectl apply -f rendered/00-namespace.yaml
          kubectl apply -f rendered/
          for d in postgres event-service booking-service frontend; do
            kubectl -n $NS rollout status deployment/$d --timeout=180s
          done
        '''
      }
    }

    stage('Smoke test') {
      steps { sh 'sleep 5; curl -sf http://localhost:30080/api/events && echo " <- API OK"' }
    }
  }
  post {
    always  { sh 'docker logout || true' }
    success { echo "Deployed build ${TAG}: http://<EC2-PUBLIC-IP>:30080" }
    failure { sh 'kubectl -n event-system get pods || true' }
  }
}
