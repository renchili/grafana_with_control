#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
IMAGE_NAME="${IMAGE_NAME:-grafana-control-plane-platform-api:local}"

cd "$PROJECT_DIR"

if [[ ! -f go.sum ]]; then
  echo "[build-local] go.sum not found, running go mod tidy..."
  go mod tidy
fi

echo "[build-local] building Docker image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" .

echo "[build-local] done"
