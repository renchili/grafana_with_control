# Grafana Control Plane App Plugin

Usable starter plugin focused on:
- Drafts page
- Conflict Resolve page

Expected backend APIs:
- GET /api/platform/v1/me/drafts
- POST /api/platform/v1/drafts/{draftId}/publish
- POST /api/platform/v1/drafts/{draftId}/abandon
- GET /api/platform/v1/drafts/{draftId}/conflict
- POST /api/platform/v1/drafts/{draftId}/rebase
- POST /api/platform/v1/drafts/{draftId}/save-as-copy
- POST /api/platform/v1/drafts/{draftId}/takeover
