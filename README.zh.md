# Grafana Control Plane（中文说明）

一个面向 Grafana 的 **受控控制平面（Control Plane）**，提供：

- Draft 编辑流程
- Panel 级别修改能力
- 版本管理与冲突解决
- 禁止直接修改线上 Dashboard

---

## 🚀 核心能力

### 🔐 受控编辑（Governance）

- 禁止直接在 Grafana 中 Edit
- 所有修改必须通过 Draft
- Dashboard 变更具备版本控制能力

---

### ✏️ Panel 编辑器（类 Grafana）

支持结构化编辑 Panel：

- Panel 列表选择
- Query（PromQL / SQL）编辑
- Field Config 编辑
- Raw JSON 编辑（兜底）

---

### 🧾 Draft 工作流

资源 → 创建 Draft → 编辑 → 保存 → 发布

---

### ⚔️ 冲突检测与解决

BASE / YOURS / THEIRS 三方对比

支持：

- Rebase
- Takeover
- Save as Copy

---

## 🏗️ 系统架构

浏览器 → Grafana Plugin → Gateway → platform-api

详见：docs/architecture.md

---

## ⚡ 一键启动

```bash
./scripts/deploy-control-plane.sh
```

---

## 🌐 访问

http://localhost:3000

admin / admin

---

## 🧠 设计理念

这不是一个普通 Grafana 插件，而是一个：

> Observability Control Plane

---

## 📄 License

MIT
