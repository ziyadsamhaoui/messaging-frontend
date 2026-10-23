pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    parameters {
        string(name: 'NEXT_PUBLIC_API_GATEWAY_URL',
               defaultValue: 'http://localhost:8080',
               description: 'Gateway URL baked into the browser bundle.')
        string(name: 'NEXT_PUBLIC_WS_URL',
               defaultValue: 'http://localhost:8080/ws',
               description: 'SockJS/WebSocket URL baked into the browser bundle.')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh 'npm ci'
                sh 'npm run lint'
                sh 'npm test'
                sh 'NEXT_TELEMETRY_DISABLED=1 npm run build'
            }
        }

        stage('Build image') {
            steps {
                script {
                    def shortSha = sh(
                        script: 'git rev-parse --short=7 HEAD',
                        returnStdout: true
                    ).trim()

                    def image = "messaging-frontend:sha-${shortSha}"

                    // NEXT_PUBLIC_* are inlined by `next build`, so they are
                    // build arguments and not runtime settings.
                    def buildArgs = [
                        "--build-arg NEXT_PUBLIC_API_GATEWAY_URL=${params.NEXT_PUBLIC_API_GATEWAY_URL}",
                        "--build-arg NEXT_PUBLIC_WS_URL=${params.NEXT_PUBLIC_WS_URL}"
                    ].join(' ')

                    sh "docker build -t ${image} ${buildArgs} ."

                    echo "Built Docker image: ${image}"
                }
            }
        }
    }
}
