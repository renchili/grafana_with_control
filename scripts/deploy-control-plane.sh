#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$ROOT_DIR/grafana-control-plane-plugin-full"
API_DIR="$ROOT_DIR/platform-api"
DEPLOY_DIR="$ROOT_DIR/deploy"

GRAFANA_PORT="${GRAFANA_PORT:-3000}"
GRAFANA_ADMIN_USER="${GRAFANA_ADMIN_USER:-admin}"
GRAFANA_ADMIN_PASSWORD="${GRAFANA_ADMIN_PASSWORD:-admin}"
IMAGE_NAME="${IMAGE_NAME:-grafana-control-plane-platform-api}"
IMAGE_TAG="${IMAGE_TAG:-local}"
MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-root}"
MYSQL_DATABASE="${MYSQL_DATABASE:-grafana_control_plane}"
MYSQL_USER="${MYSQL_USER:-platform}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-platform}"
RUN_STACK="${RUN_STACK:-1}"
FORCE_PLUGIN_BUILD="${FORCE_PLUGIN_BUILD:-0}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

log() {
  printf '[deploy-control-plane] %s\n' "$*"
}

need_cmd node
need_cmd npm
need_cmd go
need_cmd docker

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo 'missing required command: docker compose or docker-compose' >&2
  exit 1
fi

log "checking plugin build cache"
cd "$PLUGIN_DIR"

if [[ "$FORCE_PLUGIN_BUILD" == "1" ]]; then
  log "force rebuilding plugin"
  npm install
  npm run build
elif [[ ! -f "dist/module.js" || ! -f "dist/plugin.json" ]]; then
  log "dist missing, building plugin"
  npm install
  npm run build
else
  log "plugin already built, skip"
fi

if [[ ! -f "$PLUGIN_DIR/dist/module.js" || ! -f "$PLUGIN_DIR/dist/plugin.json" ]]; then
  echo 'plugin build did not produce dist assets' >&2
  exit 1
fi

log "building platform-api image"
cd "$API_DIR"
IMAGE_NAME="$IMAGE_NAME" IMAGE_TAG="$IMAGE_TAG" USE_BUILDX="${USE_BUILDX:-1}" NO_CACHE="${NO_CACHE:-0}" bash ./scripts/build-prod.sh

mkdir -p "$DEPLOY_DIR"
cat > "$DEPLOY_DIR/.env" <<ENVEOF
GRAFANA_PORT=$GRAFANA_PORT
GRAFANA_ADMIN_USER=$GRAFANA_ADMIN_USER
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
PLATFORM_API_IMAGE=${IMAGE_NAME}:${IMAGE_TAG}
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
MYSQL_DATABASE=$MYSQL_DATABASE
MYSQL_USER=$MYSQL_USER
MYSQL_PASSWORD=$MYSQL_PASSWORD
DATABASE_DSN=${MYSQL_USER}:${MYSQL_PASSWORD}@tcp(mysql:3306)/${MYSQL_DATABASE}?parseTime=true
ENVEOF

if [[ "$RUN_STACK" == "1" ]]; then
  log "starting gateway + grafana + platform-api + mysql"
  cd "$DEPLOY_DIR"
  "${DOCKER_COMPOSE[@]}" -f docker-compose.yaml up -d --build
  log "stack started"
  log "open http://127.0.0.1:${GRAFANA_PORT}"
  log "login ${GRAFANA_ADMIN_USER} / ${GRAFANA_ADMIN_PASSWORD}"
  log "health check: http://127.0.0.1:${GRAFANA_PORT}/api/platform/v1/healthz"
else
  log "build completed; RUN_STACK=0 so containers were not started"
fi
