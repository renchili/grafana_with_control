# Grafana Control Plane UI 测试文档

本文档用于手工验证前端页面、交互流程、状态流转和页面级功能点，覆盖 Draft、Readonly Definition、Panel Editor、Conflict、Publish 和部署后的访问链路。

---

## 1. 测试前置条件

先启动系统：

```bash
./scripts/deploy-control-plane.sh
```

打开：

```text
http://localhost:3000
```

默认账号：

```text
admin / admin
```

---

## 2. 登录与入口测试

### 2.1 Grafana 可访问

验证：

- 登录页正常
- 使用 `admin/admin` 能登录

### 2.2 插件入口存在

验证左侧导航中存在：

- Grafana Control Plane

预期：

- 能进入插件主界面
- 不报 404 / 白屏

---

## 3. Drafts 页面测试

进入：

```text
/a/rody-grafanacontrol-app/drafts
```

验证：

- 表格正常渲染
- 至少显示初始化 draft
- 列包括：
  - Title
  - Owner
  - Base Version
  - Status
  - Updated
  - Actions

### 3.1 Resume

点击 `Resume`

预期：

- 跳转到：
  - `/a/rody-grafanacontrol-app/draft/:draftId`
- 不跳原生 `/d/:uid`

### 3.2 View definition

点击 `View definition`

预期：

- 跳转到：
  - `/a/rody-grafanacontrol-app/resource/:uid`

### 3.3 Publish

点击 `Publish`

预期：

- 状态更新
- 不报错

### 3.4 Abandon

点击 `Abandon`

预期：

- draft 状态改为 abandoned

---

## 4. Resource Readonly 页面测试

进入：

```text
/a/rody-grafanacontrol-app/resource/<uid>
```

验证：

- Header 显示 resource title
- 左侧 panel list 正常
- 右侧 definition 详情正常

### 4.1 Panel 切换

点击不同 panel

预期：

- 右侧内容切换
- query / field config / raw JSON 同步变化

### 4.2 Create draft

点击 `Create draft`

预期：

- 创建成功
- 跳转 draft editor 页

### 4.3 Open existing draft

若已有 draft，点击 `Open existing draft`

预期：

- 正常跳转 draft editor

---

## 5. Draft Editor 页面测试

进入：

```text
/a/rody-grafanacontrol-app/draft/:draftId
```

验证页面区域：

- draft metadata
- 左侧 panel 列表
- 中间 panel 编辑器
- Draft vs Saved comparison
- Current raw draft payload

### 5.1 Panel 切换

点击左侧不同 panel

预期：

- editor 内容变化
- 当前 panel 高亮

### 5.2 Title 编辑

修改 title

预期：

- comparison 区域高亮该字段
- `Use saved` 可恢复原值

### 5.3 Query 编辑

修改 primary query

预期：

- comparison 区域显示 saved vs draft edits 差异

### 5.4 Field config 编辑

修改 field config JSON

预期：

- 合法 JSON 可保存
- 非法 JSON 会出现错误提示

### 5.5 Raw panel JSON 编辑

修改 raw JSON

预期：

- 合法 JSON 可保存
- 非法 JSON 有报错

### 5.6 Save panel draft

点击 `Save panel draft`

预期：

- draft 成功保存
- 刷新页面后仍保留修改

### 5.7 Reset all

在有未保存变更时点击 `Reset all`

预期：

- 所有字段回到 saved 状态

### 5.8 Use saved

针对某一字段点击 `Use saved`

预期：

- 仅该字段恢复
- 其他字段不受影响

### 5.9 Publish

点击页面顶部 `Publish`

预期：

- publish 成功
- Grafana dashboard 更新

### 5.10 Abandon

点击页面顶部 `Abandon`

预期：

- 状态变 abandoned

---

## 6. Conflict 页面测试

进入：

```text
/a/rody-grafanacontrol-app/conflict?draftId=102
```

验证：

- ConflictMetaBar 显示 draft/version 信息
- Field-level diff summary 表格显示 base/yours/theirs
- 三列 JSON diff 正常显示
- conflict paths 正常显示

### 6.1 Rebase

点击 `Rebase`

预期：

- 成功返回
- conflict 状态清除或更新

### 6.2 Save as Copy

点击 `Save as Copy`

预期：

- 返回成功
- 新资源 UID 生效

### 6.3 Takeover

点击 `Takeover`

预期：

- 返回成功
- conflict 状态解除

---

## 7. Publish 结果验证（前端角度）

在 draft editor 中保存并 publish 后：

验证：

- 打开原生 Grafana dashboard 页面
- title 已更新
- panel 内容已更新

注意：

- dashboard `editable=false`
- 用户不能直接继续原生编辑保存

---

## 8. 原生编辑限制测试

在 Grafana 中尝试：

- 进入原生 dashboard
- 尝试直接 save / edit dashboard

预期：

- 不能通过原生路径完成写入
- 直接写接口被 gateway 拦截

---

## 9. 页面刷新与重启测试

### 9.1 刷新页面

在 draft editor 修改并保存后刷新浏览器

预期：

- 仍显示刚才保存的数据

### 9.2 服务重启

重启 compose 或 helm release 后重新进入 UI

预期：

- Draft 列表仍存在
- Draft editor 仍能读到历史保存内容

---

## 10. Helm UI 测试

部署：

```bash
helm install gcp ./helm/grafana-control-plane
kubectl port-forward svc/gcp-grafana-control-plane-gateway 3000:80
```

重复本文件中的 UI 测试步骤，验证：

- 入口
- Drafts 页面
- Resource readonly
- Draft editor
- Conflict 页面
- Publish
- 原生写入限制

---

## 11. 功能点覆盖清单

| 功能点 | 页面/入口 |
|---|---|
| 登录 | Grafana 登录页 |
| 插件入口 | 左侧导航 |
| Draft 列表 | DraftsPage |
| Resume | DraftTable |
| View definition | DraftTable |
| Resource 只读 | ResourceReadonlyPage |
| Create draft | ResourceReadonlyPage |
| Open existing draft | ResourceReadonlyPage |
| Panel 切换 | DraftPanelEditor / ResourceReadonlyPage |
| Title / Query / FieldConfig / Raw JSON 编辑 | DraftPanelEditor |
| Draft vs Saved 对比 | DraftPanelEditor |
| Reset all / Use saved | DraftPanelEditor |
| Save draft | DraftEditorPage / DraftPanelEditor |
| Publish | DraftEditorPage / DraftTable |
| Abandon | DraftEditorPage / DraftTable |
| Conflict diff | ConflictPage |
| Rebase / Save as Copy / Takeover | ConflictPage |
| Publish 结果可见 | 原生 Grafana dashboard |
| 原生写入限制 | 原生 Grafana + gateway |
| 重启后可恢复 | 全链路 |
