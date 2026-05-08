#!/usr/bin/env bash
# deploy.sh – Build and deploy the Nhavis Next.js app to Google Cloud Run
#
# Prerequisites:
#   - Google Cloud SDK (gcloud) installed and initialised
#   - Docker installed and running
#   - Artifact Registry API enabled:
#       gcloud services enable artifactregistry.googleapis.com run.googleapis.com
#
# Usage:
#   ./deploy.sh [--project PROJECT_ID] [--region REGION] [--service SERVICE_NAME]
#
# All flags are optional; defaults are defined in the CONFIG section below.

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# CONFIG – override with flags or environment variables
# ──────────────────────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT:-}"          # e.g. my-gcp-project
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-nhavis}"
REPO_NAME="${AR_REPO:-nhavis-repo}"    # Artifact Registry repository name
IMAGE_TAG="${IMAGE_TAG:-latest}"

# ──────────────────────────────────────────────────────────────────────────────
# Parse command-line flags
# ──────────────────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)  PROJECT_ID="$2";    shift 2 ;;
    --region)   REGION="$2";        shift 2 ;;
    --service)  SERVICE_NAME="$2";  shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# ──────────────────────────────────────────────────────────────────────────────
# Validate required config
# ──────────────────────────────────────────────────────────────────────────────
if [[ -z "$PROJECT_ID" ]]; then
  # Try to pick it up from gcloud config
  PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
fi
if [[ -z "$PROJECT_ID" ]]; then
  echo "ERROR: GCP project ID is not set."
  echo "  Run:  gcloud config set project YOUR_PROJECT_ID"
  echo "  Or:   ./deploy.sh --project YOUR_PROJECT_ID"
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# Derived values
# ──────────────────────────────────────────────────────────────────────────────
AR_HOST="${REGION}-docker.pkg.dev"
IMAGE_URL="${AR_HOST}/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "========================================"
echo "  Nhavis – Cloud Run Deployment"
echo "========================================"
echo "  Project  : $PROJECT_ID"
echo "  Region   : $REGION"
echo "  Service  : $SERVICE_NAME"
echo "  Image    : $IMAGE_URL"
echo "========================================"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Ensure the Artifact Registry repository exists
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Ensuring Artifact Registry repository exists…"
gcloud artifacts repositories describe "$REPO_NAME" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --format="value(name)" > /dev/null 2>&1 \
|| gcloud artifacts repositories create "$REPO_NAME" \
    --project="$PROJECT_ID" \
    --location="$REGION" \
    --repository-format=docker \
    --description="Nhavis Docker images"

# ──────────────────────────────────────────────────────────────────────────────
# 2. Configure Docker to authenticate against Artifact Registry
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Configuring Docker credentials for Artifact Registry…"
gcloud auth configure-docker "${AR_HOST}" --quiet

# ──────────────────────────────────────────────────────────────────────────────
# 3. Build the Docker image
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Building Docker image…"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
docker build \
  --tag "$IMAGE_URL" \
  --platform linux/amd64 \
  "$SCRIPT_DIR"

# ──────────────────────────────────────────────────────────────────────────────
# 4. Push the image to Artifact Registry
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Pushing image to Artifact Registry…"
docker push "$IMAGE_URL"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Deploy (or update) the Cloud Run service
#
#  Key settings:
#    --port 3000              → Next.js standalone listens on 3000
#    --min-instances 0        → scale-to-zero for cost efficiency
#    --max-instances 3        → cap concurrent instances (adjust as needed)
#    --memory 512Mi           → adjust for your workload
#    --cpu 1                  → 1 vCPU
#    --set-secrets            → pull AUTH_SECRET from Secret Manager (recommended)
#                               Create it first:
#                               echo -n "your-secret" | gcloud secrets create AUTH_SECRET \
#                                 --data-file=- --project=$PROJECT_ID
# ──────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Deploying to Cloud Run…"

# Check if SECRET_AUTH is available in Secret Manager; fall back to env var
if gcloud secrets describe AUTH_SECRET --project="$PROJECT_ID" > /dev/null 2>&1; then
  SECRET_FLAG="--set-secrets=AUTH_SECRET=AUTH_SECRET:latest"
else
  echo "  WARN: Secret Manager secret 'AUTH_SECRET' not found."
  echo "        Falling back to --set-env-vars. Set it in Secret Manager for production:"
  echo "        echo -n 'your-secret' | gcloud secrets create AUTH_SECRET --data-file=- --project=$PROJECT_ID"
  AUTH_SECRET_VALUE="${AUTH_SECRET:-}"
  if [[ -z "$AUTH_SECRET_VALUE" ]]; then
    echo "  ERROR: AUTH_SECRET env var is also not set. Export it before running this script."
    exit 1
  fi
  SECRET_FLAG="--set-env-vars=AUTH_SECRET=${AUTH_SECRET_VALUE}"
fi

gcloud run deploy "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE_URL" \
  --platform=managed \
  --port=3000 \
  --min-instances=0 \
  --max-instances=3 \
  --memory=512Mi \
  --cpu=1 \
  --allow-unauthenticated \
  ${SECRET_FLAG}

# ──────────────────────────────────────────────────────────────────────────────
# 6. Print the service URL
# ──────────────────────────────────────────────────────────────────────────────
echo ""
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="value(status.url)")
echo "========================================"
echo "  Deploy complete!"
echo "  URL: $SERVICE_URL"
echo "========================================"
echo ""
echo "⚠  REMINDER: The JSON data files and uploaded photos are baked into / stored"
echo "   inside the container. They will NOT persist across deploys or restarts."
echo "   For a production setup, migrate to a proper database and use Cloud Storage"
echo "   (with GCS FUSE or signed URLs) for uploaded files."
