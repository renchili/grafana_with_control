#!/usr/bin/env bash
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "[deploy] build plugin"
cd "$ROOT/rody-grafanacontrolplane-app"
npm install
npm run build

echo "[deploy] build api"
cd "$ROOT/platform-api"
go mod tidy
docker build -t grafana-control-plane-platform-api:local .

echo "[deploy] start stack"
cd "$ROOT/deploy"
docker compose down || true
docker compose up -d --build

echo "================================="
echo "READY: http://localhost:3000"
echo "================================="
