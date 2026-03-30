# Grafana Control Plane

> Turn Grafana dashboards from editable configs into **governed, versioned, collaborative resources**.

![Drafts](docs/screenshots/drafts.png)

---

## 🚀 Core Value

- 🔐 Governed Editing — no direct modification of production dashboards
- 🧾 Draft Workflow — create, edit, save, and publish safely
- ✏️ Panel-level Editing — modify query, field config, JSON
- ⚔️ Conflict Resolution — BASE / YOURS / THEIRS model

---

## 🧩 Key Capabilities

### Draft Workflow

Resource → Draft → Edit → Save → Publish

### Panel Editor

- Panel list navigation
- Query editing (PromQL / SQL)
- Field config editing
- Raw JSON fallback

### Conflict Resolution

- Rebase
- Takeover
- Save as Copy

---

## 📸 UI Preview

### Draft List
![Drafts](docs/screenshots/drafts.png)

### Panel Editor
![Editor](docs/screenshots/editor.png)

### Resource Definition
![Resource](docs/screenshots/resource.png)

### Conflict / Diff
![Conflict](docs/screenshots/conflict.png)

---

## 🏗 Architecture

Browser → Grafana App Plugin → Gateway → platform-api

Docs:
- README.zh.md
- docs/architecture.md
- docs/product-overview.md

---

## ⚡ Quick Start

./scripts/deploy-control-plane.sh

http://localhost:3000  
admin / admin

---

## 🧠 Philosophy

> This is not just a Grafana plugin.  
> It is an Observability Control Plane.

---

## 📄 License

MIT
