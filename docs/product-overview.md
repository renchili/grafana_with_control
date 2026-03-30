# Grafana Control Plane 产品说明

## 1. 产品定位

Grafana Control Plane 是一个：

> 面向 Observability 的治理层（Control Plane）

它并不替代 Grafana，而是：

- 接管编辑能力
- 增强版本控制
- 提供协作与冲突处理

---

## 2. 解决的问题

### 2.1 无治理编辑

- 任意用户可直接修改 Dashboard
- 无版本控制
- 修改不可回溯

### 2.2 多人协作冲突

- 多人编辑互相覆盖
- 无冲突检测

### 2.3 无工程化流程

缺失：

- Draft（草稿）
- Review（评审）
- Publish（发布）

---

## 3. 核心能力

### 3.1 Draft 工作流

```
Resource → Draft → Edit → Publish
```

所有修改必须经过 Draft。

---

### 3.2 Panel 级编辑

相比 Grafana 原始 JSON：

- 支持 Query 单独编辑
- 支持 FieldConfig 调整
- 支持 Raw JSON 兜底

---

### 3.3 冲突解决

三版本模型：

- BASE（基线）
- YOURS（当前草稿）
- THEIRS（线上版本）

支持：

- Rebase
- Takeover
- Save as Copy

---

## 4. 工作流

```
1. 打开 Resource
2. 创建 Draft
3. 编辑 Panel
4. 保存 Draft
5. Publish
```

---

## 5. 与 Grafana 的关系

| 能力 | Grafana | Control Plane |
|------|--------|---------------|
| Dashboard 展示 | ✅ | ❌ |
| 数据查询 | ✅ | ❌ |
| Dashboard 编辑 | ❌（被限制） | ✅ |
| 版本管理 | ❌ | ✅ |
| 冲突处理 | ❌ | ✅ |

---

## 6. 当前状态

### 已完成

- Draft workflow
- Panel editor（基础版）
- Conflict API
- One-click 部署

### 未完成

- 持久化存储
- Publish 写回 Grafana
- RBAC 控制
- 审批流

---

## 7. 未来方向

### 短期

- MySQL / Postgres 持久化
- Grafana API 写回
- 禁止原生 edit

### 中期

- Query Builder UI
- Diff 高亮
- FieldConfig 表单化

### 长期

- 多租户
- 审批流（Review Flow）
- 版本历史系统

---

## 8. 一句话总结

Grafana Control Plane 将 Dashboard 从：

> 可随意修改的配置

升级为：

> 可治理、可版本化、可协作的资源系统
