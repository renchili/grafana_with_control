# Grafana Control Plane 接口测试文档

本文档用于手工验证后端接口、数据库持久化、Grafana publish 写回，以及 gateway 对原生写接口的限制。目标是覆盖当前 Control Plane 的全部核心功能点。

---

## 1. 测试前置条件

先启动完整环境：

```bash
./scripts/deploy-control-plane.sh
```

验证健康检查：

```bash
curl http://localhost:3000/api/platform/v1/healthz
```

预期：

```json
{"status":"ok"}
```

---

## 2. 基础环境验证

### 2.1 查看 draft 列表

```bash
curl http://localhost:3000/api/platform/v1/me/drafts
```

预期：

- 返回 draft 数组
- 至少包含初始化数据 `cpu-overview` / `request-latency`

### 2.2 查看数据库表

```bash
docker exec -it $(docker ps --format '{{.Names}}' | grep mysql | head -n1) mysql -u platform -pplatform -e "use grafana_control_plane; show tables;"
```

预期：

- `drafts`
- `draft_payloads`
- `conflicts`

---

## 3. Draft 生命周期测试

### 3.1 创建 draft

```bash
curl -X POST http://localhost:3000/api/platform/v1/resources/test-dashboard/drafts
```

预期：

- 返回 `draftId`
- `drafts` 表新增一条 `resource_uid=test-dashboard`

数据库验证：

```bash
docker exec -it $(docker ps --format '{{.Names}}' | grep mysql | head -n1) mysql -u platform -pplatform -e "use grafana_control_plane; select id, resource_uid, title, status from drafts where resource_uid='test-dashboard';"
```

### 3.2 获取 draft 详情

```bash
curl http://localhost:3000/api/platform/v1/drafts/<draftId>
```

预期：

- 能看到 `title`
- 能看到 `panels`
- `rawDraft` 不为空

### 3.3 保存 draft

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/<draftId>/save \
  -H "Content-Type: application/json" \
  -d '{
    "title":"test-dashboard-v2",
    "resourceUid":"test-dashboard",
    "governanceMode":"platform",
    "panels":[
      {
        "id":1,
        "title":"test-dashboard-v2 / latency",
        "type":"timeseries",
        "datasource":"prometheus",
        "queries":[{"refId":"A","datasource":"prometheus","expression":"up"}],
        "transformations":[],
        "fieldConfig":{"defaults":{"unit":"short"}},
        "options":{},
        "rawModel":{"id":1,"title":"test-dashboard-v2 / latency","type":"timeseries","targets":[{"refId":"A","expr":"up"}]}
      }
    ]
  }'
```

预期：

- 返回更新后的 draft 详情
- title 已变成 `test-dashboard-v2`
- query 已变成 `up`

数据库验证：

```bash
docker exec -it $(docker ps --format '{{.Names}}' | grep mysql | head -n1) mysql -u platform -pplatform -e "use grafana_control_plane; select payload_json from draft_payloads where draft_id=<draftId>\G"
```

预期：

- `payload_json` 中包含 `title=test-dashboard-v2`
- `payload_json` 中包含 query `up`

### 3.4 保存后重新读取

```bash
curl http://localhost:3000/api/platform/v1/drafts/<draftId>
```

预期：

- 仍然返回刚刚保存的数据
- 重启前读取一致

---

## 4. Publish 测试

### 4.1 发布 draft

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/<draftId>/publish
```

预期：

- 返回 `success=true`
- 返回 `message=draft published`

### 4.2 验证 Grafana dashboard 是否已生成/更新

```bash
curl -u admin:admin http://localhost:3000/api/dashboards/uid/test-dashboard
```

预期：

- 返回 dashboard JSON
- `dashboard.uid = test-dashboard`
- `dashboard.title = test-dashboard-v2`
- `dashboard.panels` 中包含刚才保存的 panel/query

### 4.3 验证 DB 状态

```bash
docker exec -it $(docker ps --format '{{.Names}}' | grep mysql | head -n1) mysql -u platform -pplatform -e "use grafana_control_plane; select id, resource_uid, status from drafts where id=<draftId>;"
```

预期：

- status = `published`

---

## 5. Conflict 功能测试

### 5.1 获取 conflict 数据

```bash
curl http://localhost:3000/api/platform/v1/drafts/102/conflict
```

预期：

- `hasConflict = true`
- `base / yours / theirs` 都有值
- `conflictPaths` 不为空

### 5.2 Rebase

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/102/rebase
```

预期：

- 返回 success
- conflict 记录被删除或不再可用

### 5.3 Save as copy

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/101/save-as-copy \
  -H "Content-Type: application/json" \
  -d '{"uid":"cpu-overview-copy","title":"CPU Overview Copy"}'
```

预期：

- 返回 `newResourceUid = cpu-overview-copy`

### 5.4 Takeover

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/102/takeover
```

预期：

- 返回 success
- draft 状态恢复 active 或冲突清除

---

## 6. Draft 放弃测试

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/<draftId>/abandon
```

预期：

- 返回 success
- drafts 表中状态变成 `abandoned`

---

## 7. Gateway 原生写入拦截测试

### 7.1 直接写 Grafana dashboard

```bash
curl -i -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d '{}'
```

预期：

- HTTP `403 Forbidden`

### 7.2 直接读 Grafana dashboard

```bash
curl -i -u admin:admin http://localhost:3000/api/dashboards/uid/test-dashboard
```

预期：

- GET 可正常返回

---

## 8. 持久化测试

### 8.1 重启完整栈

```bash
cd deploy
docker compose down
docker compose up -d
```

### 8.2 再次读取 draft

```bash
curl http://localhost:3000/api/platform/v1/drafts/<draftId>
```

预期：

- 保存过的 title / panels 仍然存在
- 说明 MySQL 持久化正常

---

## 9. Helm 环境接口测试

安装：

```bash
helm install gcp ./helm/grafana-control-plane
kubectl port-forward svc/gcp-grafana-control-plane-gateway 3000:80
```

然后重复执行本文件中的：

- 健康检查
- draft 创建/保存
- publish
- gateway 拦截
- mysql 持久化验证

---

## 10. 功能点覆盖清单

| 功能点 | 覆盖接口 |
|---|---|
| 健康检查 | `/healthz` |
| Draft 列表 | `/me/drafts` |
| 创建 Draft | `/resources/:uid/drafts` |
| 获取 Draft | `/drafts/:id` |
| 保存 Draft | `/drafts/:id/save` |
| Publish | `/drafts/:id/publish` |
| Abandon | `/drafts/:id/abandon` |
| Conflict 查看 | `/drafts/:id/conflict` |
| Rebase | `/drafts/:id/rebase` |
| Save as Copy | `/drafts/:id/save-as-copy` |
| Takeover | `/drafts/:id/takeover` |
| 原生写入拦截 | `/api/dashboards/db` |
| 持久化 | MySQL 表验证 |
| 写回 Grafana | `/api/dashboards/uid/:uid` |
