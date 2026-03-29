# Platform API

Minimal Go + Gin backend for the Grafana Control Plane frontend.

## Endpoints

- `GET /api/platform/v1/healthz`
- `GET /api/platform/v1/me/drafts`
- `POST /api/platform/v1/drafts/:draftId/publish`
- `POST /api/platform/v1/drafts/:draftId/abandon`
- `GET /api/platform/v1/drafts/:draftId/conflict`
- `POST /api/platform/v1/drafts/:draftId/rebase`
- `POST /api/platform/v1/drafts/:draftId/save-as-copy`
- `POST /api/platform/v1/drafts/:draftId/takeover`

## Run

```bash
go mod tidy
go run ./cmd/server
```

The server listens on `:8081` by default. Set `PORT` to change it.
