# Canvas Helper - 手动 Token 登录改造总结

> 状态（2025-12-15）：仍采用手动 Canvas Access Token 登录；OAuth2 未启用。适用当前发布版本。

## 改造时间
2025年12月1日

## 改造原因
当前还没有获得 Canvas Developer Key，无法使用 OAuth2 完整流程。因此暂时使用手动生成的 Canvas Access Token 进行登录和 API 访问。

## 主要修改

### 1. 后端修改

#### `server/src/auth/auth.controller.ts`
- ✅ 注释掉 OAuth2 相关路由：`/login` 和 `/callback`
- ✅ 新增路由：`POST /api/auth/login/manual`
  - 接受参数：`accessToken` (必需), `email` (可选)
  - 返回：用户信息和 JWT token

#### `server/src/auth/auth.service.ts`
- ✅ 注释掉 OAuth2 相关方法：`getAuthorizeUrl()`, `handleCallback()`
- ✅ 新增方法：`loginWithManualToken(accessToken, email)`
  - 使用 access token 获取 Canvas 用户信息
  - 创建或更新用户记录
  - 保存 token 到数据库（`expiresAt` 设为 `null`，表示长期有效）
  - 生成并返回 JWT token

#### `server/src/canvas/canvas.service.ts`
- ✅ 注释掉 OAuth2 相关方法：`getAuthorizeUrl()`, `exchangeToken()`, `refreshToken()`
- ✅ 简化 `getAccessTokenForUser()` 方法
  - 移除 refresh token 逻辑
  - 手动 token 长期有效，直接返回

#### `server/.env.example`
- ✅ 创建环境变量模板文件
- ✅ 注释掉暂时不需要的 OAuth2 配置项

### 2. 前端修改

#### `web/app/login/page.tsx`
- ✅ 完全重写登录页面
- ✅ 添加 Access Token 输入框
- ✅ 添加邮箱输入框（可选）
- ✅ 实现登录逻辑：
  - 调用 `POST /api/auth/login/manual`
  - 保存 JWT token 到 localStorage
  - 登录成功后跳转到课程页面
- ✅ 添加错误处理和加载状态

#### `web/app/courses/page.tsx`
- ✅ 添加登录状态检查
- ✅ 从 localStorage 读取 JWT token
- ✅ 在 API 请求中添加 Authorization header
- ✅ 处理 401 错误（token 失效时跳转登录页）
- ✅ 添加退出登录功能

### 3. 文档更新

#### `QUICK_START.md`
- ✅ 添加"如何获取 Canvas Access Token"说明
- ✅ 更新测试步骤，改为使用手动 token 登录
- ✅ 更新环境变量配置说明
- ✅ 更新核心 API 端点列表

#### `README.md`
- ✅ 添加重要提示：当前使用手动 token
- ✅ 添加获取 Access Token 的步骤

#### `docs/Manual_Token_Guide.md`
- ✅ 新建详细使用指南
- ✅ 包含获取 token、登录、使用 API 的完整说明
- ✅ 安全注意事项
- ✅ 常见问题解答
- ✅ 未来 OAuth2 迁移指南

## 技术细节

### 新增 API 端点

**POST `/api/auth/login/manual`**

请求体：
```json
{
  "accessToken": "your_canvas_access_token",
  "email": "your@email.com"  // 可选
}
```

响应：
```json
{
  "userId": "clxxxxx",
  "email": "your@email.com",
  "name": "Your Name",
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "登录成功！使用手动生成的 Canvas Access Token"
}
```

### 数据库变化

Token 表中的 `expiresAt` 字段：
- OAuth2 token：设置为实际过期时间
- 手动 token：设置为 `null`（长期有效）

### 前端存储

localStorage 中存储的数据：
- `authToken`: JWT token
- `userEmail`: 用户邮箱
- `userName`: 用户名称

## 使用流程

### 1. 获取 Canvas Access Token
1. 登录 Canvas
2. 进入 Settings → Approved Integrations
3. 点击 "+ New Access Token"
4. 复制生成的 token

### 2. 登录系统
- 前端：访问 `/login`，输入 token
- API：调用 `POST /api/auth/login/manual`

### 3. 使用 API
所有需要认证的 API 请求都需要携带 JWT token：
```
Authorization: Bearer <jwt_token>
```

## 未来 OAuth2 迁移

当获得 Canvas Developer Key 后，只需：

1. 配置环境变量：
   ```bash
   CANVAS_CLIENT_ID=your_client_id
   CANVAS_CLIENT_SECRET=your_client_secret
   CANVAS_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ```

2. 取消注释代码：
   - `server/src/auth/auth.controller.ts` 中的 `/login` 和 `/callback` 路由
   - `server/src/auth/auth.service.ts` 中的 OAuth2 方法
   - `server/src/canvas/canvas.service.ts` 中的 OAuth2 方法

3. 更新前端登录页面（可选保留手动 token 方式作为备用）

## 兼容性

- ✅ 保留了所有 OAuth2 代码（以注释形式）
- ✅ 数据库 schema 同时支持手动 token 和 OAuth2 token
- ✅ 手动 token 和 OAuth2 可以共存
- ✅ 现有的开发/测试路由仍然可用

## 测试建议

### 后端测试
```bash
# 1. 测试手动 token 登录
curl -X POST http://localhost:3000/api/auth/login/manual \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_TOKEN"}'

# 2. 使用返回的 JWT 获取课程
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:3000/api/courses

# 3. 同步文件
curl -X POST "http://localhost:3000/api/files/sync?courseId=123" \
  -H "Authorization: Bearer YOUR_JWT"
```

### 前端测试
1. 访问 `http://localhost:3000/login`
2. 输入 Canvas Access Token
3. 验证登录成功并跳转到课程页
4. 验证课程列表加载
5. 验证退出登录功能

## 注意事项

⚠️ **安全提醒**
- 手动 token 拥有完整的 Canvas 账号权限
- 不要分享或泄露 token
- 生产环境必须使用 HTTPS
- 定期更新 token

⚠️ **开发提醒**
- `.env` 文件不要提交到 Git
- 使用 `.env.example` 作为模板
- JWT_SECRET 在生产环境必须使用强密码

## 相关文件清单

### 修改的文件
- `server/src/auth/auth.controller.ts`
- `server/src/auth/auth.service.ts`
- `server/src/canvas/canvas.service.ts`
- `web/app/login/page.tsx`
- `web/app/courses/page.tsx`
- `QUICK_START.md`
- `README.md`

### 新建的文件
- `server/.env.example`
- `docs/Manual_Token_Guide.md`

### 保留但注释的代码
- OAuth2 authorize URL 生成
- OAuth2 token 交换
- OAuth2 token 刷新
- OAuth2 登录和回调路由

---

**改造完成！**现在可以使用手动生成的 Canvas Access Token 进行登录和 API 访问。
