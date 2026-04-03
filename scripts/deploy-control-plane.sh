#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_DIR="$ROOT_DIR/rody-grafanacontrolplane-app"
API_IMAGE="grafana-control-plane-platform-api:local"
DEPLOY_DIR="$ROOT_DIR/deploy"

RESET_DB="${RESET_DB:-0}"

echo "[deploy] root:   $ROOT_DIR"
echo "[deploy] plugin: $PLUGIN_DIR"
echo "[deploy] deploy: $DEPLOY_DIR"

if [[ ! -d "$PLUGIN_DIR" ]]; then
  echo "[deploy] plugin dir not found: $PLUGIN_DIR" >&2
  exit 1
fi

echo "[deploy] build plugin..."
cd "$PLUGIN_DIR"

if [[ ! -d node_modules ]]; then
  npm install
fi

rm -rf dist
npm run build

if [[ ! -f dist/plugin.json || ! -f dist/module.js ]]; then
  echo "[deploy] plugin build failed: dist artifacts missing" >&2
  exit 1
fi

echo "[deploy] build platform-api image..."
cd "$ROOT_DIR/platform-api"
go mod tidy
docker build -t "$API_IMAGE" .

echo "[deploy] start stack..."
cd "$DEPLOY_DIR"

if [[ "$RESET_DB" == "1" ]]; then
  echo "[deploy] RESET_DB=1 -> removing containers, networks and volumes"
  docker compose down -v --remove-orphans
else
  docker compose down --remove-orphans
fi

docker compose up -d --build

echo "[deploy] waiting for services..."
sleep 5

echo "[deploy] compose status:"
docker compose ps

echo
echo "======================================"
echo "READY"
echo "Grafana: http://localhost:3000"
echo "App:     http://localhost:3000/a/rody-grafanacontrolplane-app/drafts"
echo "======================================"
echo
echo "Tip:"
echo "  RESET_DB=1 bash scripts/deploy-control-plane.sh   # rebuild mysql and rerun DDL/seed"
