// BadrLink — messaging-frontend
//
// Test, then build and publish a versioned container image. This replaces the
// previous GitHub Actions workflow; the stages and the published tags are the
// same.
//
// What the Jenkins side must provide:
//   * A multibranch pipeline job for this repository. Branch and tag builds are
//     discovered automatically; pull request builds (CHANGE_ID set) run tests
//     and build the image without publishing it.
//   * An agent with git, a working Docker daemon and Node 22 (npm) on PATH.
//   * A credential named `ghcr-credentials` of kind "Username with password":
//     the GitHub username plus a PAT with `write:packages`.
//
// Published images:
//   ghcr.io/ziyadsamhaoui/messaging-frontend:sha-<7 chars>  every build
//   ghcr.io/ziyadsamhaoui/messaging-frontend:latest         main only
//   ghcr.io/ziyadsamhaoui/messaging-frontend:<version>      v*.*.* tag builds
//
// NEXT_PUBLIC_* values are inlined by `next build`, so they are build arguments
// and not runtime settings: change them here and rebuild, or the browser bundle
// keeps the old URLs.

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

    environment {
        IMAGE = 'ghcr.io/ziyadsamhaoui/messaging-frontend'
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
                    def shortSha = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
                    def tags = ["sha-${shortSha}"]

                    // Multibranch pipelines set BRANCH_NAME for branches, and
                    // TAG_NAME in addition for tag builds.
                    if (!env.TAG_NAME && env.BRANCH_NAME == 'main') {
                        tags << 'latest'
                    }
                    if (env.TAG_NAME?.startsWith('v')) {
                        tags << env.TAG_NAME.substring(1)
                    }

                    def tagArgs = tags.collect { "-t ${IMAGE}:${it}" }.join(' ')
                    def buildArgs = [
                        "--build-arg NEXT_PUBLIC_API_GATEWAY_URL=${params.NEXT_PUBLIC_API_GATEWAY_URL}",
                        "--build-arg NEXT_PUBLIC_WS_URL=${params.NEXT_PUBLIC_WS_URL}"
                    ].join(' ')

                    sh "docker build ${tagArgs} ${buildArgs} ."

                    if (env.CHANGE_ID) {
                        // Pull request: prove the Dockerfile builds, publish nothing.
                        echo 'Pull request build — image built but not pushed.'
                    } else {
                        withCredentials([usernamePassword(
                                credentialsId: 'ghcr-credentials',
                                usernameVariable: 'GHCR_USER',
                                passwordVariable: 'GHCR_TOKEN')]) {
                            sh 'echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin'
                            tags.each { tag ->
                                sh "docker push ${IMAGE}:${tag}"
                            }
                        }
                    }
                }
            }
        }
    }
}
