# Grafana with control

> 目标：在**不替代原生 Grafana** 的前提下，构建一个嵌入 Grafana 的治理控制平面。  
> 核心问题：**草稿保留、并发冲突、受控发布、配置治理、审计回滚、资源归属**。  
> 定位：**Grafana = Data Plane；Platform = Control Plane**

---

# 1. 设计原则

## 1.1 用户体验原则

1. 用户平时仍然在原生 Grafana 中浏览 dashboard、Explore、Alerting。
2. Platform 不重新造一个“新前端”，而是做成 **Grafana App Plugin**。
3. 受治理资源的正式写入不走原生 Save 直写，而走 **Platform API**。
4. 冲突发生时，绝不要求用户“刷新页面解决”，而是保留草稿并进入冲突处理页。
5. 前端视觉与代码风格尽量贴 Grafana：组件、间距、颜色、导航、页面层级都遵循 Grafana 生态。

## 1.2 技术实现原则

1. **前端使用 Grafana App Plugin 形态**，因为官方插件工具支持 app plugin 在 Grafana 中创建自定义页面，并显示在导航菜单中。
2. **前端尽量使用 Grafana React 组件库与设计系统**，插件 UI 优先用 `@grafana/ui`、`@grafana/runtime`、`@grafana/data`。
3. **插件可选 backend component**，如果要在 Grafana 服务器内做资源代理、鉴权或缓存，可用 backend plugin 机制。
4. **导航位置可以通过 Grafana 配置调整**，可把整个 app 或某些页面移动到 dashboards / explore / alerting 等导航区。

---

# 2. 总体架构

```text
User
  ↓
Grafana UI（原生）
  ├─ Dashboard / Explore / Alerting（原生）
  └─ Platform App Plugin（治理入口）
           ↓
       Platform API（Go）
           ↓
         MySQL
           ↓
Grafana HTTP API / Provisioning / Git
```

---

# 3. 前端总体设计（详细版）

## 3.1 为什么选 App Plugin

采用 **Grafana App Plugin**，不做独立 React 站点。

原因：
- 用户不用离开 Grafana
- 原生导航、主题、面包屑、组织上下文都能复用
- 权限、身份、主题切换成本更低
- 后续扩展 UI extension / 场景页更自然

## 3.2 前端技术栈建议

### 必选
- TypeScript
- React
- Grafana App Plugin
- `@grafana/ui`
- `@grafana/runtime`
- `@grafana/data`

### 建议
- React Router（由 plugin page 承载）
- 页面级 `useReducer`
- 表格/列表页使用统一 query hook
- Diff 页面用自定义 JSON diff viewer
- 表单页保持受控组件

## 3.3 插件工程结构

```text
grafana-control-plane-app/
  src/
    module.ts
    plugin.json
    pages/
      DraftsPage/
        index.tsx
        DraftsPage.tsx
        DraftsPage.hooks.ts
        DraftCard.tsx
        DraftFilterBar.tsx
      PublishCenterPage/
        index.tsx
        PublishCenterPage.tsx
        PublishTable.tsx
        PublishSummaryCards.tsx
      ConflictResolvePage/
        index.tsx
        ConflictResolvePage.tsx
        ConflictPane.tsx
        ConflictActionBar.tsx
      GovernancePage/
        index.tsx
        GovernancePage.tsx
        GovernanceTable.tsx
        GovernanceFilters.tsx
        PolicyEditorDrawer.tsx
      DatasourceChangesPage/
        index.tsx
        DatasourceChangesPage.tsx
        DatasourceForm.tsx
        YamlPreview.tsx
    components/
      layout/
        PlatformPageLayout.tsx
        PlatformBreadcrumb.tsx
        PlatformHeaderActions.tsx
      common/
        StatusPill.tsx
        EmptyState.tsx
        ErrorState.tsx
        LoadingOverlay.tsx
        ConfirmModal.tsx
        JsonCodeBlock.tsx
        DiffViewer.tsx
        OwnerBadge.tsx
    hooks/
      usePlatformApi.ts
      useDraftAutosave.ts
      usePermissionGuard.ts
      useToast.ts
    services/
      api.ts
      drafts.ts
      publish.ts
      conflict.ts
      governance.ts
      datasource.ts
    models/
      drafts.ts
      publish.ts
      conflict.ts
      governance.ts
      datasource.ts
      resource.ts
    utils/
      routes.ts
      format.ts
      diff.ts
      permissions.ts
      forms.ts
```

## 3.4 plugin.json 设计建议

```json
{
  "type": "app",
  "id": "company-grafana-control-plane-app",
  "name": "Grafana Control Plane",
  "includes": [
    {
      "type": "page",
      "name": "Drafts",
      "path": "/a/company-grafana-control-plane-app/drafts",
      "addToNav": true,
      "defaultNav": true
    },
    {
      "type": "page",
      "name": "Publish Center",
      "path": "/a/company-grafana-control-plane-app/publish-center",
      "addToNav": true
    },
    {
      "type": "page",
      "name": "Conflict Resolve",
      "path": "/a/company-grafana-control-plane-app/conflict-resolve",
      "addToNav": true
    },
    {
      "type": "page",
      "name": "Governance",
      "path": "/a/company-grafana-control-plane-app/governance",
      "addToNav": true
    },
    {
      "type": "page",
      "name": "Datasource Changes",
      "path": "/a/company-grafana-control-plane-app/datasource-changes",
      "addToNav": true
    }
  ]
}
```

## 3.5 路由规范

```ts
export const routes = {
  drafts: '/a/company-grafana-control-plane-app/drafts',
  publishCenter: '/a/company-grafana-control-plane-app/publish-center',
  conflictResolve: '/a/company-grafana-control-plane-app/conflict-resolve',
  governance: '/a/company-grafana-control-plane-app/governance',
  datasourceChanges: '/a/company-grafana-control-plane-app/datasource-changes',
  draftDetail: (draftId: number) => `/a/company-grafana-control-plane-app/drafts/${draftId}`,
  conflictDetail: (draftId: number) => `/a/company-grafana-control-plane-app/conflict-resolve/${draftId}`,
};
```

## 3.6 页面壳层设计

统一使用 `PlatformPageLayout`：

- 页面标题
- 描述
- 面包屑
- 刷新按钮
- 搜索框
- 右上角操作

左侧导航应保留 Grafana 原生结构，并新增 Platform 分组：

```text
Dashboards
Explore
Alerting
Connections
Administration
────────────
Platform
  Drafts
  Publish Center
  Conflict Resolve
  Governance
  Datasource Changes
```

## 3.7 状态管理策略

不建议一开始上 Redux。

建议：
- 页面级状态：`useReducer`
- 局部交互：`useState`
- 远程数据：service + hook
- autosave：独立 hook

### DraftsPageState
```ts
interface DraftsPageState {
  loading: boolean;
  error?: string;
  query: string;
  ownerFilter: 'mine' | 'team' | 'all';
  typeFilter: 'dashboard' | 'folder' | 'all';
  items: DraftItem[];
}
```

### PublishCenterState
```ts
interface PublishCenterState {
  loading: boolean;
  error?: string;
  jobs: PublishJob[];
  summary: {
    success24h: number;
    conflict24h: number;
    failed24h: number;
    pending: number;
  };
}
```

### ConflictResolveState
```ts
interface ConflictResolveState {
  loading: boolean;
  error?: string;
  payload?: ConflictPayload;
  resolving: boolean;
  selectedStrategy?: 'rebase' | 'copy' | 'takeover';
}
```

## 3.8 API 层设计（前端）

`services/api.ts`

```ts
import { getBackendSrv } from '@grafana/runtime';

export const api = {
  get: <T>(url: string) => getBackendSrv().get<T>(url),
  post: <T>(url: string, body?: unknown) => getBackendSrv().post<T>(url, body),
  put: <T>(url: string, body?: unknown) => getBackendSrv().put<T>(url, body),
  delete: <T>(url: string) => getBackendSrv().delete<T>(url),
};
```

领域 service：

- drafts.ts
- publish.ts
- conflict.ts
- governance.ts
- datasource.ts

## 3.9 权限与可见性

前端只做可见性控制，不做最终授权。

```ts
interface PermissionSet {
  canCreateDraft: boolean;
  canPublish: boolean;
  canTakeOver: boolean;
  canRollback: boolean;
  canEditPolicy: boolean;
}
```

## 3.10 错误态、加载态、空态

统一组件：

- `LoadingOverlay`
- `ErrorState`
- `EmptyState`
- `ConfirmModal`

---

# 4. Drafts 模块
![Drafts Mock](grafana_platform_drafts_mock.png)

## 4.1 模块目标

- 未发布编辑内容不能丢
- 页面刷新不能清空用户成果
- 节点切换不能让草稿消失
- 用户需要明确看到当前有哪些未发布变更

## 4.2 页面组件树

```text
DraftsPage
 ├─ PlatformPageLayout
 ├─ DraftFilterBar
 ├─ DraftList
 │   ├─ DraftCard
 │   ├─ DraftCard
 │   └─ DraftCard
 └─ ConfirmModal
```

## 4.3 DraftCard 字段

- title
- owner
- base version
- updatedAt
- governance mode
- status pill

按钮：
- Resume
- Publish
- Resolve
- Save as Copy
- Abandon

## 4.4 Drafts 前端状态模型

```ts
type DraftStatus = 'active' | 'conflict' | 'needs_review' | 'published' | 'abandoned';

interface DraftItem {
  draftId: number;
  resourceType: 'dashboard' | 'folder' | 'alert_rule' | 'datasource';
  resourceUid: string;
  title: string;
  ownerName: string;
  baseVersionNo: number;
  governanceMode: 'native' | 'platform' | 'provisioned' | 'git';
  status: DraftStatus;
  updatedAt: string;
}
```

## 4.5 Autosave Hook 设计

`useDraftAutosave(draftId, getCurrentDraftPayload)`

行为：
- 内容变化后 debounce 5 秒
- 后台保存
- 成功显示 saved time
- 失败 toast 告警，但本地镜像不丢

## 4.6 Drafts 后端职责

Draft Service 负责：

- 创建 draft
- 恢复 draft
- 自动保存
- 查询用户 draft 列表
- 标记状态

## 4.7 Drafts API

```http
POST /api/platform/v1/resources/{type}/{uid}/drafts
PUT  /api/platform/v1/drafts/{draftId}
GET  /api/platform/v1/me/drafts
POST /api/platform/v1/drafts/{draftId}/abandon
```

---

# 5. Publish Center 模块

![Publish Center Mock](grafana_platform_publish_center_mock.png)

## 5.1 模块目标

把“保存 dashboard”升级成“受控发布流程”。

## 5.2 页面组件树

```text
PublishCenterPage
 ├─ PlatformPageLayout
 ├─ PublishSummaryCards
 ├─ PublishFilterBar
 ├─ PublishTable
 │   └─ PublishTableRow
 ├─ RollbackModal
 └─ DiffDrawer
```

## 5.3 顶部汇总卡

- Success 24h
- Conflict 24h
- Failed 24h
- Pending

## 5.4 PublishJob 模型

```ts
type PublishStatus = 'pending' | 'running' | 'success' | 'failed' | 'conflict';

interface PublishJob {
  jobId: number;
  resourceUid: string;
  resourceType: string;
  submitter: string;
  status: PublishStatus;
  expectedVersionNo: number;
  currentVersionNo?: number;
  createdAt: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
}
```

## 5.5 Publish Center 页面行为

- 对 pending/running job 轮询
- View Diff 打开 drawer
- Rollback 弹框确认
- Retry 重新触发 publish

## 5.6 Publish 后端职责

Publish Service 负责：

- 创建 publish_job
- worker 串行化发布
- 调 Grafana API
- 写 version / audit
- rollback

## 5.7 Publish API

```http
POST /api/platform/v1/drafts/{draftId}/publish
GET  /api/platform/v1/publish-jobs/{jobId}
GET  /api/platform/v1/resources/{type}/{uid}/publishes
POST /api/platform/v1/resources/{type}/{uid}/rollback
```

---

# 6. Conflict Resolve 模块

![Conflict Resolve Mock](grafana_platform_conflict_mock.png)

## 6.1 模块目标

解决版本冲突时的核心问题：
- 不能刷新页面
- 不能丢草稿
- 要有可操作的合并路径

## 6.2 页面组件树

```text
ConflictResolvePage
 ├─ PlatformPageLayout
 ├─ ConflictMetaBar
 ├─ ConflictColumns
 │   ├─ ConflictPane(Base)
 │   ├─ ConflictPane(Yours)
 │   └─ ConflictPane(Theirs)
 ├─ ConflictPathList
 ├─ ConflictActionBar
 └─ ConfirmModal
```

## 6.3 ConflictPayload

```ts
interface ConflictPayload {
  baseVersionNo: number;
  currentVersionNo: number;
  hasConflict: boolean;
  conflictPaths: string[];
  base: object;
  yours: object;
  theirs: object;
}
```

## 6.4 Conflict 动作

- Rebase Draft
- Save as Copy
- Take Over

## 6.5 Conflict 后端职责

Conflict Service 负责：

- 检测版本冲突
- 读取三方内容
- 生成 conflict paths
- 提供 rebase / copy / takeover

## 6.6 Conflict API

```http
GET  /api/platform/v1/drafts/{draftId}/conflict
POST /api/platform/v1/drafts/{draftId}/rebase
POST /api/platform/v1/drafts/{draftId}/save-as-copy
POST /api/platform/v1/drafts/{draftId}/takeover
```

---

# 7. Governance 模块

![Governance Mock](grafana_platform_governance_mock.png)

## 7.1 模块目标

管理资源 owner、治理模式、可编辑性与 reviewer。

## 7.2 页面组件树

```text
GovernancePage
 ├─ PlatformPageLayout
 ├─ GovernanceFilters
 ├─ GovernanceTable
 │   └─ GovernanceRow
 ├─ PolicyEditorDrawer
 ├─ OwnerEditorModal
 └─ AuditDrawer
```

## 7.3 Mode 定义

- native
- platform
- provisioned
- git

## 7.4 Governance 后端职责

Governance Service 负责：

- 资源注册
- owner/reviewer 管理
- governance mode 管理
- editable 策略控制

## 7.5 Governance API

```http
GET /api/platform/v1/resources
PUT /api/platform/v1/resources/{type}/{uid}/owner
PUT /api/platform/v1/resources/{type}/{uid}/reviewer
PUT /api/platform/v1/resources/{type}/{uid}/policy
GET /api/platform/v1/resources/{type}/{uid}/audit
```

---

# 8. Datasource Changes 模块

![Datasource Changes Mock](grafana_platform_datasource_changes_mock.png)

## 8.1 模块目标

Datasource 是高风险配置，不允许普通用户随意在 Grafana UI 中直接修改。

## 8.2 页面组件树

```text
DatasourceChangesPage
 ├─ PlatformPageLayout
 ├─ DatasourceForm
 ├─ ValidationBanner
 ├─ YamlPreview
 ├─ ChangeSummary
 ├─ ActionBar
 └─ ConfirmModal
```

## 8.3 表单字段建议

- Name
- Type
- URL
- Access
- Org
- Version
- Owner Team
- Editable
- jsonData
- secureJsonData

## 8.4 Datasource 后端职责

Datasource Service 负责：

- 校验配置
- 渲染 YAML
- 发布 provisioning
- 写 version / audit

## 8.5 Datasource API

```http
POST /api/platform/v1/datasources
POST /api/platform/v1/datasources/{uid}/validate
POST /api/platform/v1/datasources/{uid}/render
POST /api/platform/v1/datasources/{uid}/publish
```

---

# 9. 后端完整设计

## 9.1 控制面服务

### Draft Service
- 创建 draft
- 恢复 draft
- autosave
- 查询草稿列表
- 标记 abandoned / conflict

### Publish Service
- 创建 publish_job
- worker 串行化发布
- 写 resource_version
- 回滚
- 写 audit_log

### Conflict Service
- 生成 base / yours / theirs
- 计算 conflict paths
- rebase
- save-as-copy
- takeover

### Governance Service
- 维护 resource_registry
- owner / reviewer 绑定
- mode / editable 管理
- policy enforcement

### Datasource Service
- 校验 datasource 变更
- 渲染 YAML
- 发布 provisioning
- 写版本和审计

## 9.2 Go 服务目录建议

```text
platform-api/
  cmd/
    server/
    worker/
  internal/
    handler/
      drafts.go
      publish.go
      conflict.go
      governance.go
      datasource.go
    service/
      draft_service.go
      publish_service.go
      conflict_service.go
      governance_service.go
      datasource_service.go
    repo/
      resource_repo.go
      draft_repo.go
      version_repo.go
      publish_job_repo.go
      audit_repo.go
      owner_repo.go
    grafana/
      dashboard_client.go
      folder_client.go
      datasource_client.go
      alert_client.go
    model/
    middleware/
```

---

# 10. MySQL 设计

## 10.1 表关系总览

```text
resource_registry
  ├── resource_version
  ├── draft
  ├── publish_job
  ├── audit_log
  ├── owner_binding
  └── edit_lock
```

## 10.2 resource_registry

```sql
CREATE TABLE resource_registry (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_type VARCHAR(32) NOT NULL,
  resource_uid VARCHAR(64) NOT NULL,
  grafana_org_id BIGINT NOT NULL DEFAULT 1,
  folder_uid VARCHAR(64) DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  owner_type VARCHAR(16) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  lifecycle_state VARCHAR(16) NOT NULL,
  current_version_no BIGINT NOT NULL DEFAULT 0,
  governance_mode VARCHAR(16) NOT NULL,
  allow_native_edit TINYINT(1) NOT NULL DEFAULT 0,
  require_review TINYINT(1) NOT NULL DEFAULT 0,
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_type_uid (resource_type, resource_uid),
  KEY idx_owner (owner_type, owner_id),
  KEY idx_mode (governance_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 10.3 resource_version

```sql
CREATE TABLE resource_version (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_id BIGINT NOT NULL,
  version_no BIGINT NOT NULL,
  grafana_version_ref BIGINT DEFAULT NULL,
  base_version_no BIGINT DEFAULT NULL,
  source_type VARCHAR(16) NOT NULL,
  content_json JSON NOT NULL,
  content_hash CHAR(64) NOT NULL,
  change_summary VARCHAR(512) DEFAULT NULL,
  published_by VARCHAR(64) NOT NULL,
  published_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_resource_version (resource_id, version_no),
  KEY idx_resource_time (resource_id, published_at),
  CONSTRAINT fk_rv_resource FOREIGN KEY (resource_id) REFERENCES resource_registry(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 10.4 draft

```sql
CREATE TABLE draft (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_id BIGINT NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  base_version_no BIGINT NOT NULL,
  draft_json JSON NOT NULL,
  draft_hash CHAR(64) NOT NULL,
  autosave_seq BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_resource_user (resource_id, user_id),
  KEY idx_status (status),
  KEY idx_updated_at (updated_at),
  CONSTRAINT fk_draft_resource FOREIGN KEY (resource_id) REFERENCES resource_registry(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 10.5 publish_job

```sql
CREATE TABLE publish_job (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_id BIGINT NOT NULL,
  draft_id BIGINT DEFAULT NULL,
  submitter_id VARCHAR(64) NOT NULL,
  expected_version_no BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  error_code VARCHAR(64) DEFAULT NULL,
  error_message VARCHAR(1024) DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  started_at DATETIME(3) DEFAULT NULL,
  finished_at DATETIME(3) DEFAULT NULL,
  KEY idx_resource_status (resource_id, status, created_at),
  CONSTRAINT fk_pj_resource FOREIGN KEY (resource_id) REFERENCES resource_registry(id),
  CONSTRAINT fk_pj_draft FOREIGN KEY (draft_id) REFERENCES draft(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 10.6 audit_log

```sql
CREATE TABLE audit_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_id BIGINT NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  from_version_no BIGINT DEFAULT NULL,
  to_version_no BIGINT DEFAULT NULL,
  result VARCHAR(16) NOT NULL,
  metadata_json JSON DEFAULT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_resource_time (resource_id, created_at),
  KEY idx_actor_time (actor_id, created_at),
  CONSTRAINT fk_audit_resource FOREIGN KEY (resource_id) REFERENCES resource_registry(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 10.7 owner_binding

```sql
CREATE TABLE owner_binding (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  resource_id BIGINT NOT NULL,
  owner_type VARCHAR(16) NOT NULL,
  owner_id VARCHAR(64) NOT NULL,
  role_name VARCHAR(32) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_owner_role (owner_type, owner_id, role_name),
  CONSTRAINT fk_owner_resource FOREIGN KEY (resource_id) REFERENCES resource_registry(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 10.8 edit_lock

```sql
CREATE TABLE edit_lock (
  resource_id BIGINT PRIMARY KEY,
  lock_owner VARCHAR(64) NOT NULL,
  lock_token CHAR(36) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_lock_resource FOREIGN KEY (resource_id) REFERENCES resource_registry(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

# 11. 关键流程总结

## 11.1 Draft 流程

```text
打开受治理资源
→ 平台读取 Grafana 当前 JSON
→ 创建 draft，记录 base_version_no
→ 用户编辑
→ 前端 autosave
→ draft 表保存
```

## 11.2 Publish 流程

```text
点击 Publish
→ 创建 publish_job
→ worker 拉任务
→ SELECT ... FOR UPDATE 锁住 resource_registry
→ 校验 expected_version_no == current_version_no
→ 调 Grafana API
→ 写 resource_version
→ 写 audit_log
→ 更新 current_version_no
→ publish_job success
```

## 11.3 Conflict 流程

```text
发布时发现 base_version_no != current_version_no
→ 读取 base / yours / theirs
→ 生成 conflict paths
→ 前端展示 Conflict Resolve
→ 用户选择 rebase / copy / takeover
→ 保留原 draft
```

## 11.4 Datasource 流程

```text
填写表单
→ validate
→ render yaml
→ publish provisioning
→ 生成 publish_job / version / audit
```

---

# 12. 开发阶段建议

## Phase 1
- Drafts
- Publish Center
- MySQL 核心表
- Dashboard 发布链路

## Phase 2
- Conflict Resolve
- Governance
- 回滚与审计

## Phase 3
- Datasource Changes
- Alerting pipeline
- GitOps / Provisioning 联动

---

# 13. 最终结论

这套方案不是“给 Grafana 多加几个页面”，而是构建一个真正可用的 **Grafana Control Plane**：

- **前端**：完全贴 Grafana 插件生态与视觉规范，减少用户学习成本
- **后端**：通过 Draft / Publish / Conflict / Governance / Datasource 五大服务形成控制面
- **数据库**：通过 resource_registry / draft / version / publish_job / audit 等表保证流程可追踪、可审计、可回滚
- **用户价值**：不丢数据、可控发布、冲突可解、治理清晰
