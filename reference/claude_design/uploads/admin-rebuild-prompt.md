# Giant 2048 Admin 后台 — AI 重建提示词

> 把整个文件作为 prompt 发给另一个 AI（Claude Code / ChatGPT / Codex），它读完应该能从零搭出功能等价的 admin。不含 Cloudflare 账号凭证，跨环境可移植。

---

## 1. 角色与目标

你将构建一个叫 **Giant 2048 Admin** 的内部运营后台。它服务于一个 Phaser 4 糖果消除游戏 `giant-2048`，让运营同学做三件事：

1. **监控实战数据** — 看每个"糖果序列方案（Plan）"被玩过多少局、得分分布、玩家留存、学习曲线
2. **配置糖果概率** — 新建/编辑 Plan，每个 Plan 内包含 1-N 个 Stage，每个 Stage 定义一段糖果掉落概率，玩家一局游戏按 Plan 顺序消费这些 Stage
3. **生成预置序列** — 从 Plan 规则预生成确定性的 token 序列（JSON 数组），分发给玩家使用；可启用/禁用/删除

后端数据存在 **Cloudflare D1（开发时 Miniflare 模拟）**，游戏和 admin 共用同一个 workers。

---

## 2. 技术栈

| 层 | 选型 | 版本下限 |
|---|---|---|
| Admin 前端 | React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Radix UI + `class-variance-authority` + `clsx` + `tailwind-merge` + `lucide-react` + `react-toastify` | React ^18.3 / Vite ^6 |
| 组件风格 | shadcn/ui 模式（Radix primitives 包一层命名组件：`Button` / `Card` / `Dialog` / `Sheet` / `Input` / `Label` / `Select` / `Table` / `Tabs` / `Badge` / `Pagination`） | — |
| Admin 后端 | Cloudflare Workers + Hono 4.x + D1（SQLite-兼容） | Hono ^4 |
| 本地开发 | `wrangler dev --local --port 8787`（Miniflare 模拟 D1），vite dev proxy 把 `/api/*` 转到 `:8787` | wrangler ^3 |
| 构建产物 | 前端 → Cloudflare Pages（SPA），后端 → Cloudflare Workers | — |

必装的 Radix 包：`@radix-ui/react-dialog` / `react-alert-dialog` / `react-dropdown-menu` / `react-label` / `react-popover` / `react-scroll-area` / `react-select` / `react-separator` / `react-slot` / `react-switch` / `react-tabs` / `react-tooltip`。

前端使用 Tailwind v4 `@theme` 自定义 CSS 变量（亮色主题）；CSS 变量名遵循：`--color-bg` / `--color-surface` / `--color-surface-2` / `--color-border` / `--color-text` / `--color-text-muted` / `--color-primary` / `--color-accent` / `--color-success` / `--color-danger`。

---

## 3. 目录结构

monorepo 三包，admin 放在 `apps/admin`，后端放在 `apps/workers`。共享部署目标是 3 个独立 Cloudflare 项目。

```
2048/
├── apps/
│   ├── admin/              # 本次要重建的 admin 后台
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   └── assets/
│   │   │       └── border-sheet0.png    # 糖果精灵表（供 CandyIcon 用，512×1024）
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx                  # 顶层布局：左侧导航 + 右侧内容区
│   │       ├── globals.css              # Tailwind 入口 + keyframes
│   │       ├── env.d.ts
│   │       ├── lib/
│   │       │   └── utils.ts             # cn() + formatDateTime()
│   │       ├── api/
│   │       │   ├── client.ts            # fetch 封装 + token 管理
│   │       │   └── types.ts             # 所有后端响应类型
│   │       ├── components/ui/           # 所有可复用 UI（Radix + 自建）
│   │       └── pages/                   # 各路由页面
│   └── workers/            # admin 依赖的后端
│       ├── schema.sql
│       ├── src/index.ts
│       ├── src/sequence-config.ts
│       ├── wrangler.toml
│       └── package.json
```

**本地开发端口**：Admin `:7004`，Workers `:8787`，Game `:7001`。
**Vite proxy**：admin 的 `/api/*` 代理到 `http://localhost:8787`。
**登录凭证**：`admin` / `123456`（硬编码在 workers）。

---

## 4. 数据库 Schema（D1）

完整 `schema.sql`，可直接 `sqlite3 < schema.sql` 建表：

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sequence_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Plan 私有的 Stage：一对多，删 plan 级联
CREATE TABLE IF NOT EXISTS plan_stages (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  stage_order INTEGER NOT NULL CHECK (stage_order > 0),
  name TEXT NOT NULL,
  length INTEGER NOT NULL CHECK (length > 0),
  probabilities TEXT NOT NULL,  -- JSON: {"2":10,"4":10,...,"stone":10}
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id) ON DELETE CASCADE,
  UNIQUE (sequence_plan_id, stage_order)
);
CREATE INDEX IF NOT EXISTS idx_plan_stages_plan ON plan_stages(sequence_plan_id);

CREATE TABLE IF NOT EXISTS generated_sequences (
  id TEXT PRIMARY KEY,
  sequence_plan_id TEXT NOT NULL,
  sequence_data TEXT NOT NULL,          -- JSON array of token strings
  sequence_length INTEGER NOT NULL CHECK (sequence_length > 0),
  status TEXT NOT NULL CHECK (status IN ('enabled', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id)
);
CREATE INDEX IF NOT EXISTS idx_generated_sequences_status ON generated_sequences(status);
CREATE INDEX IF NOT EXISTS idx_generated_sequences_sequence_plan_id ON generated_sequences(sequence_plan_id);

CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  user_id TEXT NOT NULL DEFAULT '',
  seed INTEGER NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'playing',
  sequence_plan_id TEXT,
  generated_sequence_id TEXT,
  sequence_index INTEGER NOT NULL DEFAULT 0,
  end_reason TEXT NOT NULL DEFAULT '',
  ended_at TEXT NOT NULL DEFAULT '',
  last_update_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (sequence_plan_id) REFERENCES sequence_plans(id),
  FOREIGN KEY (generated_sequence_id) REFERENCES generated_sequences(id)
);
CREATE INDEX IF NOT EXISTS idx_games_fingerprint ON games(fingerprint);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_sequence_plan_id ON games(sequence_plan_id);
CREATE INDEX IF NOT EXISTS idx_games_generated_sequence_id ON games(generated_sequence_id);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  score INTEGER NOT NULL,
  actions_count INTEGER NOT NULL DEFAULT 0,
  sign TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(game_id)
);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
```

**关键约定**
- `probabilities` 里允许的 key：`"2" | "4" | "8" | "16" | "32" | "64" | "128" | "256" | "512" | "1024" | "2048" | "4096" | "8192" | "stone"`，所有值之和必须 = 100
- `sequence_data` 是 `Array<string>`，元素是上述 key（数字用字符串存）
- 所有 `*_at` 字段是 ISO 8601 字符串（`new Date().toISOString()`）

---

## 5. Workers API 契约

**统一前缀**：`/api/admin/*`（除 `/login` 外都需 `Authorization: Bearer <token>`）
**中间件**：任何不是 `/login` 的请求必须带 Bearer token；当前实现里 token 仅校验"存在"，不校验内容（可以升级为 JWT 签名校验）。

### 5.1 Auth

```
POST /api/admin/login
  body: { username: string, password: string }
  返回 200: { success: true, token: string }    // token 是 sha256(now + salt)
  返回 401: { error: 'Invalid credentials' }
```

### 5.2 概览统计

```
GET /api/admin/stats
  返回: {
    totalGames: number,
    playingGames: number,
    finishedGames: number,
    topScore: number,
    uniquePlayers: number,
    sequencePlans: number,
    generatedSequences: number
  }
```

### 5.3 游戏局

```
GET  /api/admin/games?page=1&limit=20&status=playing|finished
  返回: { games: Game[], total, page, limit, totalPages }
  Game 字段见 types.ts（带 plan_name + sequence_length 联表）

GET  /api/admin/game/:id
  返回: GameDetail（含 stages[] + sequence 字符串）
DELETE /api/admin/delete-game/:id
POST /api/admin/delete-games  body: { ids: string[] }   // 批量删除
```

### 5.4 Plan + 内联 Stage CRUD

Plan 的 stages 是**内联提交**的（每次 POST/PUT 整体替换）：

```
POST /api/admin/sequence-plans
  body: {
    name: string,
    description?: string,
    stages: [{ name, length, probabilities, stage_order }]   // 至少 1 个
  }
  校验：每个 stage 的 probabilities 必须 sum ≈ 100（±0.01）
  返回 200: { id, name, description, stages }

GET /api/admin/sequence-plans?page=1&limit=20
  返回: { plans: Plan[], total, page, limit, totalPages }
  Plan.stages 已 JSON.parse，total_length = sum of stages[].length

GET /api/admin/sequence-plans/:id      → 单个 Plan（同上结构）
PUT /api/admin/sequence-plans/:id      → body 同 POST；提供 stages 则整体替换
DELETE /api/admin/sequence-plans/:id   → 若有 generated_sequences 引用则返 400；否则级联删 plan_stages
```

### 5.5 序列生成 + CRUD

```
POST /api/admin/generate-sequence
  body: { sequence_plan_id: string, count?: number }  // default 1
  返回: { generated: [{ id, sequence_length, sequence_data }], count }
  逻辑：按 Plan 的 stages 顺序，每个 stage 按 probabilities 加权采样 length 个 token。
       若 probabilities.stone > 0，会按比例均匀插入 stone（前 4 个位置不放）。

GET  /api/admin/generated-sequences?plan_id=&page=1&limit=20
  返回: { sequences: GeneratedSequence[], total, ... }
GET  /api/admin/generated-sequences/:id
PUT  /api/admin/generated-sequences/:id   body: { status: 'enabled' | 'disabled' }
DELETE /api/admin/generated-sequences/:id?force=true
  无 force 时：被 games 引用会返 400（带 refCount / playingCount）
  force=true：先把 playing 局 finished（end_reason='sequence_force_deleted'），再把 games 里的 FK 置空，然后删
```

### 5.6 样本分析（聚合指标）

```
GET /api/admin/plan-stats
  返回: { plans: PlanStat[] }
  PlanStat 包含：
    games_total / games_finished / games_playing / unique_players
    score: NumStats   // count / min / max / avg / median / p90 / std / cv
    duration_sec: NumStats
    step: NumStats
    end_reasons: Record<string, number>
    ceiling_ratio (= p90/p50)
    gameover_share / timeout_share
    first_game: { count, avg_step, avg_score }   // 每玩家首局
    retry_rate: number | null                    // ≥3 局的玩家比例
    learning_curve: { sample, avg_delta }        // 第5局 vs 第1局得分提升率

GET /api/admin/plan-sequence-stats?plan_id=<plan_id>
  返回: { plan_id, sequences: SequenceStat[] }
  SequenceStat: { sequence_id, games_total, games_finished, unique_players,
                  score_min/max/avg/median, duration_avg/median }
```

### 5.7 Game Play 接口（admin 不用，但 workers 同时服务游戏）

Game 走 `/api/game/*`，不在本 prompt 范围。重建 admin 时保留现有 game 路由不动。

---

## 6. Admin 前端页面清单

7 个路由（SPA，用 `App.tsx` 里 `useState<NavKey>` 切换，不走 react-router）：

| 路由 key | 页面文件 | 标题 | 作用 |
|---|---|---|---|
| `(auth)` | `pages/LoginPage.tsx` | 登录 | token 存 localStorage，预填 `admin` / `123456` |
| `stats` | `pages/StatsPage.tsx` | 统计 | 7 个统计卡片，点击跳相应页 |
| `plan-analysis` | `pages/PlanAnalysisPage.tsx` | 样本分析 | Plan 级别多维指标 + 展开行显示序列级细分 |
| `games` | `pages/GamesPage.tsx` | 游戏局 | 分页列表、多选删除、筛选 playing/finished |
| `config` | `pages/ConfigPage.tsx` | 配置 | Plans / Sequences 管理（结构树 + 右侧详情） |
| (子 dialog) | `pages/PlansPage.tsx` → `PlanDialog` | Plan 编辑抽屉 | 从右侧滑出，内联 stages 配置 |
| (子 dialog) | `pages/SequencesPage.tsx` → `GenerateSequenceDialog` / `DeleteSequenceDialog` | 序列生成/删除 | Plan 选择 + count 输入 |

---

## 7. 每页详细规格

### 7.1 LoginPage
- 居中 `<Card>`，标题 `Giant 2048 Admin` + LogIn icon
- 两个 `<Input>`：username / password；默认填 `admin` / `123456`
- Submit → 调 `login()`（api/client.ts）→ 成功 toast + 调 `onLogin` 回调

### 7.2 StatsPage
- 顶部栏："统计" + 刷新按钮
- 4 列响应式 grid，7 个卡片：总局数 / 进行中 / 已结束 / 独立玩家 / 最高分 / 序列方案数 / 生成序列数
- 卡片带 hint 文本 + hover 阴影 + 点击跳对应页

### 7.3 PlanAnalysisPage（样本分析）
- 顶部栏："样本分析" 标题 + 刷新按钮 + 健康区间图例（绿/黄/红）
- 一张大表 13 列：Plan / 样本 / 独立玩家 / 时长 P50/P90 / 分数 P50/P90 / 天花板比 / 分数 CV / 新手首局步数 / RETRY率 / GAMEOVER占比 / 学习曲线
- 每行 Plan 列左侧有 `▸` 展开按钮
- 展开后用 `colSpan={13}` 渲染嵌套子表，显示该 Plan 下各 `generated_sequence_id` 的 9 列明细：序列(前8位)/局数/独立玩家/最小/最大/平均/中位数得分/平均/中位数时长
- 展开触发 `GET /plan-sequence-stats?plan_id=...`，结果缓存到 state，避免重复请求
- 下方再一张"end_reason 分布"卡片，用横向堆叠条展示各终止原因占比

健康区间 Cell 组件（带颜色反馈）：
```tsx
const RANGES = {
  duration_median: { green: [90, 180], yellow: [60, 300] },
  score_median:   { green: [1000, 3000], yellow: [500, 5000] },
  ceiling_ratio:  { green: [2.5, 6], yellow: [1.8, 10] },
  score_cv:       { green: [0.3, 0.6], yellow: [0.2, 0.9] },
  first_step:     { green: [10, 30], yellow: [5, 50] },
  retry_rate:     { green: [0.4, 1], yellow: [0.2, 1] },
  gameover_share: { green: [0.7, 1], yellow: [0.5, 1] },
  learning_delta: { green: [0.2, 3], yellow: [0, 5] },
};
```

### 7.4 GamesPage
- 顶部：状态 tabs（全部/进行中/已结束）+ 刷新 + 批量删除
- 表格：勾选列 / game_id / fingerprint / plan_name / status / score / step / 时长 / 创建时间 / 操作
- 单行点击进入详情页（内嵌到本页或抽屉）
- 底部分页

### 7.5 ConfigPage
- 左侧 300px 宽结构树 `<Card>`：Plans 区（展开可看其下 sequences 列表）+ 可能的 Orphan Sequences 区
- 右侧详情区：
  - 未选中 → `<EmptyState>` 解释 Plan/Stage/Sequence 概念
  - 选中 Plan → `<PlanDetailView>`：概览卡 + 阶段顺序卡（每 stage 显示只读 `<ProbabilityTimeline>`）+ 已生成 Sequences 列表卡
  - 选中 Sequence → `<SequenceDetailView>`：概览卡 + Token 频次条形图 + Token 时间轴（flex wrap 列出所有 token）
- 顶部"新增 Plan"按钮 → 打开 `<PlanDialog>`（抽屉）
- "生成序列"按钮（在 PlanDetailView 里）→ 打开 `<GenerateSequenceDialog>`

### 7.6 PlanDialog（抽屉编辑 Plan）
- 使用 `<Sheet>` 从**右侧滑出**（宽度 `85vw`，最大 1280px，高 100vh）
- Header：标题（新增/编辑）+ 右上关闭 ×
- Body 可滚动：
  - 名称 + 描述两个 Input 并排
  - "阶段列表"标题 + 总长度指示
  - 每个 Stage 卡片：`#序号 | Stage 名 Input | 长度 Input | ↑ ↓ × 三按钮` + 下面一个 `<ProbabilityTimeline>`
  - 底部 "添加 Stage" 全宽按钮
- Footer：取消 + 保存按钮；保存按钮仅在所有 stage 合法（名称非空 + length>0 + probabilities sum=100）时启用

---

## 8. 核心自建组件

### 8.1 `components/ui/candy-icon.tsx`
复用 `apps/game` 里的精灵表 `border-sheet0.png`（512×1024，4×8 个 128×128 格子）。把 png **复制**到 `apps/admin/public/assets/border-sheet0.png`（相对于 Vite 的 `public` 目录）。

坐标表（来自 Construct 3 原版 data.json）：

```ts
const POS: Record<string, [number, number]> = {
  stone:  [2, 1],     '8192': [132, 0],   '4096': [261, 1],   '2048': [384, 0],
  '1024': [132, 131], '512':  [262, 131], '256':  [2, 260],   '128':  [132, 260],
  '64':   [262, 263], '32':   [2, 513],   '16':   [132, 514], '8':    [262, 514],
  '4':    [1, 769],   '2':    [131, 769],
};
```

渲染用 CSS `background-image` + `background-position` 切图，通过 `scale = size / 128` 对 position 和 size 同步缩放。

暴露 `<CandyIcon value="16" size={48} />` 和两个 helper：`candyAvailableKeys()`（14 个 key 有序数组）/ `isKnownCandy(key)`。

### 8.2 `components/ui/probability-timeline.tsx`
Plan 内每个 stage 的核心编辑控件。一条水平条，每个 candy 一个段，宽度 = 该值 %；拖动段边界调大小，其他段按当前比例均摊差额以保持总和 = 100%。

外部接口：
```tsx
<ProbabilityTimeline
  value={Record<string, number>}   // { "2": 50, "4": 30, "stone": 20 }
  onChange={(next) => ...}
/>
```

关键算法：
- 拖把手：设目标段 `key` 的新 %，剩余的按 *原有比例* 均摊差额（`takeFromOthers`）
- 删除某段：把它的 % 按剩余段 *当前比例* 还回去
- 添加某段：从最大段扣 1% 给新段（初始可见但占比小）
- 保存前 `normalizeTo100()` 把浮点误差补到最大段

视觉：段内显示 candy 图标 + 百分比徽章；段右上角 × 在 hover 时出现；相邻段之间有 6px 宽拖拽把手（`cursor: ew-resize`）；底部一行未加入的 candy 候选（点击加入）。

### 8.3 `components/ui/sheet.tsx`
右侧滑出的抽屉，基于 `@radix-ui/react-dialog` 的 `Root/Portal/Overlay/Content` 封装。和 `<Dialog>` 的区别仅在 Content 的定位与动画：

```tsx
<DialogPrimitive.Content
  className={cn(
    'fixed right-0 top-0 z-50 flex h-full w-[85vw] max-w-[1280px] flex-col',
    'border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl',
    'data-[state=open]:[animation:sheet-slide-in-right_300ms_cubic-bezier(0.16,1,0.3,1)]',
    'data-[state=closed]:[animation:sheet-slide-out-right_200ms_ease-in]',
  )}>
```

必须在 `globals.css` 里加对应 keyframes：

```css
@keyframes sheet-slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes sheet-slide-out-right { from { transform: translateX(0); } to { transform: translateX(100%); } }
@keyframes overlay-fade-in  { from { opacity: 0; } to { opacity: 1; } }
@keyframes overlay-fade-out { from { opacity: 1; } to { opacity: 0; } }
```

暴露：`Sheet / SheetContent / SheetHeader / SheetBody / SheetFooter / SheetTitle / SheetDescription`。SheetBody 内部是 `flex-1 min-h-0 overflow-y-auto`，保证 Header/Footer 固定在顶底。

---

## 9. 身份验证流

1. `LoginPage` 登录成功 → `setToken(t)` 写 localStorage(`admin_token`)
2. `api()` 通用请求：从 `getToken()` 取 token，加到 `Authorization: Bearer`
3. 所有 401 响应 → 抛 `{ status: 401, error }`，调用方可以 `clearToken()` + 重定向到 `<LoginPage>`
4. `App.tsx` 初始化 `loggedIn = !!getToken()`，为 false 时渲染 `<LoginPage onLogin={() => setLoggedIn(true)} />`
5. 登出按钮在左侧导航底部，`clearToken()` + `setLoggedIn(false)`

`api()` 代码骨架：

```ts
export async function api<T>(path: string, opts: { method?, body?, noAuth? } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!noAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: JSON.stringify(body) });
  if (!res.ok) throw { status: res.status, ...(await res.json().catch(() => ({}))) };
  return res.json();
}
```

---

## 10. 构建与部署

### 10.1 本地开发

```bash
# 后端
cd apps/workers && npx wrangler dev --local --port 8787

# Admin 前端
cd apps/admin && npm install && npm run dev     # http://localhost:7004
```

Vite proxy 把 `/api/*` 打到 workers，登录即可。

### 10.2 生产构建

```bash
cd apps/admin
npm run build         # 产出 apps/admin/dist/（含 tsc --noEmit 类型检查）
npx wrangler pages deploy dist --project-name=giant-2048-admin
```

Workers 端：

```bash
cd apps/workers
npx wrangler deploy
```

### 10.3 环境变量

- `VITE_API_BASE`（可选）— admin 生产环境指向 Worker 公网 URL；为空时用相对路径（需同域）
- Workers 的 `wrangler.toml` 声明 D1 binding：`name=DB, database_name=giant-2048-scores, database_id=<你的 D1 UUID>`

---

## 11. 关键设计决策与注意事项

以下是在实现过程中已经踩过坑或明确做过权衡的点，重建时**必须**遵守，否则会偏离原项目语义：

### 11.1 Plan 与 Stage 是"一对多内聚"而非"多对多共享"

早期版本里 `stages` 是跨 Plan 复用的全局概念——一个 stage 可以被多个 plan 引用。后来改掉了，因为运营同学觉得配置繁琐（要先去 Stages 页面建、再到 Plans 页面组装），而且共享带来的"删 stage 时还要检查引用计数"的负担不划算。现在每个 stage 只属于一个 plan，删 plan 时通过 `ON DELETE CASCADE` 级联删 stages。**不要恢复共享关系**。

### 11.2 概率配置用可视化时间轴，不用数字输入

原版是 8 个 Number Input 逐个填百分比，用户反馈"调一个就要重算另外几个才能让总和回 100，太烦"。现在的 `<ProbabilityTimeline>` 用拖拽操作：拖边界 → 系统自动按比例均摊差额给其他段 → 总和永远是 100%。

重建时要注意：
- 均摊算法用**拖动前的原比例**分配差额，不是拖动后的实时比例（否则会出现"越拖越失衡"的滑坡）
- 最后要做一次 `normalizeTo100()` 把浮点误差补到最大段，否则 sum 可能是 99.9999 或 100.0001
- 添加新段用"从最大段扣 1% 给它"，不要让新段初始占 0%（0% 段视觉上完全不可见，用户会以为没加上）

### 11.3 编辑 Plan 用"抽屉 Sheet"而非居中 Dialog

Plan 的编辑内容非常多（名称、描述、多个 stage、每个 stage 的时间轴 + 候选面板），居中 Dialog 的 `max-w-3xl` 撑不下，而且水平方向浪费屏幕空间。改成右侧滑出抽屉，默认 `85vw`、最大 1280px，垂直占满屏。抽屉用 Radix Dialog 原语实现（不需要额外依赖），配合 CSS `@keyframes` 做 slide-in/out 动画。

### 11.4 样本分析的"展开行"是懒加载

PlanAnalysisPage 的主表返回所有 Plan 的聚合指标（`/plan-stats` 一次全拉）；但展开某个 Plan 查看 sequence 细分时，才 fetch `/plan-sequence-stats?plan_id=...`。展开结果缓存到组件 state，再次收起/展开不重复请求。这样避免首屏加载太多数据。

### 11.5 所有统计不过滤 status='finished'

早期版本只统计 finished 的局，但 playing 的局（比如 timeout 中断）其实也反映玩家留存、失败率等信号。现在 `/plan-stats` 内部分别算 `games_total`（全部） vs `games_finished`（仅已结束）；`duration_sec` 只算 `ended_at - created_at` 可计算的那些；score 统计同样宽松。`/plan-sequence-stats` 一律按全部局聚合，UI 里用"X/Y"形式同时显示 finished/total。

### 11.6 Token 用字符串不用数字

`probabilities` 的 key 和 `sequence_data` 的元素都是字符串（`"2"` / `"stone"`）。这样 JSON 序列化 / 反序列化 / 比较都不会出现 `stone` 和数字混用导致的 type error。前端 CandyIcon 也按字符串 key 查 POS 表。

### 11.7 生成序列的确定性

`generate-sequence` 用 `sha256(stage_id + stage_order + pos + randomUUID())` 做加权抽样。这样：
- 相同 Plan 配置**每次**生成的序列都不同（因为 randomUUID）
- 但单次生成过程是确定性的 —— 同一 sequence_data 回放任何 step 都等价
- 石头均匀插入：`interval = length / stoneCount`，避免扎堆；前 4 个位置不放石头（防止开局即死）

### 11.8 登录机制故意简单

目前 admin token 只校验"存在"，不校验内容。这是有意为之：admin 是内部工具，当前部署在受控网络下。后续要加固时推荐路径：改成 JWT HMAC 签名 + 过期时间校验，放在 wrangler secret 里。**不要**引入 OAuth / session cookie 等复杂机制，保持 token 模型。

### 11.9 开发时不要把生产 D1 ID 变成硬编码

`wrangler.toml` 里的 `database_id = "xxx"` 是**生产 D1 绑定**。本地开发跑 `wrangler dev --local` 时会**忽略**这个 ID，改用 Miniflare 模拟 + `.wrangler/state/v3/d1/.../*.sqlite`。重建时要保留这个 database_id，但不要在代码里硬编码 UUID；通过 `c.env.DB` 注入。

### 11.10 前后端类型要同构

所有后端响应的形状都应该在 `apps/admin/src/api/types.ts` 里有对应的 TypeScript 接口，这样前端调 `api<T>()` 时能拿到类型推导。后端接口改了字段名一定要同步改前端类型；漏掉会导致运行时静默崩溃（前端 access `undefined.foo`）。推荐在写后端 endpoint 的时候顺手更新前端 types，把两边当做一个"契约包"维护。

### 11.11 FK 约束在 Miniflare 下要靠 PRAGMA 开启

SQLite 默认 FK 约束是关闭的，要显式 `PRAGMA foreign_keys = ON`。Miniflare 下 D1 runtime 会自动开启（所以 `ON DELETE CASCADE` 在 wrangler dev 里可以正常工作）；但如果你用 `sqlite3` 命令行直接操作本地 sqlite 文件做数据清理，则 FK 是关闭的，CASCADE 不会触发——这时需要手动先删子表。这是一个调试时常会踩的坑，写工具脚本时注意。

---

## 12. 代码风格约定

- **不加**注释除非描述非显而易见的约束（比如前 4 格不放石头的原因、浮点归一的必要性）
- **组件命名**：大驼峰；文件名小写连字符（`candy-icon.tsx`）
- **Tailwind class 里的颜色**：用 CSS 变量 `var(--color-*)` 而非 Tailwind 原生颜色名，方便未来加暗色主题
- **路由和 API path** 都是 kebab-case：`/plan-analysis`、`/plan-sequence-stats`
- **所有日期字段**服务端返 ISO 8601 字符串；前端用 `formatDateTime()`（见 `lib/utils.ts`）按 `YYYY-MM-DD HH:mm:ss` 本地化
- **异步错误**一律抛 `{ status, error, ...body }`；调用方用 `toast.error((err as {error?: string})?.error || '默认文案')`
- **API 请求日志**：`client.ts` 自带 `[admin-api #N] → GET /path ... ✓ 200 (12ms)` 的序号计时日志，不要删；这对调试多并发请求非常有用

---

## Verification（接收方 AI 自检）

按顺序操作验证你重建的 admin 是否等价：

1. `npm install` 无红色报错
2. `npx tsc --noEmit` 在 `apps/admin` 和 `apps/workers` 目录下均 0 错
3. `sqlite3 schema.sql` 能成功建表（或 wrangler dev 启动无报错）
4. 用 `admin` / `123456` 登录，看到 4 个左侧导航项：统计 / 样本分析 / 游戏局 / 配置
5. 进"配置" → 点"新增 Plan" → 抽屉从右侧滑入，宽度约 85% 屏
6. 给 Plan 取名、点"添加 Stage" → 可以拖动时间轴调概率；总和条永远显示 100%（绿色）
7. 保存 Plan → 回到结构树能看到新 Plan；选中它 → 右侧显示只读时间轴
8. 点"生成序列" → 选 count=3 → 成功 → 已生成 Sequences 列表多 3 条
9. 进"样本分析" → 该 Plan 那行可展开，看到对应的 sequence 明细（如果还没玩过则显示"暂无"也 OK）
10. curl 测试：`curl http://localhost:7004/api/admin/stats -H "Authorization: Bearer <token>"` 返回 `totalGames` 等字段（通过 Vite proxy）

以上 10 步都通过，则 admin 重建达到等价。如果有未通过项，参考第 4 节 schema 与第 5 节 API 契约，对照 `apps/workers/src/index.ts` 里 1095 行的当前实现逐项核对。
