# Grafana Control Plane 启动与部署说明

## 1. 本地一键启动（Docker Compose）

仓库已经提供一键启动脚本：

```bash
./scripts/deploy-control-plane.sh
```

脚本会自动完成以下工作：

1. 构建前端插件 `grafana-control-plane-plugin-full`
2. 构建后端镜像 `platform-api`
3. 启动完整栈：
   - gateway
   - grafana
   - platform-api
   - mysql
4. 自动写入 `.env` 供 compose 使用

## 2. 默认访问地址

```text
http://localhost:3000
```

默认账号：

```text
admin / admin
```

## 3. 本地部署环境变量

可覆盖以下变量：

- `GRAFANA_PORT`
- `GRAFANA_ADMIN_USER`
- `GRAFANA_ADMIN_PASSWORD`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `IMAGE_NAME`
- `IMAGE_TAG`

示例：

```bash
GRAFANA_PORT=3300 MYSQL_PASSWORD=secret ./scripts/deploy-control-plane.sh
```

## 4. 健康检查

启动后验证：

```bash
curl http://127.0.0.1:3000/api/platform/v1/healthz
```

## 5. 数据库验证

进入 MySQL：

```bash
docker exec -it <mysql-container> mysql -u platform -p
```

查看表：

```sql
use grafana_control_plane;
show tables;
select * from drafts;
select * from draft_payloads;
select * from conflicts;
```

## 6. Publish 写回 Grafana

当前 compose 已为 `platform-api` 注入：

- `GRAFANA_URL=http://grafana:3000`
- `GRAFANA_BASIC_USER=admin`
- `GRAFANA_BASIC_PASSWORD=admin`

因此在 Control Plane 中执行 publish 时，会调用 Grafana API：

```text
POST /api/dashboards/db
```

## 7. 原生写入限制

为了防止绕过 Draft 流程，gateway 已拦截：

```text
POST /api/dashboards/db
```

即：

- 用户不能直接写 Grafana dashboard
- 只能通过 control plane publish

## 8. Kubernetes 部署

仓库提供 Helm Chart：

```bash
helm install grafana-control-plane ./helm/grafana-control-plane
```

更多配置见：

```text
helm/grafana-control-plane/values.yaml
```
