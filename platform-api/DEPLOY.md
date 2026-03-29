# Platform API deployment

This directory contains a minimal Go + Gin backend for the Grafana Control Plane frontend.

## Files

- `Dockerfile`: general-purpose image using Debian slim as the runtime base
- `Dockerfile.distroless`: smaller production-oriented image using distroless
- `compose.yaml`: one-command local deployment
- `.env.example`: runtime environment example

## Recommended default image

For most teams, use the default `Dockerfile`:
- builder: `golang:1.24-bookworm`
- runtime: `debian:bookworm-slim`

This is more portable and easier to debug than Alpine-based builds.

## One-command deployment

```bash
cd platform-api
cp .env.example .env
docker compose -f compose.yaml up -d --build
```

## Verify

```bash
curl http://localhost:8081/api/platform/v1/healthz
```

Expected response:

```json
{"status":"ok"}
```

## Use the distroless image

```bash
docker build -f Dockerfile.distroless -t grafana-control-plane-platform-api:distroless .
docker run --rm -p 8081:8081 -e PORT=8081 grafana-control-plane-platform-api:distroless
```

## Stop

```bash
docker compose -f compose.yaml down
```
