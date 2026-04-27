# 平台集成（Platform Integration）— WIP 上下文文档

> **状态**：进行中（V1 架构已实现，V2 改造方向已定但未实现）
> **当前分支**：`feature/yibu/connect-game-platform`
> **写于**：2026-04-27 (yibu 在不同机器 pull 这份代码继续工作时必须依赖此文档恢复上下文)

---

## 1️⃣ 背景与商业目标

### 我们的产品定位

`giant 2048` 游戏要从"独立网站玩家直接访问"升级为**嵌入到第三方聚合平台**的 SDK 模式：

- 我们的角色：**游戏供应商**（同 joyplay）
- 上游平台举例：`super86.cc`（聚合多家小游戏的中心，已经把 giant2048 列进它们的 Mini-Games 列表）
- 玩家流程：玩家在 super86.cc 列表点 giant2048 → super86 把玩家 redirect 到我们的 iframe URL → 玩家在 super86 域内部框里玩我们的游戏

### 我们的 gameId

- super86 给我们的 gameId：**`1498325535736990754`**
- 类比：joyplay 的 TestGame gameId = `1486043520954271062`

---

## 2️⃣ 真实流程（从 super86 抓包出来的 4 + 6 + 1 个请求）

### 2.A super86.cc → joyplay 的接入流程（参考案例）

#### 2.A.1 super86 调它自己的 game/enter 业务接口

来源：玩家点击 super86 列表里的 joyplay TestGame 时，super86 前端调它自己后端。

```bash
POST https://api-proxy.buyacard.cc/game-api/game-center/game/enter
Headers:
  token: <super86 用户长 JWT>
  cid: 1.1777270777927.25e8a582.o9XcuHC3LSQfS2qJeLKbOBB5-VOrSlOpt8xtJT_DwoVYrSn2egLjFacHoyf4YCWeSJinoYNV9XWtWB4ETKAPKw
  client: C_H5
  device: h5
  domain: super86.cc
  id_a: XjCwPPy32Da09gztLPdo
  language: en-US
  origin: https://super86.cc
  referer: https://super86.cc/
  pwa: 0
  rl: 0
Body:
  {
    "gameSupplierId": "1486042272511296851",
    "gameCategoryId": "1440017230707294493",
    "gameId": "1486043520954271062",  // ← 我们的对应是 1498325535736990754
    "currency": "VND",
    "returnUrl": "https%3A%2F%2Fsuper86.cc%2Fclose",
    "gameName": "TestGame"
  }

Response (joyplay):
{
  "success": true,
  "errCode": "0",
  "errMessage": "success",
  "sn": null,
  "data": {
    "url": "https://joyplay.cn/release/index.html?appKey=533xp2gkz9g8l7fr44u9&token=<short JWT>&gameId=1&lan=en-US&ext=0",
    "config": { "env": "test" },
    "openType": 0,
    "screen": 1,
    "admissionAmount": 1
  }
}
```

→ **关键产出**：iframe URL + 短 JWT token

#### 2.A.2 super86 内部 — 用户进游戏记录（与我们无关，但记下来）

```bash
POST https://api-proxy.buyacard.cc/api/pw-admin/cw/v0/user/game/addPlayRecord
Body (encrypted):
  {
    "data": "<encrypted base64>",
    "raw": {
      "gameSupplierId": "1486042272511296851",
      "gameCategoryId": "1440017230707294493",
      "gameId": "1486043520954271062",
      "gameType": 0
    }
  }

Response: encrypted "success"
```

#### 2.A.3 super86 内部 — 游戏元数据查询

```bash
POST https://api-proxy.buyacard.cc/api/pw-admin/cw/v0/user/game/detail
Body (raw):
  { "gameIds": ["1486043520954271062"] }

Response (decoded data):
[{
  "gameId": "1486043520954271062",
  "supplierName": "joyplay",
  "supplierId": "1486042272511296851",
  "supplierCode": "joyplay",
  "categoryCode": "100",
  "categoryName": "SLOT",
  "rtp": 0,
  "isGroupTrace": 0,
  "gameName": "TestGame",
  "freeGame": 2,
  "gameCode": "1",
  "rl": [2,3,4,1,0],
  "state": 1,
  "device": ["h5","ios","android","pc"],
  "categoryId": "1440017230707294493",
  "trialPlay": 0
}]
```

#### 2.A.4 super86 推荐相关游戏（与我们无关）

```bash
POST https://api-proxy.buyacard.cc/api/pw-admin/cw/v0/user/game/recommend
Body (raw): { "gameId": "1486043520954271062" }
Response: empty []
```

---

### 2.B joyplay iframe 内部 → joyplay 后端（这是我们要参考的协议设计）

域名：`https://d61rcnc408vl5.cloudfront.net/game/...`（joyplay 后端 CloudFront 反代）

来源：joyplay 游戏 iframe 加载后内部调用。

#### 共同 header 协议（所有 6 个端点都用）

```
sign: <短 JWT token>           ← 鉴权凭证（URL ?token= 同一个值）
platformid: 533xp2gkz9g8l7fr44u9  ← 上游平台 appKey
game_id: 1                      ← joyplay 内部游戏 ID
lang: zh-CN                    ← 语言
platform: iOS                  ← 设备 OS
model: iPhone                  ← 设备型号
ext: 0                         ← 扩展位
mini: 0                        ← mini 模式
antitoken;                     ← 空占位
expire_at;                     ← 空占位
open_id;                       ← 空占位
partner_id;                    ← 空占位
refresh_token;                 ← 空占位
roomid;                        ← 空占位
service_node;                  ← 空占位
origin: https://joyplay.cn
referer: https://joyplay.cn/
```

#### 6 个端点

```
POST /game/game/getSdkInfo   → SDK 元数据
POST /game/game/init         → 初始化游戏会话
POST /game/game/user         → 当前用户信息
POST /game/slot/odds         → 老虎机赔率（joyplay 专属）
POST /game/slot/moment       → 老虎机一次摇（joyplay 专属）
POST /game/slot/getConfig    → 老虎机配置（joyplay 专属）
```

→ 我们 2048 不抄 `/game/slot/...`，写自己的 `/game/2048/...`

---

### 2.C 实拍：super86 真实 redirect 我们 giant2048 的 URL

**完整 URL**（玩家点击 super86 列表的 giant2048 时实际收到）：

```
https://giant-2048.pages.dev/?token=<super86 长 JWT>&cid=1.1777270777927.25e8a582.o9XcuHC3LSQfS2qJeLKbOBB5-VOrSlOpt8xtJT_DwoVYrSn2egLjFacHoyf4YCWeSJinoYNV9XWtWB4ETKAPKw&language=en-US
```

**super86 的"长 JWT"完整值**：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdGYiLCJrb2xVc2VySWQiOiIxMTAxMjE4NCIsImdlbmRlciI6IjAiLCJpcCI6IjJhMDk6YmFjNTo0MzA1OjEwMDA6OjE5ODoxMWUiLCJhdmF0YXIiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKTkxRYjM3OTVqcXdvWEhUVEZ0VGpwcXJtcjh1VGRMVVNmRVN5QnFBQ3NUV19VOFJhdj1zOTYtYyIsImZhbWlseUlkIjoiMCIsImxvZ2luVGltZSI6IjE3NzcyNzQ0NTAwODMiLCJ1c2VyX2NvbnN1bWVfbGV2ZWwiOiIwIiwiYXBwSWQiOiIxMjEiLCJkb21haW4iOiJzdXBlcjg2LmNjIiwibmlja25hbWUiOiJ3IGphbWVzIiwic2l0ZUlkIjoiMTA2MDQxMDQxMTAwOSIsImNsaWVudCI6IjIiLCJpZCI6IjExMzI3MTU2IiwidXNlclR5cGUiOiIwIiwidmlwIjoiMCIsInVzZXJuYW1lIjoiMTEzMjcxNTYiLCJjaWQiOiIxLjE3NzcyNzA3Nzc5MjcuMjVlOGE1ODIubzlYY3VIQzNMU1FmUzJxSmVMS2JPQkI1LVZPclNsT3B0OHh0SlRfRHdvVllyU24yZWdMakZhY0hveWY0WUNXZVNKaW5vWU5WOVhXdFdCNEVUS0FQS3ciLCJmYW1pbHlDcmVhdG9yIjoibnVsbCIsImV4cCI6MTc4MzMyMjQ1MH0.vYE1cSKcC8zjld-nFcqqK6yC3oEhCZsQrOBvu48t048
```

**JWT 头**：`{"alg":"HS256","typ":"JWT"}`

**JWT payload（base64 解码后）**：
```json
{
  "sub": "atf",
  "kolUserId": "11012184",
  "gender": "0",
  "ip": "2a09:bac5:4305:1000::198:11e",
  "avatar": "https://lh3.googleusercontent.com/a/ACg8ocJNLQb3795jqwoXHTTFtTjpqrmr8uTdLUSfESyBqACsTW_U8Rav=s96-c",
  "familyId": "0",
  "loginTime": "1777274450083",
  "user_consume_level": "0",
  "appId": "121",
  "domain": "super86.cc",
  "nickname": "w james",
  "siteId": "10604104110009",
  "client": "2",
  "id": "11327156",
  "userType": "0",
  "vip": "0",
  "username": "11327156",
  "cid": "1.1777270777927.25e8a582...",
  "familyCreator": "null",
  "exp": 1783322450
}
```

**字段说明**（推测）：
- `id` / `username`：玩家 super86 user ID（**注意：不是 `userId`**）
- `kolUserId`：推广员/KOL ID
- `appId`：super86 给我们 giant2048 分配的 app ID（"121"）
- `domain`：来源平台域名（"super86.cc"）
- `nickname`：玩家昵称
- `avatar`：玩家头像 URL
- `cid`：客户端会话 ID（与 URL `?cid=` 一致）
- `loginTime`：毫秒级登录时间戳
- `exp`：**秒级** Unix 时间戳（超过 1 天后过期）—— 注意 vs 我们之前 V1 用的毫秒级 `exp` 不同
- `sub`：subject = "atf"（含义未知）
- `siteId` / `client` / `gender` / `ip` / `vip` / `family*` / `userType`：super86 内部分类字段

**该 URL 在浏览器打开后**：
- 玩家进入 `giant-2048.pages.dev` iframe
- 当前生产 game 端只解析 `?userId=`，**不解析 `?token=`** → 实际不会调 `/api/start-game`
- 我们当前的 V1 代码尝试用我们自己的 `verifyGameToken` 解 super86 的 token → **签名不匹配 → 401**
- → 玩家看到的是空棋盘（截图：标题 "Bingo84"、巨人头、空 5×5 格子、底下糖果 "16"/"2"）

**你给我看的截图证据**：
- `super86.cc/game` 页面（图1）：giant2048 已上架在 Mini-Games 列表
- `super86.cc/play?gameId=1498325535736990754`（图2）：iframe 显示空棋盘 + DevTools Network 看到 super86 的 `enter` 请求返回 `data.url` 是我们的 iframe URL

---

### 2.D super86 提供给我们的"游戏供应商对接"接口文档（8 个）

来源：你回家前发我看的截屏列表（**没给我详细 request/response，只给了路径**）。

域名（推测）：`https://game-center.pwtk.cc/game-proxy/...`（你提到的 base URL）

```
POST /game-proxy/user/token/check         → 用户 token 校验   ⭐⭐⭐ 我们必须调
POST /game-proxy/user/balance              → 获取用户余额
POST /game-proxy/user/score/change         → 用户积分变更
POST /game-proxy/user/game/exit            → 用户退出游戏
POST /game-proxy/user/game/trace           → 用户开启游戏回调（开局通知）
POST /game-proxy/a0/list                   → A0 列表
POST /game-proxy/id/generate                → 获取分布式 id
POST /game-proxy/user/score/getOrderDetail  → 订单状态查询
```

→ **没给 request/response 字段** —— 回家务必先找 super86 拿完整接口文档（含 curl 示例 + 错误码 + 鉴权方式）。

---

### 2.E super86 自己的内部 balance 接口（你给我的 getbalance.http 留底）

文件：`reference/http/getbalance.http`

```bash
POST https://api-proxy.buyacard.cc/api/pw-admin/cw/v0/account/balance
Headers:
  cid, client: C_H5, device: h5, domain: super86.cc
  id_a: XjCwPPy32Da09gztLPdo
  language: en-US
  origin: https://super86.cc, referer: https://super86.cc/
  pwa: 0, rl: 0, slk: 26047
  token: <长 JWT，跟 2.C 那个一致>
Body: ?
```

→ 这是 super86 自己的用户余额接口，**与我们对接无关**，留作 reference 看 token 在 super86 体系怎么流通。

---

## 3️⃣ 架构演化轨迹（重要！别走回头路）

### V1 架构（已实现，但**前提错了**）

**思路**：我们暴露 `/game-center/game/enter`，平台调我们这个接口，**我们签 JWT** → 返回 iframe URL → iframe 用我们签的 JWT 调 `/game/*`。

**对应 joyplay**：joyplay 自己的 `/game/enter` 由 super86 调用，joyplay 签 token。

**为什么前提错了**：观察 2.C 的真实 URL —— super86 **直接签好 JWT** 把玩家 redirect 给我们，**不会调用我们的 enter 接口**。super86 在它自己的内部代理（`api-proxy.buyacard.cc`）调它自己的 `/game-api/game-center/game/enter`，那是 super86 自己的"用户登录态产出 game iframe URL"流程，里面签 JWT 的密钥是 super86 自己的。

**已实现的 V1 代码状态**（仍在仓库里，准备改造或删除）：
- workers `POST /game-center/game/enter`（接收 X-Platform-Key + userId/kolUserId/...）
- workers `signGameToken` / `verifyGameToken`（用我们自己的 `GAME_JWT_SECRET`）
- workers 中间件 `requireGameSign` 用我们自己的密钥验签
- workers `POST /game/game/{getSdkInfo,init,user}` + `POST /game/2048/{next-token,action,update-score,end-game}`
- 删掉旧 `/api/start-game` 等
- DB schema：games 表去 fingerprint，加 kol_user_id/platform_id/app_id/token_jti
- DB schema：新增 platform_keys 表
- game 端：`apps/game/src/utils/api.ts` 重写成 `/game/...` + sign header 协议
- game 端：`GameScene` 解 `?token=`，用 `setGameToken()` 缓存，所有调用塞 sign header
- game 端：删 `apps/game/src/utils/fingerprint.ts`
- admin 端：types Game 删 fingerprint 加 4 个 platform 字段
- admin 端：GamesPage 列表 + 详情 UI 改成显示 user_id / KOL / Platform / App / JTI
- admin 端：StatsPage / SequenceAnalysisSheet 文案 fingerprint → user_id

### V2 架构（**真实路径**，待实现）

**思路**：

1. super86 自己签 JWT 直接 redirect 玩家到我们 iframe（已发生）
2. 我们前端拿 URL 上的 `?token=<super86 JWT>`，发给我们的后端新接口（暂命名 `/game/auth/login` 或类似）
3. **我们后端调 super86 的 `/game-proxy/user/token/check`** 验证这个 token 有效 + 拿到 super86 用户信息
4. 验证通过 → users 表 upsert + **我们自己签短 token** 返回给前端
5. 前端用我们的内部短 token 调 `/game/*` 后续接口（这部分跟 V1 一样）

**关键点**：
- `/game-center/game/enter` 接口**作废**（super86 不调）
- `signGameToken` / `verifyGameToken` **保留**，但改成：用 super86 远程验证后再签发我们的内部 token
- 中间件 `requireGameSign` **保留**：仍验我们的内部短 token
- DB schema **不动**（已经能支撑）
- super86 长 JWT **不本地验签**（HS256 无密钥），通过 `/user/token/check` 远程验

**前端表现**：
- 玩家被 super86 redirect 到 `https://giant-2048.pages.dev/?token=<super86 JWT>&cid=...&language=...`
- 我们前端 `GameScene.create()`：
  1. 解 URL `?token=<super86 JWT>`
  2. POST `/game/auth/login` body=`{ platformToken: <super86 JWT> }`
  3. 拿响应里的 `{ token: <我们的内部短 token>, user: {...} }`
  4. `setGameToken(我们的内部 token)`
  5. 调 `gameInit()` 等正常流程
- 玩家看到：和现在直接玩 giant-2048.pages.dev 一样，只是 user_id 来自 super86

### V1 vs V2 改动清单

| 模块 | V1 现状 | V2 要做 |
|-----|---------|---------|
| `/game-center/game/enter` | 已写 | **删** 或保留作 mock 测试 |
| `platform_keys` 表 + `X-Platform-Key` 中间件 | 已写 | **删**（super86 不调我们这接口） |
| 我们的 `signGameToken` | 已写 | **保留**（验完 super86 后我们仍签内部短 token） |
| 我们的 `verifyGameToken` + `requireGameSign` 中间件 | 已写，验我们的密钥 | **保留** |
| `/game/auth/login` 新接口 | ❌ | **新加**：接 super86 token → 远程调 `/user/token/check` → 签发内部 token |
| super86 调用客户端（fetch wrapper） | ❌ | **新加**：调 `https://game-center.pwtk.cc/game-proxy/...` |
| game 端 `setGameToken(URL ?token)` | 已写，但 token 是 super86 的 | **改**：先 `/game/auth/login` 换成我们的内部 token，再 `setGameToken` |

---

## 4️⃣ 当前代码状态（V1 已实现，未提交）

### 4.A 文件清单（已修改 / 已新增 / 已删除）

```
M  apps/admin/src/App.tsx                                       (路由 + 用户管理菜单)
M  apps/admin/src/api/types.ts                                  (Game 加 platform 字段，删 fingerprint)
M  apps/admin/src/components/config/AdminV4_Spreadsheet.tsx     (Plan stage 编辑器手动模式)
M  apps/admin/src/pages/ConfigPage.tsx                          (URL 路由 ?plan&tab&section)
A  apps/admin/src/pages/DistributionPanel.tsx                   (新增：全局分布配置 panel)
M  apps/admin/src/pages/GamesPage.tsx                           (列改 user_id，详情加 platform 字段)
M  apps/admin/src/pages/PlanAnalysisPage.tsx                    (删 PLAN ID 列)
M  apps/admin/src/pages/SequenceAnalysisSheet.tsx               ("fingerprint"→"user_id")
M  apps/admin/src/pages/StatsPage.tsx                           (hint "按 fingerprint"→"按 user_id")
A  apps/admin/src/pages/UsersPage.tsx                           (新增：用户管理 CRUD)
M  apps/game/src/scenes/GameScene.ts                            (URL 解析改 ?token=)
M  apps/game/src/systems/ActionRecorder.ts                      (init() 不再传 fingerprint/userId)
M  apps/game/src/utils/api.ts                                   (重写成 /game/* + sign header)
D  apps/game/src/utils/fingerprint.ts                           (删除)
M  apps/workers/schema.sql                                      (games 表去 fingerprint 加 4 列；platform_keys 表)
M  apps/workers/src/index.ts                                    (V1 架构：sign/verify GameToken，/game-center/game/enter, /game/* 路由)
A  reference/http/getbalance.http                               (super86 balance curl 留底)
```

### 4.B Workers 关键文件位置

`apps/workers/src/index.ts` 关键代码段（行号大致）：
- L54-91：admin JWT helpers（**保留**）
- L92-150：**game JWT helpers**（V1 写的，V2 保留）`signGameToken` / `verifyGameToken` / `b64urlEncode/Decode` / `GAME_JWT_SECRET`
- L153-237：`getPlayableSequence(db, userId)` 优先级链（users 表 → distribution → 全局随机 → 现造）
- L298-380：**`/game-center/game/enter`** 业务入口（V2 要删/改）
- L381-510：**`/game/...` Hono 子 app**（V2 保留，新加 `/game/auth/login`）
- L511-...：原 admin 代码（不动）

### 4.C 数据库 schema 当前状态

`apps/workers/schema.sql`：

```sql
-- sequence_plans / plan_stages / generated_sequences 不变

-- games 表（V1 已改）
CREATE TABLE games (
  game_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '',           -- super86 的 id 字段
  kol_user_id TEXT NOT NULL DEFAULT '',       -- super86 的 kolUserId
  platform_id TEXT NOT NULL DEFAULT '',       -- super86 的 domain
  app_id TEXT NOT NULL DEFAULT '',            -- super86 的 appId
  token_jti TEXT NOT NULL DEFAULT '',         -- 我们签的内部 token jti（V2 保留）
  seed, step, score, sign, status,
  sequence_plan_id, generated_sequence_id, sequence_index,
  end_reason, ended_at, last_update_at, created_at,
  ...
);

-- 新建 platform_keys（V1 用，V2 可能删）
CREATE TABLE platform_keys (
  key TEXT PRIMARY KEY,
  platform_id TEXT NOT NULL,
  note, enabled, created_at, updated_at
);

-- users 表（V1 V2 通用）：手动 + auto-INSERT 玩家配置
-- distribution 表（V1 V2 通用）：用户没分配 sequence 时按权重随机
```

### 4.D 本地 D1 状态

- 本地 D1 已**清空 + 用最新 schema 重建**
- 内含：1 条 platform_keys (`test_key_super86` → `super86.cc`)、1 个 plan、1 个 sequence、若干测试 games
- 远程 D1：**未同步新 schema**（V1 还没部署生产）

### 4.E 本地 dev server 状态

```
http://localhost:7001  giant-2048 game (frontend, vite dev, VITE_DEBUG=0)
http://localhost:7004  giant-2048-admin (frontend, vite dev)
http://localhost:8787  giant-2048-api (workers dev, wrangler)
```

dev server 是否还活着取决于回家拉代码后重启。

---

## 5️⃣ V1 架构端到端可工作的证据（对回家继续 debug 有帮助）

以下 cURL 序列在**当前未提交代码**的本地 8787 上**全部 200 通过**，验证 V1 后端工作正常：

```bash
# 1. admin login
TOKEN=$(curl -s -X POST http://localhost:8787/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# 2. 准备：插入测试 platform key
NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
npx wrangler d1 execute giant-2048-scores --local \
  --command "INSERT INTO platform_keys (key, platform_id, note, enabled, created_at, updated_at) \
  VALUES ('test_key_super86', 'super86.cc', 'test', 1, '$NOW', '$NOW');"

# 3. 创建 plan + sequence（用 admin token）
PLAN=$(curl -s -X POST http://localhost:8787/api/admin/sequence-plans \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"P","description":"smoke","stages":[{"name":"S1","length":30,"probabilities":{"2":50,"4":50},"stage_order":1}]}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
curl -s -X POST http://localhost:8787/api/admin/generate-sequence \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"sequence_plan_id\":\"$PLAN\"}"

# 4. V1 平台入口：/game-center/game/enter
curl -X POST http://localhost:8787/game-center/game/enter \
  -H "Content-Type: application/json" \
  -H "X-Platform-Key: test_key_super86" \
  -H "X-Game-Origin: http://localhost:7001" \
  -d '{"userId":"u_test","kolUserId":"kol_test","appId":"121","lang":"en-US"}'
# 响应:
# {
#   "url": "http://localhost:7001/?token=<我们签的JWT>&platformid=test_key_super86&lan=en-US&ext=0",
#   "config": { "env": "production" },
#   "openType": 0, "screen": 1
# }

# 5. 拿 token 调 /game/* 接口（注意 sign header）
TOKEN_JWT="<上一步返回的 JWT>"
curl -X POST http://localhost:8787/game/game/getSdkInfo -H "sign: $TOKEN_JWT"
# {"apiVersion":"1.0","sdkVersion":"0.1.0","features":{"combo":true,"stones":true,"rotation":true}}

curl -X POST http://localhost:8787/game/game/user -H "sign: $TOKEN_JWT"
# {"userId":"u_test","kolUserId":"kol_test","platformId":"super86.cc","appId":"121"}

curl -X POST http://localhost:8787/game/game/init -H "sign: $TOKEN_JWT"
# {"gameId":"g_xxx","tokens":[...],"sequencePlanId":"...","generatedSequenceId":"...","sign":"..."}

# games 表 SELECT 应该有：user_id="u_test", kol_user_id="kol_test", platform_id="super86.cc", app_id="121"
```

---

## 6️⃣ V2 实现的步骤（回家继续）

### 6.A 必须先拿到的信息（**block 进度**）

**优先级 P0**：找 super86 提供：

1. **完整 `/game-proxy/user/token/check` 文档**（最关键）：
   - 完整 URL（确认 base 是不是 `https://game-center.pwtk.cc/game-proxy/`）
   - 请求 header（要不要 API key？签名？）
   - 请求 body 字段（只是 `token`，还是要 `appId/cid/platformId`）
   - 响应字段（有效时返回什么 JSON 结构？userId 在哪个字段？）
   - 错误码示例

2. **我们调用 super86 的鉴权方式**：
   - 8 个 `/game-proxy/...` 接口需要我们带什么 header？
   - 是 API key（super86 给我们一个供应商密钥）？
   - 还是签名（HMAC + 我们和 super86 共享密钥）？
   - 还是 IP 白名单？

3. **业务需要哪些接口**：
   - `/user/balance` 我们要不要查？2048 是免费玩还是要扣 super86 积分？
   - `/user/score/change` 结算时要不要给 super86 上报积分变更？
   - `/user/game/trace` 开局时要不要通知 super86？
   - `/user/game/exit` 玩家关游戏时要不要通知？
   - `/id/generate` 我们生成游戏 id 是不是要用他们的分布式 id？

4. **super86 token 字段映射确认**：
   - 我们 `games.user_id` ← `payload.id` 还是 `payload.username`？（截图里两者都是 "11327156"）
   - 还要不要存 `nickname` / `avatar` / `cid` 到 users 表？

### 6.B V2 编码工作（**等 P0 文档拿到后**）

#### 6.B.1 workers 后端（`apps/workers/src/index.ts`）

新增：

```ts
// super86 远程客户端
const SUPER86_BASE = 'https://game-center.pwtk.cc';

interface Super86TokenCheckResponse {
  // 待 super86 文档确认字段
  valid?: boolean;
  userId?: string;
  // ...
}

async function super86CheckToken(platformToken: string): Promise<Super86TokenCheckResponse | null> {
  // 待 super86 文档确认 request 格式
  const res = await fetch(`${SUPER86_BASE}/game-proxy/user/token/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' /* + super86 给的鉴权 */ },
    body: JSON.stringify({ token: platformToken /* + 可能的额外字段 */ }),
  });
  if (!res.ok) return null;
  return await res.json();
}

// 新接口：前端拿 super86 token 来换我们自己的内部 token
app.post('/game/auth/login', async (c) => {
  const { platformToken } = await c.req.json<{ platformToken: string }>();
  if (!platformToken) return c.json({ error: 'Missing platformToken' }, 400);

  // 1. 远程 RPC 验证 super86 token
  const checked = await super86CheckToken(platformToken);
  if (!checked || !checked.valid) return c.json({ error: 'Invalid platform token' }, 401);

  // 2. 用 super86 返回的 user 信息 upsert users 表
  const userId = checked.userId!;  // 字段名待文档确认
  const kolUserId = (checked as any).kolUserId || '';
  const appId = (checked as any).appId || '';
  const platformId = 'super86.cc';  // 或从文档拿

  // upsert users 表（同 V1 逻辑）
  // ... 复用 /game-center/game/enter 里的 upsert 代码

  // 3. 签发我们的内部短 token
  const internalToken = await signGameToken({ userId, kolUserId, platformId, appId });

  return c.json({
    token: internalToken,
    user: { userId, kolUserId, platformId, appId },
  });
});

// 删除 / 注释 /game-center/game/enter（不再需要）
// 删除 / 注释 platform_keys 相关代码
```

#### 6.B.2 game 前端（`apps/game/src/scenes/GameScene.ts` + `apps/game/src/utils/api.ts`）

```ts
// api.ts 新增
export async function authLogin(platformToken: string): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/game/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platformToken }),
  });
  if (!res.ok) throw new Error(`auth/login failed: ${res.status}`);
  return await res.json();
}

// GameScene.create() 改：
const urlParams = new URLSearchParams(window.location.search);
const platformToken = urlParams.get('token') || '';
if (!IS_DEBUG && platformToken) {
  // 先用 super86 token 换我们的内部 token
  const { token: internalToken, user } = await authLogin(platformToken);
  setGameToken(internalToken);
  this.initBackend();
} else if (!IS_DEBUG) {
  // 没 token 走"占位页"或拒绝
  console.error('Missing platform token');
}
```

#### 6.B.3 admin 前端

无需改动（已经能从 games 表 user_id / kol_user_id / platform_id / app_id / token_jti 字段读出来展示）。

### 6.C 联调流程

1. 拿 super86 测试 token（你应该能从 super86 后台 / 测试账号拿到一个）
2. 本地 curl `POST http://localhost:8787/game/auth/login` body=`{"platformToken":"<super86 token>"}` → 应返回 `{token, user}`
3. 拿到 token 后调 `/game/game/init` 应正常开局
4. 浏览器打开 `http://localhost:7001/?token=<super86 token>&cid=...&language=en-US` → 应该自动调 auth/login + 开局
5. admin → 游戏局 → 看到 user_id 是 super86 的 id（"11327156" 之类）

---

## 7️⃣ 部署注意事项（**回家务必谨慎**）

### ⚠️ 不要直接部署 V1 代码到生产

原因：
- 当前生产 `https://giant-2048.pages.dev/` 还是更早的版本（解 `?userId=`）
- 当前生产 workers 还有 `/api/start-game` 等老接口
- super86 实拍：玩家进来时带的是 super86 自己的 long JWT，不是我们 V1 签的 short JWT
- 如果直接部署 V1 → super86 redirect 来的玩家会**全部 401**（V1 的 `verifyGameToken` 验不过 super86 的 JWT）

→ 必须等 V2 完成 + super86 token check 接口对接成功 + 本地端到端测试通过，**才能**部署生产。

### ⚠️ 本地工作的 commit 在 `feature/yibu/connect-game-platform` 分支

- 已经有提交记录的分支
- 不在 main 上，安全
- 部署 workers / pages 都是从 main 触发，本分支自动不部署

### 部署生产步骤（V2 完成后）

1. 切换到 main
2. 合并 `feature/yibu/connect-game-platform`
3. 远程 D1 重建 schema（需明示同意，因为会清生产数据）：
   ```bash
   cd apps/workers
   npx wrangler d1 execute giant-2048-scores --remote \
     --command "DROP TABLE IF EXISTS distribution; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS scores; DROP TABLE IF EXISTS games; DROP TABLE IF EXISTS generated_sequences; DROP TABLE IF EXISTS plan_stages; DROP TABLE IF EXISTS sequence_plans; DROP TABLE IF EXISTS platform_keys;"
   npx wrangler d1 execute giant-2048-scores --remote --file=schema.sql
   ```
4. 部署 workers：`cd apps/workers && npx wrangler deploy`
5. 部署 admin：`cd apps/admin && pnpm build && npx wrangler pages deploy dist --project-name=giant-2048-admin`
6. 部署 game prod：`cd apps/game && pnpm build && npx wrangler pages deploy dist --project-name=giant-2048`
7. 部署 game debug：`cd apps/game && pnpm build:debug && npx wrangler pages deploy dist --project-name=giant-2048-debug`
8. 用 super86 真实 redirect 测一遍

---

## 8️⃣ 今天讨论中其他做完但跟平台集成无关的事（也都已 commit / 待 commit）

- **Plan stage 编辑器手动模式**（取消自动均分 / 等比缩放，红字提示总和不为 100%，但允许保存）—— `AdminV4_Spreadsheet.tsx`
- **PlanAnalysisPage 删 PLAN ID 列**（保留 PLAN NAME） —— `PlanAnalysisPage.tsx`
- **凡是显示 sequence_id 的地方全换成 sequence_name**（5 处）—— PlanAnalysisPage / GamesPage / SequenceAnalysisSheet / DetailVariantA / SequenceEditSheet
- **sequence_name 必填 + plan 内唯一 + 实时校验**（SequenceEditSheet 加 debounce 300ms 检查）
- **sequence_name 默认生成改成 `{plan}_seq_{12位 uuid}`**（之前是完整 UUID 太长）
- **DistributionPanel 权重输入支持清空**（用 string draft state 替代 number 强绑定）
- **新增 admin 用户管理菜单 `/users`**：UsersPage CRUD
- **配置页左栏顶部加"全局分布"快捷入口** → 切到 DistributionPanel
- **admin 接 react-router-dom**：路径 `/stats /analysis /game-round /users /settings /login`
- **admin 401 自动跳 /login**：next 参数支持登录后跳回原页面
- **admin 子状态用 query 参数**：`?plan=&tab=&section=&sequence=&status=`
- **暂停面板 home 按钮跳转崩溃修复**：ComboChainEffect.clearRuntimeState 加 `.active` 守卫
- **石头作为上靠屏障**：applyGravityUp 遇到石头跳过 + 中断该列连锁
- **debug 按钮 hit-area 可视化**：`showButtonHitAreaDebug = import.meta.env.DEV`，本地 dev 自动开
- **暂停面板 y -214 微调**

---

## 9️⃣ 回家恢复 checklist（按这个顺序操作）

1. **拉代码**：
   ```bash
   cd <repo>
   git fetch origin
   git checkout feature/yibu/connect-game-platform
   git pull
   ```

2. **看这份文档**：`reference/docs/PLATFORM_INTEGRATION_WIP.md`（就是本文）

3. **跑 3 个本地 dev**：
   ```bash
   cd apps/workers && pnpm dev &
   cd apps/admin && pnpm dev &
   cd apps/game && pnpm dev &
   ```

4. **重建本地 D1**：
   ```bash
   cd apps/workers
   npx wrangler d1 execute giant-2048-scores --local --command "DROP TABLE IF EXISTS distribution; DROP TABLE IF EXISTS users; DROP TABLE IF EXISTS scores; DROP TABLE IF EXISTS games; DROP TABLE IF EXISTS generated_sequences; DROP TABLE IF EXISTS plan_stages; DROP TABLE IF EXISTS sequence_plans; DROP TABLE IF EXISTS platform_keys;"
   npx wrangler d1 execute giant-2048-scores --local --file=schema.sql
   ```

5. **跑一遍 V1 cURL 序列**（第 5 节里）确认本地 V1 还能 work

6. **找 super86 拿 8 个接口的完整文档**（最重要！）

7. **开干 V2**（第 6.B 节）

---

## 🔟 待确认的设计问题（回家逐个回答）

> 这些是从对话中累计 unsigned 的问题，用来推进 V2 实现：

1. **super86 token 字段 → 我们 user_id 映射**：用 `payload.id` 还是 `payload.username`？
2. **存哪些丰富字段**：nickname / avatar / ip / cid / domain / loginTime 要不要存 users 表？
3. **`/user/balance` 接口接不接**：2048 是免费游戏还是要扣 super86 积分？
4. **`/user/score/change` 接口接不接**：结算时给 super86 上报积分变更？
5. **`/user/game/trace` 接口接不接**：开局时通知 super86？
6. **`/user/game/exit` 接口接不接**：玩家关游戏时通知？
7. **`/id/generate` 是否用 super86 的分布式 id**：还是我们自己 `generateGameId()`？
8. **本地是否有 super86 测试账号 + 测试 token**：能让我们本地直接联调？还是要用 mock？
9. **super86 给我们的供应商鉴权密钥 / API key**：调 `/game-proxy/...` 时怎么鉴权？
10. **super86 token 过期了怎么办**：玩家长时间在 iframe 里挂着，token 过期 → 我们要不要自动刷新？还是直接 401 让 super86 把玩家踢出去？

---

## 📎 11. 附：关键文件路径速查

```
apps/workers/src/index.ts              ← V1 主代码
apps/workers/schema.sql                ← DB schema
apps/workers/wrangler.toml             ← 环境配置（有 D1 binding）
apps/game/src/scenes/GameScene.ts      ← 游戏入口 + URL 解析 + 调 backend
apps/game/src/systems/ActionRecorder.ts ← 后端 action recorder
apps/game/src/utils/api.ts             ← /game/* 调用层 + setGameToken
apps/admin/src/App.tsx                 ← admin 路由
apps/admin/src/pages/GamesPage.tsx     ← 游戏局列表 + 详情
apps/admin/src/pages/UsersPage.tsx     ← 用户管理
apps/admin/src/pages/DistributionPanel.tsx ← 全局分布

reference/docs/PLATFORM_INTEGRATION_WIP.md ← 本文档（自包含恢复用）
reference/http/getbalance.http              ← super86 balance curl 留底

.claude/plans/jiggly-hatching-blossom.md   ← 本地 plan 副本（可能与本文同步）
```
