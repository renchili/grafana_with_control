# Grafana Control Plane 测试方案

本文件定义从本地到 Kubernetes 的完整验证流程，确保 Control Plane 闭环可用。

---

# 一、测试目标

验证以下能力：

1. Draft 创建与保存
2. Draft 数据持久化（MySQL）
3. Publish 写回 Grafana
4. 原生 Grafana 写入被拦截
5. 系统重启数据不丢失

---

# 二、本地测试（Docker Compose）

## 1. 启动系统

```bash
./scripts/deploy-control-plane.sh
```

访问：

```text
http://localhost:3000
```

---

## 2. 健康检查

```bash
curl http://localhost:3000/api/platform/v1/healthz
```

预期：

```json
{"status":"ok"}
```

---

## 3. Draft 测试

### 创建 draft

```bash
curl -X POST http://localhost:3000/api/platform/v1/resources/test-dashboard/drafts
```

记录返回：

```json
{"draftId": 1}
```

---

### 获取 draft

```bash
curl http://localhost:3000/api/platform/v1/drafts/1
```

---

### 修改 draft

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/1/save \
  -H "Content-Type: application/json" \
  -d '{"title":"test-dashboard-v2"}'
```

---

## 4. MySQL 持久化验证

进入容器：

```bash
docker exec -it <mysql> mysql -u platform -p
```

执行：

```sql
use grafana_control_plane;
select * from drafts;
select * from draft_payloads;
```

预期：

- draft 存在
- payload JSON 存在

---

## 5. Publish 测试

```bash
curl -X POST http://localhost:3000/api/platform/v1/drafts/1/publish
```

验证 Grafana：

```bash
curl http://localhost:3000/api/dashboards/uid/test-dashboard
```

预期：

- dashboard 存在
- title 更新
- panel 生效

---

## 6. 禁止绕过验证（关键）

```bash
curl -X POST http://localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d '{}'
```

预期：

```text
403 Forbidden
```

---

## 7. 重启验证

```bash
docker compose down
docker compose up -d
```

再次查询：

```bash
curl http://localhost:3000/api/platform/v1/drafts/1
```

预期：

- 数据仍然存在（MySQL 持久化成功）

---

# 三、Kubernetes 测试（Helm）

## 1. 安装

```bash
helm install gcp ./helm/grafana-control-plane
```

---

## 2. 访问

```bash
kubectl port-forward svc/gcp-grafana-control-plane-gateway 3000:80
```

---

## 3. 重复本地测试步骤

验证：

- Draft
- Save
- Publish
- MySQL
- Gateway 拦截

---

# 四、回归测试清单

| 测试项 | 预期 |
|------|------|
| Draft 创建 | 成功 |
| Draft 保存 | 成功 |
| Draft 持久化 | MySQL 有数据 |
| Publish | Grafana dashboard 更新 |
| API 直写 | 被 403 拦截 |
| 重启后数据 | 不丢失 |

---

# 五、故障排查

## publish 失败

检查：

```bash
docker logs platform-api
```

确认：

- GRAFANA_URL
- 用户名密码/token

---

## MySQL 无数据

检查：

- DATABASE_DSN
- mysql init sql 是否执行

---

## plugin 不显示

检查：

- provisioning
- plugin 路径挂载

---

# 六、结论

通过以上测试：

✅ Control Plane 功能闭环验证完成
