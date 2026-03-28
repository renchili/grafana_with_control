# 安装与使用

## 推荐方式（最稳）
1. 先用官方脚手架创建一个 app plugin：
   ```bash
   npx @grafana/create-plugin@latest
   ```
   选择 **app** 类型。

2. 进入脚手架目录：
   ```bash
   cd <your-plugin>
   ```

3. 将本压缩包里的 `src/`、`README.md`、以及需要的配置内容覆盖进去。

4. 安装依赖：
   ```bash
   npm install
   ```

5. 启动前端开发构建：
   ```bash
   npm run dev
   ```

6. 启动 Grafana 开发环境（官方脚手架会生成 Docker Compose 环境）：
   ```bash
   docker compose up
   ```

7. 打开 Grafana，进入 **Administration > Plugins**，确认插件已被发现并启用。

## 直接作为源码使用
如果你已经有自己的 Grafana 插件开发环境，也可以直接使用这个项目源码：
1. 安装依赖
2. 确保插件目录被 Grafana 扫描到
3. 确保 `plugin.json` 存在于插件目录（或 `dist/`）中
4. 启动 Grafana

## 页面访问
插件页面路径：
- `/a/rody-grafanacontrol-app/drafts`
- `/a/rody-grafanacontrol-app/conflict?draftId=<id>`

## 依赖的后端接口
- `GET /api/platform/v1/me/drafts`
- `POST /api/platform/v1/drafts/{draftId}/publish`
- `POST /api/platform/v1/drafts/{draftId}/abandon`
- `GET /api/platform/v1/drafts/{draftId}/conflict`
- `POST /api/platform/v1/drafts/{draftId}/rebase`
- `POST /api/platform/v1/drafts/{draftId}/save-as-copy`
- `POST /api/platform/v1/drafts/{draftId}/takeover`

## 注意
- 这个包提供的是**前端可用源码**。
- 为了最大兼容性，推荐把它放进官方 `create-plugin` 生成的 app plugin 项目中使用。
