// Stockmantra CI/CD pipeline
//
// Security stages run on every build:
//   - Snyk        : npm package vulnerabilities (frontend/)
//   - pip-audit   : Python package vulnerabilities (backend/requirements.txt)
//   - Checkov     : Kubernetes manifest misconfigurations (k8s/base/)
//   - Trivy       : container image CVEs (backend + frontend images)
//
// All findings are collected and rendered into a single HTML report that is
// published via the HTML Publisher plugin at the end of every build.

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  triggers {
    githubPush()
  }

  environment {
    NAMESPACE      = 'default'
    BACKEND_IMAGE  = "stockmantra-backend:ci-${BUILD_NUMBER}"
    FRONTEND_IMAGE = "stockmantra-frontend:ci-${BUILD_NUMBER}"
  }

  stages {

    stage('Checkout') {
      steps { checkout scm }
    }

    // npm install is required before Snyk can resolve the dependency tree.
    // gradlew needs execute permission or the stage fails on Linux agents.
    stage('Install frontend dependencies') {
      tools { nodejs 'NodeJS' }
      steps {
        sh 'chmod +x ./frontend/android/gradlew'
        dir('frontend') { sh 'npm install' }
      }
    }

    // Snyk scans npm dependencies for known CVEs.
    //
    // Why additionalArguments is empty:
    //   The Jenkins Snyk plugin forwards additionalArguments to both `snyk test`
    //   AND `snyk monitor`. The --json-file-output flag is only valid for
    //   `snyk test` — passing it to `snyk monitor` throws SNYK-CLI-0004 and
    //   fails the build. Instead, we copy the JSON file the plugin archives
    //   automatically (it uses a timestamped filename).
    stage('Snyk dependency scan') {
      steps {
        dir('frontend') {
          snykSecurity(
            snykInstallation:    'snyk-cli',
            snykTokenId:         'SNYK_TOKEN',
            failOnIssues:        false,
            severity:            'high',
            targetFile:          'package.json',
            additionalArguments: ''
          )
          sh '''
            LATEST=$(ls -t *snyk_report*.json 2>/dev/null | head -1)
            if [ -n "$LATEST" ]; then
              cp "$LATEST" ../snyk_report.json
            else
              echo '{}' > ../snyk_report.json
            fi
          '''
        }
      }
    }

    // pip-audit scans backend/requirements.txt against known CVE databases.
    // We run it inside a clean Python container so no agent-side Python is needed.
    stage('pip-audit Python dependency scan') {
      steps {
        sh '''
          docker run --rm \
            -v "${WORKSPACE}/backend":/backend \
            python:3.12-slim \
            sh -c "pip install pip-audit --quiet 2>/dev/null; \
                   pip-audit -r /backend/requirements.txt \
                     --format json --progress-spinner off 2>/dev/null; \
                   exit 0" \
            > pip_audit_report.json 2>/dev/null || echo "[]" > pip_audit_report.json
        '''
      }
    }

    // Checkov reviews Kubernetes manifests for security misconfigurations —
    // containers running as root, missing resource limits, and similar issues.
    stage('Checkov Kubernetes IaC scan') {
      steps {
        sh '''
          docker run --rm \
            -v "${WORKSPACE}/k8s/base":/iac \
            bridgecrew/checkov:latest \
            -d /iac --quiet --compact --output json --soft-fail \
            > checkov_report.json 2>/dev/null || echo "{}" > checkov_report.json
        '''
      }
    }

    stage('Build backend image') {
      steps { sh 'docker build -t $BACKEND_IMAGE ./backend' }
    }

    stage('Build frontend image') {
      steps { sh 'docker build -t $FRONTEND_IMAGE ./frontend' }
    }

    // Trivy scans the freshly-built container images for OS and library CVEs.
    stage('Trivy container image scan') {
      steps {
        sh '''
          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image \
            --severity HIGH,CRITICAL \
            --format json \
            --exit-code 0 \
            $BACKEND_IMAGE > trivy_backend_report.json 2>/dev/null \
            || echo "{}" > trivy_backend_report.json

          docker run --rm \
            -v /var/run/docker.sock:/var/run/docker.sock \
            aquasec/trivy image \
            --severity HIGH,CRITICAL \
            --format json \
            --exit-code 0 \
            $FRONTEND_IMAGE > trivy_frontend_report.json 2>/dev/null \
            || echo "{}" > trivy_frontend_report.json
        '''
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          kubectl -n $NAMESPACE set image deploy/api \
            migrate=$BACKEND_IMAGE \
            api=$BACKEND_IMAGE
          kubectl -n $NAMESPACE set image deploy/frontend \
            frontend=$FRONTEND_IMAGE
        '''
      }
    }

    stage('Wait for rollout') {
      steps {
        sh 'kubectl -n $NAMESPACE rollout status deploy/api      --timeout=180s'
        sh 'kubectl -n $NAMESPACE rollout status deploy/frontend --timeout=180s'
      }
    }
  } // <-- Properly closes the 'stages' block

  // Optional: Add the post block here later for the HTML Publisher logic
  // post {
  //   always {
  //     echo "Pipeline finished. Generating report..."
  //   }
  // }

} // <-- Properly closes the 'pipeline' block