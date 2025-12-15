# 工程代码版本管理说明手册

> 状态（2025-12-15）：适用于当前 Monorepo（web/server/docs）。请在提交前对照 README 的运行/部署要求，避免引用旧版 SQLite/OAuth 流程。

（适用于 Canvas 课程助手项目）

## 1. 目的说明

本手册用于规范团队在 GitHub 上的代码版本管理流程，确保：

* 前端、后端与 Agent 代码协作顺畅；
* 提交历史清晰可追溯；
* 版本可控，避免多人覆盖、冲突混乱；
* 提高开发效率与质量。

本流程要求所有组员严格遵循，任何代码进入主分支（main）前均需经 Pull Request评审。

---

## 2. 仓库结构与管理方式

本项目采用 **单仓库（Monorepo）** 结构管理所有代码：

```text
canvas-course-helper/
  web/        # 前端 Next.js
  server/     # 后端 NestJS
  agents/     # Agent 相关模块
  docs/       # 文档与说明
  .gitignore
  README.md
```

选择单仓库的原因：

1. 前后端与 Agent 联调方便；
2. 版本统一管理，避免跨仓库同步困难；
3. 团队成员只需维护一个仓库。

---

## 3. 分支策略（团队必须遵守）

本项目采用 **GitHub Flow** 轻量分支策略。

### 3.1 主分支（main）

* 项目的稳定版本；
* 始终确保可启动、可运行；
* 禁止任何人在 `main` 上直接提交代码（push）；
* 所有改动必须通过 PR 合并。

### 3.2 功能分支（feature branches）

所有开发都应在功能分支上完成。命名规范建议如下：

```text
feat/web-xxxx
feat/server-xxxx
feat/agent-xxxx
fix/web-xxxx
fix/server-xxxx
```

示例：

* `feat/server-canvas-oauth`
* `feat/web-course-list-page`
* `fix/server-token-expire-issue`

### 3.3 可选开发分支（dev）

如团队希望每周统一集成一次，也可添加：

```text
dev
```

开发流程变为：
`feature → dev → main`
团队成员可视项目规模与时间安排决定是否使用 `dev` 分支。

---

## 4. 版本管理整体流程

整体流程如下：

```text
创建 Issue → 创建分支 → 开发与本地测试 → 提交（commit） → 推送（push） → 发起 PR → Review → 合并 main
```

任何功能开发都应该遵循此流程。

---

## 5. Issue 管理规范

所有功能与修复均应先创建 Issue，再开始开发。

### 5.1 Issue 标题示例

* 「后端：实现 Canvas OAuth 登录流程」
* 「前端：课程列表页界面搭建」

### 5.2 Issue 内容建议包括

* 背景（可引用 PRD 对应条目）
* 目标与验收标准
* 子任务列表（可选）
* 负责人（Assignee）
* 预期完成时间
* 关联里程碑（如 Week1、Week2）

---

## 6. 分支创建流程（概览）

关联 Issue 后，创建功能分支：

```bash
git checkout main
git pull origin main
git checkout -b feat/server-canvas-oauth
```

或包含 Issue 号：

```bash
git checkout -b feat/#12-server-oauth-flow
```

在该分支上完成本次功能开发。

---

## 7. Commit 提交规范

建议使用统一前缀，便于阅读：

* `feat:` 新功能
* `fix:` 修复问题
* `docs:` 文档修改
* `chore:` 构建/脚本等杂项
* `refactor:` 重构
* `style:` 格式调整（不改变逻辑）

示例：

```text
feat(server): implement canvas oauth callback
fix(web): fix login button overflow on mobile
docs: add api docs for /courses
```

原则：**一条提交尽量只做一类变更**。

---

## 8. Pull Request（PR）流程与规范

开发完成后，将功能分支推送到远程：

```bash
git push -u origin feat/server-canvas-oauth
```

在 GitHub 上从该分支向 `main`（或 `dev`）发起 PR。

### 8.1 PR 标题规范

推荐格式：

```text
feat(server): 实现 Canvas OAuth 登录流程 (#Issue编号)
```

### 8.2 PR 描述建议内容

* 本次改动的主要内容；
* 关联的 Issue 编号；
* 本地测试方式（例如启动命令、访问路径等）；
* 是否影响其他模块；
* 需要 reviewer 特别关注的问题。

示例：

```text
主要改动：
- 新增 /auth/login 与 /auth/callback 接口
- 集成 CanvasService，支持通过授权码换取 access token
- 新增 Token 模型，存储用户的 Canvas 授权信息

测试方式：
1. cd server && npm run start:dev
2. 浏览器访问 http://localhost:3000/auth/login
3. 完成 Canvas 授权后，在数据库中查看 User/Token 是否写入成功

关联 Issue: #12
```

### 8.3 Review 规则

* 每个 PR 至少需要 1 名组员 Review 通过后才能合并；
* Reviewer 需要重点关注：

  * 功能是否符合 PRD 要求；
  * 是否影响其他模块或现有接口；
  * 是否误提交了敏感信息（如 client_secret、密码等）；
  * 代码是否清晰、可维护。

---

## 9. main 分支保护策略

仓库管理员需在 GitHub 中做以下设置：

* 进入仓库：Settings → Branches → Add rule；
* 对 `main` 添加 Branch protection rule，建议选项：

  * Require a pull request before merging；
  * Require approvals（至少 1 人）；
  * Restrict who can push to matching branches（限制直接 push）；
  * 视情况开启 status checks（如 CI）要求通过后才能合并。

目的：防止直接向 `main` 推送未审核代码。

---

## 10. 环境变量与敏感信息管理

所有敏感信息必须使用环境变量管理，不得直接写入代码。

### 10.1 .gitignore 设置

在仓库根目录 `.gitignore` 中至少包含：

```gitignore
# Node / Next / Nest
node_modules/
dist/
.next/

# env
.env
.env.local
.env.development
.env.production

# logs
*.log
logs/
```

### 10.2 提供 .env.example

仓库仅提供 `.env.example` 供组员参考：

```env
DATABASE_URL=
CANVAS_BASE_URL=
CANVAS_CLIENT_ID=
CANVAS_CLIENT_SECRET=
CANVAS_REDIRECT_URI=
JWT_SECRET=
REDIS_URL=
FILE_STORAGE_DIR=./files
```

每位成员在本地复制为 `.env` 并自行填写。

---

## 11. GitHub Secrets（部署场景）

如使用 GitHub Actions 等方式部署到 Vercel/服务器等，部署所需的密钥统一配置在：

Settings → Secrets and variables → Actions

例如：

* `PROD_DATABASE_URL`
* `PROD_CANVAS_CLIENT_ID`
* `PROD_CANVAS_CLIENT_SECRET`
* `PROD_JWT_SECRET`
* 等

严禁将真实生产环境密钥写入代码库。

---

## 12. 版本发布与标签（Tag）

为便于版本回溯与阶段性展示，每周末由负责人在 `main` 上打 Tag：

```bash
git checkout main
git pull origin main
git tag -a v0.1.0-week1 -m "Week1: basic framework + canvas login + course list"
git push origin v0.1.0-week1
```

示例命名：

* `v0.1.0-week1`：Week1 基础框架与登录完成；
* `v0.2.0-week2`：Week2 完成文件同步与 Agent 初版。

---

## 13. 角色与责任分工（版本管理层面）

* **PM / 架构负责人**

  * 负责创建仓库、配置分支保护、制定里程碑；
  * 维护 README 与 docs 主要文档；
  * 协调合并节奏与冲突处理。

* **后端负责人**

  * 负责 `server/` 目录的结构与规范；
  * 审核后端相关 PR；
  * 与前端约定接口返回格式。

* **前端负责人**

  * 负责 `web/` 目录；
  * 设计前端路由、组件结构；
  * 审核前端相关 PR。


所有成员均需遵循：
**先 Issue → 再分支 → 再 PR → Review → 合并**。

---

## 14. 日常开发典型流程

对日常开发流程进行概括：

1. 从远程拉取 `main` 最新代码；
2. 基于 `main` 新建功能分支；
3. 在功能分支上开发与本地测试；
4. 提交 commit 并推送分支；
5. 在 GitHub 上发起 PR；
6. 通过 Review 后合并 PR 至 `main`；
7. 必要时打 Tag 标记版本。

---

## 15. 禁止操作示例

以下操作应严格避免：

* 直接在 `main` 分支上开发并提交代码；
* 将 `.env` 或数据库密码等敏感信息提交到仓库；
* 未通过 Issue 直接在任意分支大规模修改代码；
* PR 未经过他人审核直接合并（非紧急情况）；
* 多名成员同时在同一功能分支上不加协同地修改代码。

---

## 16. 使用分支进行功能开发的详细教程（实战步骤）

本节给出一个完整的、可直接照做的分支开发示例，以“实现后端 Canvas OAuth 登录”为例。前端、Agent 的开发流程完全类似，只需更换目录与分支命名。

### 16.1 开发前的准备（首次配置）

1. 安装 Git，并配置用户信息（首次使用时执行一次）：

   ```bash
   git config --global user.name "你的名字"
   git config --global user.email "你的邮箱@xxx.com"
   ```

2. 克隆项目代码：

   ```bash
   git clone https://github.com/<org-or-user>/canvas-course-helper.git
   cd canvas-course-helper
   ```

3. 安装对应模块依赖：

   ```bash
   cd server
   npm install
   cd ../web
   npm install
   ```

   安装完成后返回仓库根目录：

   ```bash
   cd ..
   ```

---

### 16.2 基于 Issue 创建功能分支

假设已有一个 Issue：
「#12 后端：实现 Canvas OAuth 登录流程」。

1. 确保本地 `main` 为最新：

   ```bash
   git checkout main
   git pull origin main
   ```

2. 以 Issue 为基础创建功能分支（示例分支名）：

   ```bash
   git checkout -b feat/#12-server-canvas-oauth
   ```

此时你已经处于新建的功能分支上，后续所有开发都在这条分支完成。

---

### 16.3 在功能分支上开发和提交

1. 在对应目录开发，例如：

   ```text
   canvas-course-helper/
     server/
       src/auth/auth.controller.ts
       src/auth/auth.service.ts
       ...
   ```

2. 开发完成一小步后，检查修改内容：

   ```bash
   git status
   git diff
   ```

3. 将需要提交的文件加入暂存区：

   ```bash
   git add server/src/auth/auth.controller.ts server/src/auth/auth.service.ts
   ```

4. 编写清晰的 commit 信息并提交：

   ```bash
   git commit -m "feat(server): implement canvas oauth login and callback"
   ```

如有多次小修改，可以多次提交，保持每次提交逻辑清晰、可回溯。

---

### 16.4 与远程 main 同步（避免长期分支漂移）

如果开发周期稍长，在你开发时其他同学可能已向 `main` 合入新的代码。为了减少最终合并冲突，建议定期同步 `main`。

1. 切回 `main` 拉取最新代码：

   ```bash
   git checkout main
   git pull origin main
   ```

2. 回到你的功能分支并同步 `main`：

   方法一（推荐，rebase 方式，提交历史更线性）：

   ```bash
   git checkout feat/#12-server-canvas-oauth
   git rebase main
   ```

   如果出现冲突，Git 会提示冲突文件。处理方式：

   * 编辑冲突文件，手工解决冲突；

   * 解决完每个文件后：

     ```bash
     git add <冲突文件>
     ```

   * 所有冲突解决后，继续 rebase：

     ```bash
     git rebase --continue
     ```

   方法二（merge 方式，更直观，但提交历史会出现 merge commit）：

   ```bash
   git checkout feat/#12-server-canvas-oauth
   git merge main
   ```

   同样，如果有冲突：

   * 修改冲突文件；
   * 执行：

     ```bash
     git add <冲突文件>
     git commit
     ```

建议团队内部统一选用一种方式（通常推荐 rebase）。

---

### 16.5 推送分支到 GitHub

功能开发阶段完成后，将本地分支推送到远程：

```bash
git push -u origin feat/#12-server-canvas-oauth
```

如果之前已经推送过，再次推送可以直接：

```bash
git push
```

如使用 `rebase` 并修改了已有历史，远程分支与本地不一致时，需要使用强制推送（请谨慎使用，确保无人基于该分支再开新分支）：

```bash
git push --force-with-lease
```

---

### 16.6 在 GitHub 上创建 PR

1. 打开 GitHub 仓库；
2. 可看到 GitHub 通常会提示你为刚推送的分支创建 PR；
3. 选择目标分支（通常为 `main` 或 `dev`）；
4. 填写 PR 标题和说明：

   * 标题：`feat(server): 实现 Canvas OAuth 登录流程 (#12)`
   * 描述：列出功能点、本地测试方式、关联 Issue 编号等；
5. 选择至少一名组员作为 Reviewer；
6. 提交 PR，等待 Review。

---

### 16.7 根据 Review 意见修改代码

Reviewer 可能会在 PR 下提出修改建议。处理方式：

1. 在同一功能分支上继续修改代码；
2. 正常 `git add` 与 `git commit`；
3. 再次 `git push` 到该功能分支；
4. GitHub 会自动将新的提交加入同一个 PR，无需重新创建 PR。

重复以上过程，直到 Reviewer 通过审核。

---

### 16.8 合并 PR 并清理分支

当 PR 审核通过并通过自动检查后，可由具备权限的成员将 PR 合并到 `main`。

常见合并方式：

* “Squash and merge”（压缩为一个提交）；
* “Rebase and merge”；
* “Create a merge commit”。

团队可以在项目初期约定一种默认方式。

合并完成后，可执行清理操作：

1. 在 GitHub 上删除远程功能分支（PR 页面通常有“Delete branch”按钮）；
2. 在本地删除功能分支（可选）：

   ```bash
   git checkout main
   git pull origin main
   git branch -d feat/#12-server-canvas-oauth
   ```

---

### 16.9 一个前端功能分支的完整流程示例

以“实现课程列表页占位 UI”为例，前端同学的完整流程：

1. 从 `main` 同步代码：

   ```bash
   git checkout main
   git pull origin main
   ```

2. 创建分支：

   ```bash
   git checkout -b feat/web-course-list-page
   ```

3. 在 `web/` 目录中开发课程列表页（使用假数据占位）；

4. 本地运行前端进行验证：

   ```bash
   cd web
   npm run dev
   ```

5. 提交代码：

   ```bash
   git add web/src/app/courses/page.tsx
   git commit -m "feat(web): add placeholder course list page"
   ```

6. 推送分支：

   ```bash
   git push -u origin feat/web-course-list-page
   ```

7. 在 GitHub 创建 PR，指向 `main`，等待 Review；

8. 根据 Review 修改、再次 commit 与 push；

9. PR 合并后，本地同步 `main` 并删除分支。

---

## 17. 结语

本手册从整体流程、角色职责、分支策略，到具体分支开发实战步骤，对项目的 GitHub 版本管理进行了完整说明。团队成员在参与本项目开发前，应先完整阅读并理解本手册内容，在实际操作中严格遵循。

如后续流程有调整，由 PM 或架构负责人统一修改本手册并通知团队。