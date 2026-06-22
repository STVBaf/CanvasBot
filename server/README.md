# Canvas Helper Server

NestJS backend for Canvas bearer-token integration, Prisma/MySQL persistence, BullMQ file downloads, and Coze-powered agent endpoints.

## Current Auth Model

Business APIs keep the original Canvas bearer flow:

```http
Authorization: Bearer <Canvas Access Token>
```

JWT-related code remains for historical/manual-login compatibility, but normal frontend calls should continue sending the Canvas token.

## Local Setup

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

The default backend URL is `http://localhost:3000/api`.

## Production Setup

Required environment variables:

```env
NODE_ENV=production
PORT=3000
CANVAS_BASE_URL=https://canvas.sufe.edu.cn/
DATABASE_URL=mysql://USER:PASSWORD@127.0.0.1:3307/canvas_helper
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace-with-a-long-random-secret
ALLOWED_ORIGINS=https://your-frontend-domain.com
FILE_STORAGE_DIR=/var/lib/canvasbot/files
FILE_WORKER_ENABLED=true
```

Build and run:

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

If PM2 or another process manager runs multiple API instances, set `FILE_WORKER_ENABLED=false` on API instances and run one dedicated worker-enabled process so downloaded files are written predictably.

## Operational Notes

- Deploy behind HTTPS. Canvas Access Tokens are sent by the browser and stored in the database for queued file downloads.
- `FILE_DOWNLOAD_MAX_BYTES` limits Canvas file downloads; default is 100 MB.
- `AGENT_UPLOAD_MAX_BYTES` limits uploaded files for `/api/agent/analyze-file`; default is 50 MB.
- `AGENT_LOG_RETENTION_DAYS` controls automatic cleanup for `AgentRequestLog`; default is 90 days.
- Use `npx prisma migrate deploy` on servers. Do not use `migrate dev` against production data.
