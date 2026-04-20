# Giant 2048

Phaser 4 2048-style candy-slingshot game with Cloudflare Workers backend and React admin panel.

## Structure

```
2048/
├── apps/                          # 可部署的应用（3 个独立项目）
│   ├── game/                      # Phaser 游戏（→ Cloudflare Pages: giant-2048）
│   ├── admin/                     # React Admin 后台（→ Cloudflare Pages: giant-2048-admin）
│   └── workers/                   # Cloudflare Workers 后端 API（→ giant-2048-api）
├── reference/                     # 只读参考资料
│   ├── c3-original/               # 原版 Construct 3 游戏
│   ├── phaser4-sdk/               # Phaser 4 SDK
│   ├── docs/                      # 设计文档、DB schema、流程图
│   └── giant2048_original.zip     # 原版游戏压缩包备份
├── ANALYSIS.md                    # 原版游戏分析
└── CLAUDE.md                      # Claude Code 工作指引
```

## 开发环境

### 先启动后端（Hono + 本地 D1）
```bash
cd apps/workers
npx wrangler dev --local --port 8787
```

### 游戏
```bash
cd apps/game
npm run dev         # http://localhost:7001
```
Vite dev proxy 将 `/api/*` 转发到 `http://localhost:8787`。

### Admin 后台（React）
```bash
cd apps/admin
npm run dev         # http://localhost:7004
```
登录：`admin` / `123456`

## 部署（Cloudflare，3 个独立项目）

```bash
# 1. Worker（后端 API）
cd apps/workers
npx wrangler deploy

# 2. 游戏
cd apps/game
npm run build
npx wrangler pages deploy dist --project-name=giant-2048

# 3. Admin
cd apps/admin
npm run build
npx wrangler pages deploy dist --project-name=giant-2048-admin
```

## 环境变量

- **apps/game/.env.production** — `VITE_API_URL` 指向生产 Worker URL
- **apps/admin/.env.production** — `VITE_API_BASE` 指向生产 Worker URL

## 技术栈

- **Game**: Phaser 4 + Vite + TypeScript
- **Admin**: React 18 + Vite + Tailwind v4 + Radix UI + shadcn 风格
- **Backend**: Cloudflare Workers + Hono + D1 (SQLite)
