#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd -- "$PROJECT_DIR/.." && pwd)"

IMAGE_NAME="${IMAGE_NAME:-grafana-control-plane-platform-api}"
IMAGE_TAG="${IMAGE_TAG:-local}"
FULL_IMAGE_NAME="${IMAGE_NAME}:${IMAGE_TAG}"
CONTAINER_NAME="${CONTAINER_NAME:-platform-api}"
PORT="${PORT:-8081}"
DOCKERFILE="${DOCKERFILE:-$PROJECT_DIR/Dockerfile}"
PLATFORM="${PLATFORM:-linux/amd64}"
RUN_CONTAINER="${RUN_CONTAINER:-0}"
PUSH_IMAGE="${PUSH_IMAGE:-0}"
USE_BUILDX="${USE_BUILDX:-1}"
NO_CACHE="${NO_CACHE:-0}"

log() {
  printf '[build-prod] %s\n' "$*"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

require_cmd go
require_cmd docker

cd "$PROJECT_DIR"

log "project dir: $PROJECT_DIR"
log "image: $FULL_IMAGE_NAME"
log "platform: $PLATFORM"

if [[ ! -f go.mod ]]; then
  echo "go.mod not found under $PROJECT_DIR" >&2
  exit 1
fi

log "syncing go modules"
go mod tidy

log "validating module graph"
go mod download

go test ./... >/dev/null

BUILD_ARGS=(
  --file "$DOCKERFILE"
  --platform "$PLATFORM"
  --tag "$FULL_IMAGE_NAME"
)

if [[ "$NO_CACHE" == "1" ]]; then
  BUILD_ARGS+=(--no-cache)
fi

if [[ "$USE_BUILDX" == "1" ]] && docker buildx version >/dev/null 2>&1; then
  log "building with docker buildx"
  if [[ "$PUSH_IMAGE" == "1" ]]; then
    docker buildx build "${BUILD_ARGS[@]}" --push "$PROJECT_DIR"
  else
    docker buildx build "${BUILD_ARGS[@]}" --load "$PROJECT_DIR"
  fi
else
  log "building with docker build"
  if [[ "$PUSH_IMAGE" == "1" ]]; then
    echo "PUSH_IMAGE=1 requires buildx" >&2
    exit 1
  fi
  docker build "${BUILD_ARGS[@]}" "$PROJECT_DIR"
fi

if [[ "$RUN_CONTAINER" == "1" ]]; then
  log "starting container: $CONTAINER_NAME"
  if docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi

  docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:8081" \
    "$FULL_IMAGE_NAME"

  log "container started"
  log "health check: curl http://127.0.0.1:$PORT/"
fi

log "done"
