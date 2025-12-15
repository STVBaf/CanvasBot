# Canvas 课程助手

帮助学生统一查看 Canvas 课程、DDL、文件，并提供 AI 总结与小组协作能力。

> 当前认证方式：**手动 Canvas Access Token**（待获得 Developer Key 后再切换 OAuth2）

---

## 特性
- 课程与作业聚合视图，紧急作业提醒
- 课程文件同步与分析（AI 解析课件）
- 课程内学习小组：创建 / 加入 / 解散
- Agent 能力：课程总结、文件分析、对话

## 技术栈
- 前端：Next.js
- 后端：NestJS + Prisma + MySQL
- 任务队列：Bull/Redis
- 部署：Docker Compose（MySQL/Redis），PM2

## 前置条件
- Node.js 18+
- pnpm/npm 可用
- Docker & Docker Compose（用于本地 MySQL/Redis）
- 一个可用的 Canvas Access Token

## 快速开始
1) 克隆仓库
```bash
git clone <repo>
cd canvas-helper
```

2) 启动基础服务（MySQL/Redis）
```bash
docker-compose up -d
```

3) 配置后端环境变量 `server/.env`
```env
CANVAS_BASE_URL=https://canvas.shufe.edu.cn/
DATABASE_URL="mysql://root:password@localhost:3307/canvas_helper"
PORT=3000
JWT_SECRET=dev-secret
```

4) 安装并运行后端
```bash
cd server
npm install
npx prisma generate
npm run build
npm run start:prod   # 或 npm run start:dev
```

5) 安装并运行前端
```bash
cd web
npm install
npm run dev   # http://localhost:3000
```

> 登录方式：在前端登录页粘贴 Canvas Access Token（当前版本无 OAuth2）。

## 目录结构
```
canvas-helper/
  web/        # Next.js 前端
  server/     # NestJS 后端
  docs/       # 文档与运维
```

## 文档索引（已精简）
- `docs/API_IMPLEMENTATION.md`：后端已实现的 API 列表与示例
- `docs/Agent_API_Guide.md`：Agent 相关接口与前端集成示例
- `docs/Docker_Setup.md`：本地 MySQL/Redis 的 Docker 启动与常用命令
- `docs/Manual_Token_Migration.md`：为何使用手动 Token 登录、差异说明
- `docs/Version_Control_Guide.md`：团队分支与提交流程

## 兼容性与版本说明
- 认证：目前仅支持手动 Canvas Token；OAuth2 未启用
- 数据库：仅支持 MySQL（旧文档提到的 SQLite 已废弃）
- 部署：推荐 Docker Compose + PM2；如使用其他方式，请对照 `Docker_Setup.md`

