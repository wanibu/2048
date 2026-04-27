// Giant 2048 — Cloudflare Workers 后端（Hono 版）
// 职责：序列配置管理、局管理、排行榜、Admin

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateSequenceFromPlan, PlanStageRow } from './sequence-config';

type Bindings = { DB: D1Database };
type SequenceToken = `${number}` | 'stone';
interface SequenceAnalysisResp {
  sequence_id: string;
  name: string;
  plan_id: string | null;
  plan_name: string | null;
  created_at: string;
  status: 'enabled' | 'disabled';
  playing_players: number;
  playing_games: number;
  today_players: number;
  hour_games: number;
  games_total: number;
  games_finished: number;
  unique_players: number;
  score: { avg: number | null; median: number | null; min: number | null; max: number | null };
  duration_sec: { avg: number | null; median: number | null };
  step: { avg: number | null; median: number | null };
  end_reasons: Record<string, number>;
}

// ================= 工具函数 =================

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function chainSign(prevSign: string, action: {
  type: 'shoot' | 'rotate' | 'direct_merge';
  col?: number;
  value?: number;
  direction?: 'cw' | 'ccw';
  resultValue?: number;
}, step: number): Promise<string> {
  return sha256(prevSign + JSON.stringify({ step, ...action }));
}

async function initSign(gameId: string): Promise<string> {
  return sha256(`giant2048_game_${gameId}`);
}

// ================= Admin 签名 token =================
// 签名 token 格式：base64url(payload).hexsig
// payload = { user, iat, exp }，签名 = sha256(payloadB64 + '.' + ADMIN_SECRET)
const ADMIN_SECRET = 'giant2048_admin_signing_key_v1'; // TODO: 移到 wrangler secret
const ADMIN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function b64urlEncode(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  return atob(padded);
}

async function signAdminToken(user: string): Promise<string> {
  const now = Date.now();
  const payload = JSON.stringify({ user, iat: now, exp: now + ADMIN_TOKEN_TTL_MS });
  const payloadB64 = b64urlEncode(payload);
  const sig = await sha256(payloadB64 + '.' + ADMIN_SECRET);
  return `${payloadB64}.${sig}`;
}

async function verifyAdminToken(token: string): Promise<{ user: string; exp: number } | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = await sha256(payloadB64 + '.' + ADMIN_SECRET);
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64)) as { user?: string; exp?: number };
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (typeof payload.user !== 'string') return null;
    return { user: payload.user, exp: payload.exp };
  } catch {
    return null;
  }
}

// ================= Game iframe 签名 token（HS256-style）=================
// 给上游平台 redirect 用户进 iframe 时签发，iframe 后续所有 /game/... 调用放在 sign: header
// payload = { jti, userId, kolUserId, platformId, appId, iat, exp(ms) }
const GAME_JWT_SECRET = 'giant2048_game_jwt_secret_v1'; // TODO: 移到 wrangler secret
const GAME_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 小时

interface GameTokenPayload {
  jti: string;
  userId: string;
  kolUserId: string;
  platformId: string;
  appId: string;
  iat: number;
  exp: number;
}

async function signGameToken(payload: Omit<GameTokenPayload, 'iat' | 'exp' | 'jti'> & Partial<Pick<GameTokenPayload, 'iat' | 'exp' | 'jti'>>): Promise<string> {
  const now = Date.now();
  const full: GameTokenPayload = {
    jti: payload.jti ?? crypto.randomUUID(),
    userId: payload.userId,
    kolUserId: payload.kolUserId,
    platformId: payload.platformId,
    appId: payload.appId,
    iat: payload.iat ?? now,
    exp: payload.exp ?? (now + GAME_TOKEN_TTL_MS),
  };
  const payloadB64 = b64urlEncode(JSON.stringify(full));
  const sig = await sha256(payloadB64 + '.' + GAME_JWT_SECRET);
  return `${payloadB64}.${sig}`;
}

async function verifyGameToken(token: string): Promise<GameTokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expectedSig = await sha256(payloadB64 + '.' + GAME_JWT_SECRET);
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(b64urlDecode(payloadB64)) as Partial<GameTokenPayload>;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    if (typeof payload.userId !== 'string' || typeof payload.jti !== 'string') return null;
    return {
      jti: payload.jti,
      userId: payload.userId,
      kolUserId: payload.kolUserId ?? '',
      platformId: payload.platformId ?? '',
      appId: payload.appId ?? '',
      iat: payload.iat ?? 0,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

function generateGameId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `g_${timestamp}_${random}`;
}

function sliceTokens(
  sequenceData: string,
  startIndex: number,
  count: number
): { tokens: SequenceToken[]; newIndex: number } {
  const allTokens = JSON.parse(sequenceData) as Array<string | number>;
  const end = Math.min(startIndex + count, allTokens.length);
  const tokens = allTokens.slice(startIndex, end).map(t => String(t) as SequenceToken);
  return { tokens, newIndex: end };
}

async function createGeneratedSequenceFromRandomPlan(db: D1Database): Promise<{
  generatedSequenceId: string;
  sequencePlanId: string;
  sequence: SequenceToken[];
} | null> {
  const plan = await db.prepare(
    'SELECT id FROM sequence_plans ORDER BY RANDOM() LIMIT 1'
  ).first() as Record<string, unknown> | null;

  if (!plan) return null;

  const stagesResult = await db.prepare(
    `SELECT id as stage_id, name, length, probabilities, stage_order
     FROM plan_stages
     WHERE sequence_plan_id = ?
     ORDER BY stage_order ASC`
  ).bind(plan.id as string).all<PlanStageRow>();

  const stages = stagesResult.results || [];
  if (stages.length === 0) return null;

  const generatedSequenceId = crypto.randomUUID();
  const sequence = await generateSequenceFromPlan(stages) as SequenceToken[];
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO generated_sequences
     (id, sequence_plan_id, sequence_name, sequence_note, sequence_data, sequence_length, status, created_at, updated_at)
     VALUES (?, ?, '', '', ?, ?, 'enabled', ?, ?)`
  ).bind(
    generatedSequenceId,
    plan.id as string,
    JSON.stringify(sequence),
    sequence.length,
    now,
    now,
  ).run();

  return {
    generatedSequenceId,
    sequencePlanId: plan.id as string,
    sequence,
  };
}

// 选 sequence 优先级链：
//   1. users 表 WHERE user_id = ? → 命中且 sequence_id 非空 → 用之
//   2. distribution 表加权随机
//   3. 全局 enabled sequence 随机
//   4. 现造一条
async function getPlayableSequence(
  db: D1Database,
  userId: string = '',
): Promise<{
  generatedSequenceId: string;
  sequencePlanId: string;
}> {
  // 1. users 表：按 user_id 查（不限制唯一，取第一条）
  if (userId) {
    const userRow = await db.prepare(
      "SELECT sequence_id FROM users WHERE user_id = ? AND sequence_id != '' LIMIT 1"
    ).bind(userId).first() as Record<string, unknown> | null;
    if (userRow && userRow.sequence_id) {
      const seqId = userRow.sequence_id as string;
      const seq = await db.prepare(
        `SELECT id, sequence_plan_id FROM generated_sequences
         WHERE id = ? AND status = 'enabled' LIMIT 1`
      ).bind(seqId).first() as Record<string, unknown> | null;
      if (seq) {
        console.log(`[playable] users.user_id=${userId} → sequence ${seq.id}`);
        return {
          generatedSequenceId: seq.id as string,
          sequencePlanId: seq.sequence_plan_id as string,
        };
      }
      console.warn(`[playable] users 表 sequence_id=${seqId} 找不到对应 enabled sequence`);
    }
  }

  // 2. distribution 表加权随机
  const distRows = await db.prepare(
    `SELECT d.sequence_id, d.ratio, gs.sequence_plan_id
     FROM distribution d
     JOIN generated_sequences gs ON d.sequence_id = gs.id AND gs.status = 'enabled'`
  ).all();
  const distItems = (distRows.results || []) as Array<Record<string, unknown>>;
  if (distItems.length > 0) {
    const totalRatio = distItems.reduce((s, r) => s + ((r.ratio as number) || 0), 0);
    if (totalRatio > 0) {
      let pick = Math.random() * totalRatio;
      for (const r of distItems) {
        pick -= ((r.ratio as number) || 0);
        if (pick <= 0) {
          console.log(`[playable] distribution → sequence ${r.sequence_id}`);
          return {
            generatedSequenceId: r.sequence_id as string,
            sequencePlanId: r.sequence_plan_id as string,
          };
        }
      }
    }
  }

  // 3. 全局随机选一条 enabled sequence
  const generated = await db.prepare(
    `SELECT id, sequence_plan_id
     FROM generated_sequences
     WHERE status = 'enabled'
     ORDER BY RANDOM()
     LIMIT 1`
  ).first() as Record<string, unknown> | null;
  if (generated) {
    return {
      generatedSequenceId: generated.id as string,
      sequencePlanId: generated.sequence_plan_id as string,
    };
  }

  // 4. 完全没有 → 现造一条
  const created = await createGeneratedSequenceFromRandomPlan(db);
  if (!created) {
    throw new Error('No enabled generated sequence and no sequence plan available');
  }
  return {
    generatedSequenceId: created.generatedSequenceId,
    sequencePlanId: created.sequencePlanId,
  };
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function stats(nums: number[]) {
  if (nums.length === 0) return { count: 0, min: null, avg: null, median: null, p90: null, max: null, std: null, cv: null };
  const sorted = [...nums].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const avg = sum / sorted.length;
  const variance = sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / sorted.length;
  const std = Math.sqrt(variance);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg,
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    std,
    cv: avg > 0 ? std / avg : null,
  };
}

// ================= Hono App =================

const app = new Hono<{ Bindings: Bindings }>();

// 全局 CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 请求日志
app.use('*', async (c, next) => {
  const t0 = Date.now();
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;
  await next();
  const dur = Date.now() - t0;
  const status = c.res.status;
  const mark = status >= 500 ? '💥' : status >= 400 ? '⚠️ ' : '✓';
  console.log(`${mark} ${method} ${path} → ${status} (${dur}ms)`);
});

// 全局错误处理
app.onError((err, c) => {
  console.error('[onError]', err);
  return c.json({ error: 'Internal error' }, 500);
});

// ================= 公共游戏 API =================

// ================= 平台业务入口 =================
// POST /game-center/game/enter
// 上游聚合平台调用，鉴权头 X-Platform-Key
// 我们 upsert users，签发 JWT，返回 iframe URL
app.post('/game-center/game/enter', async (c) => {
  const platformKey = c.req.header('X-Platform-Key') || '';
  const db = c.env.DB;

  // 1. 平台 key 鉴权（platform_keys 表）
  if (!platformKey) return c.json({ error: 'Missing X-Platform-Key' }, 401);
  const keyRow = await db.prepare(
    'SELECT platform_id, enabled FROM platform_keys WHERE key = ?'
  ).bind(platformKey).first() as Record<string, unknown> | null;
  if (!keyRow || !keyRow.enabled) return c.json({ error: 'Invalid platform key' }, 401);
  const resolvedPlatformId = keyRow.platform_id as string;

  // 2. 入参
  const body = await c.req.json<{
    userId: string;
    kolUserId?: string;
    platformId?: string;
    appId?: string;
    lang?: string;
    returnUrl?: string;
  }>();
  const userId = (body.userId || '').trim();
  if (!userId) return c.json({ error: 'Missing userId' }, 400);
  const kolUserId = body.kolUserId || '';
  // 优先用 platform_keys.platform_id（权威）；body.platformId 仅作 hint
  const platformId = resolvedPlatformId || body.platformId || '';
  const appId = body.appId || '';
  const lang = body.lang || 'en-US';

  // 3. users 表 upsert（按 platform_id + user_id 复合）
  const existing = await db.prepare(
    'SELECT id FROM users WHERE platform_id = ? AND user_id = ? LIMIT 1'
  ).bind(platformId, userId).first() as Record<string, unknown> | null;
  const now = new Date().toISOString();
  if (!existing) {
    await db.prepare(
      `INSERT INTO users (id, kol_user_id, user_id, platform_id, sequence_id, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, '', '', ?, ?)`
    ).bind(crypto.randomUUID(), kolUserId, userId, platformId, now, now).run();
    console.log(`[game-enter] upsert user platform=${platformId} userId=${userId} kol=${kolUserId}`);
  } else if (kolUserId) {
    // 已存在 → 仅在传了 kolUserId 时回填（不覆盖）
    await db.prepare(
      "UPDATE users SET kol_user_id = ?, updated_at = ? WHERE id = ? AND kol_user_id = ''"
    ).bind(kolUserId, now, existing.id as string).run();
  }

  // 4. 签 JWT
  const token = await signGameToken({ userId, kolUserId, platformId, appId });

  // 5. 构造 iframe URL（appKey 透传，方便游戏前端展示）
  const gameOrigin = c.req.header('X-Game-Origin') || 'https://giant-2048.pages.dev';
  const params = new URLSearchParams({
    token,
    platformid: platformKey,
    lan: lang,
    ext: '0',
  });
  if (body.returnUrl) params.set('returnUrl', body.returnUrl);
  const url = `${gameOrigin}/?${params.toString()}`;

  return c.json({
    url,
    config: { env: 'production' },
    openType: 0,
    screen: 1,
  });
});

// ================= /game/* iframe API =================
// 所有 /game/... 路由通过 sign: header 验签
const game = new Hono<{
  Bindings: Bindings;
  Variables: { gameUser: GameTokenPayload };
}>();

game.use('*', async (c, next) => {
  const sign = c.req.header('sign') || '';
  if (!sign) return c.json({ error: 'Missing sign header' }, 401);
  const payload = await verifyGameToken(sign);
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401);
  c.set('gameUser', payload);
  await next();
});

// /game/game/getSdkInfo —— SDK 元数据（版本、能力位）
game.post('/game/getSdkInfo', (c) => {
  return c.json({
    apiVersion: '1.0',
    sdkVersion: '0.1.0',
    features: {
      combo: true,
      stones: true,
      rotation: true,
    },
  });
});

// /game/game/user —— 当前 token 解出来的用户
game.post('/game/user', (c) => {
  const u = c.get('gameUser');
  return c.json({
    userId: u.userId,
    kolUserId: u.kolUserId,
    platformId: u.platformId,
    appId: u.appId,
  });
});

// /game/game/init —— 开局（替代 /api/start-game）
game.post('/game/init', async (c) => {
  const u = c.get('gameUser');
  const db = c.env.DB;

  // 1. sweep 同 user 的 playing games（同一用户开新局自动结束旧的）
  const sweep = await db.prepare(
    "UPDATE games SET status = 'finished', end_reason = 'new_game', ended_at = ? WHERE user_id = ? AND platform_id = ? AND status = 'playing'"
  ).bind(new Date().toISOString(), u.userId, u.platformId).run();
  console.log(`[game-init] swept ${sweep.meta?.changes ?? '?'} playing games for user=${u.userId} platform=${u.platformId}`);

  // 2. 选 sequence
  const { sequencePlanId, generatedSequenceId } = await getPlayableSequence(db, u.userId);

  // 3. 拿初始 tokens
  const genSeq = await db.prepare(
    'SELECT sequence_data FROM generated_sequences WHERE id = ?'
  ).bind(generatedSequenceId).first() as Record<string, unknown>;
  if (!genSeq) return c.json({ error: 'Sequence not found' }, 500);

  const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, 0, 3);

  // 4. 写 games 表
  const gameId = generateGameId();
  const seed = Math.floor(Math.random() * 2147483647);
  const now = new Date().toISOString();
  const sign = await initSign(gameId);
  await db.prepare(
    `INSERT INTO games
     (game_id, user_id, kol_user_id, platform_id, app_id, token_jti, seed, step, score, sign, status,
      sequence_plan_id, generated_sequence_id, sequence_index, end_reason, ended_at, last_update_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    gameId, u.userId, u.kolUserId, u.platformId, u.appId, u.jti,
    seed, 0, 0, sign, 'playing',
    sequencePlanId, generatedSequenceId, newIndex, '', '', now, now,
  ).run();

  console.log(`[game-init] ✓ gameId=${gameId} user=${u.userId} platform=${u.platformId} initialTokens=${JSON.stringify(tokens)}`);
  return c.json({ gameId, tokens, sequencePlanId, generatedSequenceId, sign });
});

// /game/2048/next-token
game.post('/2048/next-token', async (c) => {
  const { gameId } = await c.req.json<{ gameId: string }>();
  if (!gameId) return c.json({ error: 'Missing gameId' }, 400);

  const db = c.env.DB;
  const gm = await db.prepare(
    'SELECT game_id, status, generated_sequence_id, sequence_index, user_id FROM games WHERE game_id = ?'
  ).bind(gameId).first() as Record<string, unknown> | null;

  if (!gm) return c.json({ error: 'Game not found' }, 404);
  if (gm.user_id !== c.get('gameUser').userId) return c.json({ error: 'Forbidden' }, 403);
  if (gm.status !== 'playing') return c.json({ error: 'Game finished' }, 400);

  const genSeq = await db.prepare(
    'SELECT sequence_data FROM generated_sequences WHERE id = ?'
  ).bind(gm.generated_sequence_id as string).first() as Record<string, unknown>;
  if (!genSeq) return c.json({ error: 'Sequence not found' }, 500);

  const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, gm.sequence_index as number, 3);
  await db.prepare('UPDATE games SET sequence_index = ?, last_update_at = ? WHERE game_id = ?')
    .bind(newIndex, new Date().toISOString(), gameId).run();
  return c.json({ tokens });
});

// /game/2048/action
game.post('/2048/action', async (c) => {
  const { gameId, action } = await c.req.json<{
    gameId: string;
    action: {
      type: 'shoot' | 'rotate' | 'direct_merge';
      col?: number;
      value?: number;
      direction?: 'cw' | 'ccw';
      resultValue?: number;
    };
  }>();
  if (!gameId || !action) return c.json({ error: 'Missing fields' }, 400);

  const db = c.env.DB;
  const gm = await db.prepare('SELECT * FROM games WHERE game_id = ?').bind(gameId).first() as Record<string, unknown> | null;
  if (!gm) return c.json({ error: 'Game not found' }, 404);
  if (gm.user_id !== c.get('gameUser').userId) return c.json({ error: 'Forbidden' }, 403);
  if (gm.status !== 'playing') return c.json({ error: 'Game finished' }, 400);

  if (action.type === 'shoot' || action.type === 'direct_merge') {
    if (action.col === undefined || action.col < 0 || action.col >= 5) {
      return c.json({ error: 'Invalid column' }, 400);
    }
  }
  if (action.type === 'rotate') {
    if (action.direction !== 'cw' && action.direction !== 'ccw') {
      return c.json({ error: 'Invalid direction' }, 400);
    }
  }

  const newStep = (gm.step as number) + 1;
  const newSign = await chainSign(gm.sign as string, action, newStep);
  const now = new Date().toISOString();
  await db.prepare('UPDATE games SET step = ?, sign = ?, last_update_at = ? WHERE game_id = ?')
    .bind(newStep, newSign, now, gameId).run();
  return c.json({ step: newStep, sign: newSign });
});

// /game/2048/update-score
game.post('/2048/update-score', async (c) => {
  const { gameId, score } = await c.req.json<{ gameId: string; score: number }>();
  if (!gameId || !Number.isFinite(score)) return c.json({ error: 'Missing or invalid fields' }, 400);

  const r = await c.env.DB.prepare(
    "UPDATE games SET score = ?, last_update_at = ? WHERE game_id = ? AND user_id = ? AND status = 'playing'"
  ).bind(score, new Date().toISOString(), gameId, c.get('gameUser').userId).run();
  if (!r.meta?.changes) console.warn(`[update-score] no row updated for ${gameId}`);
  return c.json({ success: true });
});

// /game/2048/end-game
game.post('/2048/end-game', async (c) => {
  const body = await c.req.json<{ gameId: string; finalSign: string; finalScore: number; endReason?: string }>();
  const r = await finishGame(c.env.DB, body, c.get('gameUser').userId);
  return c.json(r.body, r.status);
});

app.route('/game', game);

async function finishGame(db: D1Database, body: {
  gameId: string; finalSign: string; finalScore: number; endReason?: string;
}, userId: string) {
  const { gameId, finalSign, finalScore, endReason } = body;
  console.log(`[finishGame] gameId=${gameId} userId=${userId} finalScore=${finalScore} endReason=${endReason || '(gameover)'}`);
  if (!gameId || !finalSign || !Number.isFinite(finalScore)) {
    return { status: 400 as const, body: { error: 'Missing or invalid fields' } };
  }

  const gm = await db.prepare('SELECT * FROM games WHERE game_id = ?').bind(gameId).first() as Record<string, unknown> | null;
  if (!gm) return { status: 404 as const, body: { error: 'Game not found' } };
  if (gm.user_id !== userId) return { status: 403 as const, body: { error: 'Forbidden' } };
  if (gm.status !== 'playing') return { status: 400 as const, body: { error: 'Game already finished' } };
  if (finalSign !== gm.sign) {
    console.warn(`[finishGame] signature mismatch for ${gameId}`);
    return { status: 403 as const, body: { error: 'Invalid signature' } };
  }

  const now = new Date().toISOString();
  const reason = endReason || 'gameover';

  await db.prepare(
    `UPDATE games SET score = ?, step = ?, status = 'finished', end_reason = ?, ended_at = ?, last_update_at = ? WHERE game_id = ?`
  ).bind(finalScore, gm.step as number, reason, now, now, gameId).run();

  await db.prepare(
    'INSERT INTO scores (game_id, user_id, score, actions_count, sign, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(gameId, gm.user_id as string, finalScore, gm.step as number, finalSign, now).run();

  const rankResult = await db.prepare('SELECT COUNT(*) as rank FROM scores WHERE score > ?').bind(finalScore).first() as Record<string, unknown> | null;
  const rank = rankResult ? (rankResult.rank as number) + 1 : 1;
  return { status: 200 as const, body: { success: true, score: finalScore, rank } };
}

app.get('/api/leaderboard', async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT score, actions_count, created_at FROM scores ORDER BY score DESC LIMIT 20'
  ).all();
  return c.json({ leaderboard: results.results });
});

// ================= Admin API =================

const admin = new Hono<{ Bindings: Bindings }>();

// 登录不需要鉴权
admin.post('/login', async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  if (username === 'admin' && password === '123456') {
    const token = await signAdminToken(username);
    return c.json({ success: true, token });
  }
  return c.json({ error: 'Invalid credentials' }, 401);
});

// 其他 admin 路由需要 Bearer token，且必须签名有效 + 未过期
admin.use('*', async (c, next) => {
  if (c.req.path === '/api/admin/login') return next();
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  const payload = await verifyAdminToken(auth);
  if (!payload) return c.json({ error: 'Invalid or expired token' }, 401);
  await next();
});

// ---- 统计 ----
// ---- Plan 分析：按 plan 聚合多维指标（用于调优评估）----
admin.get('/plan-stats', async (c) => {
  const db = c.env.DB;
  console.log('[plan-stats] aggregating');

  const rows = await db.prepare(
    `SELECT g.sequence_plan_id, sp.name AS plan_name,
            g.user_id, g.step, g.score, g.end_reason,
            g.created_at, g.ended_at, g.status
     FROM games g
     LEFT JOIN sequence_plans sp ON g.sequence_plan_id = sp.id
     ORDER BY g.created_at ASC`
  ).all();

  type G = { score: number; step: number; duration_sec: number | null; end_reason: string; user_id: string; status: string; created_at: string };

  const byPlan = new Map<string, { plan_id: string | null; plan_name: string | null; games: G[] }>();

  for (const r of (rows.results || []) as Array<Record<string, unknown>>) {
    const pid = (r.sequence_plan_id as string | null) || '';
    const key = pid || '__none__';
    let bucket = byPlan.get(key);
    if (!bucket) {
      bucket = { plan_id: pid || null, plan_name: (r.plan_name as string | null) || null, games: [] };
      byPlan.set(key, bucket);
    }
    let duration: number | null = null;
    const endedAt = r.ended_at as string | null;
    const createdAt = r.created_at as string | null;
    if (endedAt && createdAt) {
      const d = (Date.parse(endedAt) - Date.parse(createdAt)) / 1000;
      if (Number.isFinite(d) && d >= 0) duration = d;
    }
    bucket.games.push({
      score: (r.score as number) || 0,
      step: (r.step as number) || 0,
      duration_sec: duration,
      end_reason: (r.end_reason as string) || '',
      user_id: (r.user_id as string) || '',
      status: (r.status as string) || '',
      created_at: createdAt || '',
    });
  }

  const plans = Array.from(byPlan.values()).map((b) => {
    const finished = b.games.filter((g) => g.status === 'finished');
    const playing = b.games.filter((g) => g.status === 'playing');
    const durations = finished.map((g) => g.duration_sec).filter((d): d is number => d !== null);
    const scores = finished.map((g) => g.score);
    const steps = finished.map((g) => g.step);

    const endReasons: Record<string, number> = {};
    for (const g of finished) {
      const r = g.end_reason || '(none)';
      endReasons[r] = (endReasons[r] || 0) + 1;
    }

    const uniqueFingerprints = new Set(b.games.map((g) => g.user_id).filter(Boolean));

    // 按 user_id 聚合：新手首局表现 + retry 比例 + 学习曲线
    const byFp = new Map<string, G[]>();
    for (const g of b.games.filter(x => x.user_id)) {
      if (!byFp.has(g.user_id)) byFp.set(g.user_id, []);
      byFp.get(g.user_id)!.push(g);
    }
    for (const list of byFp.values()) {
      list.sort((x, y) => x.created_at.localeCompare(y.created_at));
    }

    // 新手首局：每个 fp 的第一局（只取 finished 的，避免进行中没分数污染）
    const firstGames = Array.from(byFp.values())
      .map(list => list.find(g => g.status === 'finished'))
      .filter((g): g is G => !!g);
    const firstGameStats = {
      count: firstGames.length,
      avg_step: firstGames.length ? firstGames.reduce((s, g) => s + g.step, 0) / firstGames.length : null,
      avg_score: firstGames.length ? firstGames.reduce((s, g) => s + g.score, 0) / firstGames.length : null,
    };

    // Retry: 连续开局 ≥ 3 的 fp 比例（不过滤 status，统计一个 fp 开了几局）
    const fpGameCounts = Array.from(byFp.values()).map(list => list.length);
    const retryCount = fpGameCounts.filter(c => c >= 3).length;
    const retryRate = fpGameCounts.length > 0 ? retryCount / fpGameCounts.length : null;

    // 学习曲线：对 ≥5 局的 fp，(第5局score / 第1局score) - 1，求平均
    const learningDeltas: number[] = [];
    for (const list of byFp.values()) {
      const finishedSorted = list.filter(g => g.status === 'finished');
      if (finishedSorted.length >= 5) {
        const first = finishedSorted[0].score;
        const fifth = finishedSorted[4].score;
        if (first > 0) learningDeltas.push(fifth / first - 1);
      }
    }
    const learningCurve = {
      sample: learningDeltas.length,
      avg_delta: learningDeltas.length > 0
        ? learningDeltas.reduce((s, v) => s + v, 0) / learningDeltas.length
        : null,
    };

    // 天花板比：p90 / p50
    const scoreStat = stats(scores);
    const ceilingRatio = (scoreStat.p90 && scoreStat.median && scoreStat.median > 0)
      ? scoreStat.p90 / scoreStat.median
      : null;

    // gameover / timeout 占比
    const gameoverShare = finished.length > 0
      ? (endReasons['gameover'] || 0) / finished.length
      : null;
    const timeoutShare = finished.length > 0
      ? (endReasons['timeout'] || 0) / finished.length
      : null;

    return {
      plan_id: b.plan_id,
      plan_name: b.plan_name,
      games_total: b.games.length,
      games_finished: finished.length,
      games_playing: playing.length,
      unique_players: uniqueFingerprints.size,
      score: scoreStat,
      duration_sec: stats(durations),
      step: stats(steps),
      end_reasons: endReasons,
      // 高级指标
      ceiling_ratio: ceilingRatio,
      gameover_share: gameoverShare,
      timeout_share: timeoutShare,
      first_game: firstGameStats,
      retry_rate: retryRate,
      learning_curve: learningCurve,
    };
  });

  plans.sort((a, b) => b.games_finished - a.games_finished);

  return c.json({ plans });
});

// ---- 样本分析：某个 Plan 下按 generated_sequence 聚合（懒加载，plan 展开时调用）----
admin.get('/plan-sequence-stats', async (c) => {
  const db = c.env.DB;
  const planId = c.req.query('plan_id');
  if (!planId) return c.json({ error: 'plan_id required' }, 400);

  const rows = await db.prepare(
    `SELECT g.generated_sequence_id, g.score, g.created_at, g.ended_at, g.status, g.user_id
     FROM games g
     WHERE g.sequence_plan_id = ?
       AND g.generated_sequence_id IS NOT NULL
     ORDER BY g.created_at ASC`
  ).bind(planId).all();

  const bySeq = new Map<string, { games_total: number; games_finished: number; scores: number[]; durations: number[]; fps: Set<string> }>();
  for (const r of (rows.results || []) as Array<Record<string, unknown>>) {
    const sid = (r.generated_sequence_id as string) || '';
    if (!sid) continue;
    let bucket = bySeq.get(sid);
    if (!bucket) {
      bucket = { games_total: 0, games_finished: 0, scores: [], durations: [], fps: new Set() };
      bySeq.set(sid, bucket);
    }
    bucket.games_total += 1;
    const status = (r.status as string) || '';
    if (status === 'finished') bucket.games_finished += 1;
    bucket.scores.push((r.score as number) || 0);
    const uid = (r.user_id as string) || '';
    if (uid) bucket.fps.add(uid);
    const endedAt = r.ended_at as string | null;
    const createdAt = r.created_at as string | null;
    if (endedAt && createdAt) {
      const d = (Date.parse(endedAt) - Date.parse(createdAt)) / 1000;
      if (Number.isFinite(d) && d >= 0) bucket.durations.push(d);
    }
  }

  // 一次性查所有涉及的 sequence_name
  const seqIds = Array.from(bySeq.keys());
  const nameMap = new Map<string, string>();
  if (seqIds.length > 0) {
    const placeholders = seqIds.map(() => '?').join(',');
    const nameRows = await db.prepare(
      `SELECT id, sequence_name FROM generated_sequences WHERE id IN (${placeholders})`
    ).bind(...seqIds).all();
    for (const r of (nameRows.results || []) as Array<Record<string, unknown>>) {
      nameMap.set(r.id as string, (r.sequence_name as string) || '');
    }
  }

  const sequences = Array.from(bySeq.entries()).map(([id, b]) => {
    const sortedScore = [...b.scores].sort((a, b) => a - b);
    const sortedDur = [...b.durations].sort((a, b) => a - b);
    const avgScore = sortedScore.length
      ? sortedScore.reduce((s, v) => s + v, 0) / sortedScore.length
      : null;
    const avgDur = sortedDur.length
      ? sortedDur.reduce((s, v) => s + v, 0) / sortedDur.length
      : null;
    return {
      sequence_id: id,
      sequence_name: nameMap.get(id) ?? '',
      games_total: b.games_total,
      games_finished: b.games_finished,
      unique_players: b.fps.size,
      score_min: sortedScore.length ? sortedScore[0] : null,
      score_max: sortedScore.length ? sortedScore[sortedScore.length - 1] : null,
      score_avg: avgScore,
      score_median: percentile(sortedScore, 0.5),
      duration_avg: avgDur,
      duration_median: percentile(sortedDur, 0.5),
    };
  });

  sequences.sort((a, b) => b.games_total - a.games_total);

  return c.json({ plan_id: planId, sequences });
});

// ---- 样本分析：某个 generated_sequence 的单序列详情（Phase 3b）----
admin.get('/sequence/:id/analysis', async (c) => {
  const db = c.env.DB;
  const sequenceId = c.req.param('id');

  const sequenceRow = await db.prepare(
    `SELECT gs.id, gs.sequence_plan_id AS plan_id, sp.name AS plan_name, gs.created_at, gs.status,
            (SELECT COUNT(DISTINCT user_id) FROM games WHERE generated_sequence_id = gs.id AND status = 'playing') AS playing_players,
            (SELECT COUNT(*) FROM games WHERE generated_sequence_id = gs.id AND status = 'playing') AS playing_games,
            (SELECT COUNT(DISTINCT user_id) FROM games WHERE generated_sequence_id = gs.id AND date(created_at) = date('now')) AS today_players,
            (SELECT COUNT(*) FROM games WHERE generated_sequence_id = gs.id AND created_at > datetime('now', '-1 hour')) AS hour_games,
            (SELECT COUNT(*) FROM games WHERE generated_sequence_id = gs.id) AS games_total,
            (SELECT COUNT(*) FROM games WHERE generated_sequence_id = gs.id AND status = 'finished') AS games_finished,
            (SELECT COUNT(DISTINCT user_id) FROM games WHERE generated_sequence_id = gs.id) AS unique_players
     FROM generated_sequences gs
     LEFT JOIN sequence_plans sp ON gs.sequence_plan_id = sp.id
     WHERE gs.id = ?`
  ).bind(sequenceId).first() as Record<string, unknown> | null;

  if (!sequenceRow) return c.json({ error: 'Sequence not found' }, 404);

  const finishedRows = await db.prepare(
    `SELECT score, step, end_reason,
            ((julianday(ended_at) - julianday(created_at)) * 86400.0) AS duration_sec
     FROM games
     WHERE generated_sequence_id = ?
       AND status = 'finished'
     ORDER BY created_at ASC`
  ).bind(sequenceId).all();

  const scores: number[] = [];
  const durations: number[] = [];
  const steps: number[] = [];
  const endReasons: Record<string, number> = {};

  for (const row of (finishedRows.results || []) as Array<Record<string, unknown>>) {
    scores.push((row.score as number) || 0);
    steps.push((row.step as number) || 0);
    const duration = row.duration_sec as number | null;
    if (duration !== null && Number.isFinite(duration) && duration >= 0) durations.push(duration);
    const endReason = (row.end_reason as string) || '';
    if (endReason) endReasons[endReason] = (endReasons[endReason] || 0) + 1;
  }

  const scoreStat = stats(scores);
  const durationStat = stats(durations);
  const stepStat = stats(steps);

  const resp: SequenceAnalysisResp = {
    sequence_id: sequenceRow.id as string,
    name: (sequenceRow.id as string).slice(0, 8),
    plan_id: (sequenceRow.plan_id as string | null) || null,
    plan_name: (sequenceRow.plan_name as string | null) || null,
    created_at: (sequenceRow.created_at as string) || '',
    status: ((sequenceRow.status as 'enabled' | 'disabled') || 'disabled'),
    playing_players: (sequenceRow.playing_players as number) || 0,
    playing_games: (sequenceRow.playing_games as number) || 0,
    today_players: (sequenceRow.today_players as number) || 0,
    hour_games: (sequenceRow.hour_games as number) || 0,
    games_total: (sequenceRow.games_total as number) || 0,
    games_finished: (sequenceRow.games_finished as number) || 0,
    unique_players: (sequenceRow.unique_players as number) || 0,
    score: {
      avg: scoreStat.avg,
      median: percentile([...scores].sort((a, b) => a - b), 0.5),
      min: scoreStat.min,
      max: scoreStat.max,
    },
    duration_sec: {
      avg: durationStat.avg,
      median: percentile([...durations].sort((a, b) => a - b), 0.5),
    },
    step: {
      avg: stepStat.avg,
      median: percentile([...steps].sort((a, b) => a - b), 0.5),
    },
    end_reasons: endReasons,
  };

  return c.json(resp);
});

admin.get('/stats', async (c) => {
  const db = c.env.DB;
  const totalGames = await db.prepare('SELECT COUNT(*) as c FROM games').first() as Record<string, unknown>;
  const playingGames = await db.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'playing'").first() as Record<string, unknown>;
  const finishedGames = await db.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'finished'").first() as Record<string, unknown>;
  const topScore = await db.prepare('SELECT MAX(score) as m FROM scores').first() as Record<string, unknown>;
  const uniquePlayers = await db.prepare('SELECT COUNT(DISTINCT user_id) as c FROM games').first() as Record<string, unknown>;

  return c.json({
    totalGames: totalGames?.c || 0,
    playingGames: playingGames?.c || 0,
    finishedGames: finishedGames?.c || 0,
    topScore: topScore?.m || 0,
    uniquePlayers: uniquePlayers?.c || 0,
    sequencePlans: (await db.prepare('SELECT COUNT(*) as c FROM sequence_plans').first() as Record<string, unknown> | null)?.c || 0,
    generatedSequences: (await db.prepare('SELECT COUNT(*) as c FROM generated_sequences').first() as Record<string, unknown> | null)?.c || 0,
  });
});

// ---- 游戏列表（分页）----
admin.get('/games', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const status = c.req.query('status'); // 'playing' | 'finished' | undefined
  const sequenceId = c.req.query('sequence_id');
  const q = c.req.query('q');
  const offset = (page - 1) * limit;
  const db = c.env.DB;

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (status === 'playing' || status === 'finished') {
    where.push('g.status = ?');
    params.push(status);
  }
  if (sequenceId) {
    where.push('g.generated_sequence_id = ?');
    params.push(sequenceId);
  }
  if (q) {
    where.push('(g.game_id LIKE ? OR g.user_id LIKE ? OR g.kol_user_id LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSQL = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const games = await db.prepare(
    `SELECT g.game_id, g.user_id, g.kol_user_id, g.platform_id, g.app_id, g.token_jti,
            g.seed, g.step, g.score, g.sign, g.status,
            g.sequence_plan_id, g.generated_sequence_id, g.sequence_index,
            g.end_reason, g.ended_at, g.last_update_at, g.created_at,
            sp.name AS plan_name,
            gs.sequence_length AS sequence_length,
            gs.sequence_name AS sequence_name
     FROM games g
     LEFT JOIN sequence_plans sp ON g.sequence_plan_id = sp.id
     LEFT JOIN generated_sequences gs ON g.generated_sequence_id = gs.id
     ${whereSQL}
     ORDER BY g.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all();

  const countResult = await db.prepare(
    `SELECT COUNT(*) as total FROM games g ${whereSQL}`
  ).bind(...params).first() as Record<string, unknown> | null;

  return c.json({
    games: games.results,
    total: countResult?.total || 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult?.total as number) || 0) / limit),
  });
});

admin.get('/game/:id', async (c) => {
  const gameId = c.req.param('id');
  const db = c.env.DB;
  const game = await db.prepare('SELECT * FROM games WHERE game_id = ?').bind(gameId).first() as Record<string, unknown> | null;
  if (!game) return c.json({ error: 'Game not found' }, 404);

  let plan_name: string | null = null;
  let sequence: string | null = null;
  let sequence_length = 0;
  let sequence_name: string | null = null;
  let stages: unknown[] = [];

  if (game.sequence_plan_id) {
    const plan = await db.prepare(
      'SELECT name FROM sequence_plans WHERE id = ?'
    ).bind(game.sequence_plan_id as string).first() as Record<string, unknown> | null;
    plan_name = plan ? (plan.name as string) : null;

    const stageRows = await db.prepare(
      `SELECT id, name, length, probabilities, stage_order
       FROM plan_stages
       WHERE sequence_plan_id = ?
       ORDER BY stage_order ASC`
    ).bind(game.sequence_plan_id as string).all();
    stages = (stageRows.results || []).map((r) => {
      const rec = r as Record<string, unknown>;
      let probs: Record<string, number> = {};
      try { probs = JSON.parse(rec.probabilities as string); } catch { /* ignore */ }
      return {
        id: rec.id,
        name: rec.name,
        length: rec.length,
        stage_order: rec.stage_order,
        probabilities: probs,
      };
    });
  }

  if (game.generated_sequence_id) {
    const gs = await db.prepare(
      'SELECT sequence_data, sequence_length, sequence_name FROM generated_sequences WHERE id = ?'
    ).bind(game.generated_sequence_id as string).first() as Record<string, unknown> | null;
    if (gs) {
      sequence = gs.sequence_data as string;
      sequence_length = (gs.sequence_length as number) || 0;
      sequence_name = (gs.sequence_name as string) || null;
    }
  }

  return c.json({
    ...game,
    plan_name,
    sequence,
    sequence_length,
    sequence_name,
    stages,
  });
});

admin.delete('/delete-game/:id', async (c) => {
  const gameId = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM games WHERE game_id = ?').bind(gameId).run();
  await c.env.DB.prepare('DELETE FROM scores WHERE game_id = ?').bind(gameId).run();
  return c.json({ success: true });
});

// 批量删除游戏局
admin.post('/delete-games', async (c) => {
  const { ids } = await c.req.json<{ ids: string[] }>();
  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'ids must be a non-empty array' }, 400);
  }
  console.log(`[delete-games] batch delete ${ids.length} games`);
  const db = c.env.DB;
  const placeholders = ids.map(() => '?').join(',');
  const r1 = await db.prepare(`DELETE FROM scores WHERE game_id IN (${placeholders})`).bind(...ids).run();
  const r2 = await db.prepare(`DELETE FROM games WHERE game_id IN (${placeholders})`).bind(...ids).run();
  return c.json({
    success: true,
    deletedGames: r2.meta?.changes ?? 0,
    deletedScores: r1.meta?.changes ?? 0,
  });
});

// ---- Sequence Plans（含内联 stages，每个 plan 私有）----
interface InlineStageInput {
  name: string;
  length: number;
  probabilities: Record<string, number>;
  stage_order: number;
}

function validateInlineStages(stages: InlineStageInput[]): string | null {
  if (!stages || stages.length === 0) return 'stages required';
  for (const s of stages) {
    if (!s.name) return 'stage name required';
    if (!s.length || s.length <= 0) return 'stage length must be > 0';
    if (!s.probabilities || Object.keys(s.probabilities).length === 0) {
      return `stage "${s.name}" has empty probabilities`;
    }
    const total = Object.values(s.probabilities).reduce((sum, v) => sum + v, 0);
    if (Math.abs(total - 100) > 0.01) {
      return `stage "${s.name}" probabilities sum must be 100, got ${total}`;
    }
  }
  return null;
}

admin.post('/sequence-plans', async (c) => {
  const { name, description, stages } = await c.req.json<{
    name: string; description?: string;
    stages: InlineStageInput[];
  }>();
  if (!name) return c.json({ error: 'Missing field: name' }, 400);
  const err = validateInlineStages(stages);
  if (err) return c.json({ error: err }, 400);

  const planId = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = c.env.DB;

  await db.prepare(
    'INSERT INTO sequence_plans (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(planId, name, description || '', now, now).run();

  for (const s of stages) {
    const stageId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO plan_stages (id, sequence_plan_id, stage_order, name, length, probabilities, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(stageId, planId, s.stage_order, s.name, s.length, JSON.stringify(s.probabilities), now, now).run();
  }

  return c.json({ id: planId, name, description: description || '', stages });
});

admin.get('/sequence-plans', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const db = c.env.DB;

  const plans = await db.prepare(
    'SELECT * FROM sequence_plans ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const countResult = await db.prepare('SELECT COUNT(*) as total FROM sequence_plans').first() as Record<string, unknown> | null;

  const result = [];
  for (const plan of plans.results) {
    const stagesResult = await db.prepare(
      `SELECT id, stage_order, name, length, probabilities
       FROM plan_stages
       WHERE sequence_plan_id = ?
       ORDER BY stage_order`
    ).bind(plan.id as string).all();

    result.push({
      ...plan,
      stages: stagesResult.results.map((s: Record<string, unknown>) => ({
        ...s,
        probabilities: JSON.parse(s.probabilities as string),
      })),
      total_length: stagesResult.results.reduce((sum, s: Record<string, unknown>) => sum + (s.length as number), 0),
    });
  }

  return c.json({
    plans: result,
    total: countResult?.total || 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult?.total as number) || 0) / limit),
  });
});

admin.get('/sequence-plans/:id', async (c) => {
  const planId = c.req.param('id');
  const db = c.env.DB;
  const plan = await db.prepare('SELECT * FROM sequence_plans WHERE id = ?').bind(planId).first();
  if (!plan) return c.json({ error: 'Plan not found' }, 404);

  const stagesResult = await db.prepare(
    `SELECT id, stage_order, name, length, probabilities
     FROM plan_stages
     WHERE sequence_plan_id = ?
     ORDER BY stage_order`
  ).bind(planId).all();

  return c.json({
    ...plan,
    stages: stagesResult.results.map((s: Record<string, unknown>) => ({
      ...s,
      probabilities: JSON.parse(s.probabilities as string),
    })),
    total_length: stagesResult.results.reduce((sum, s: Record<string, unknown>) => sum + (s.length as number), 0),
  });
});

admin.put('/sequence-plans/:id', async (c) => {
  const planId = c.req.param('id');
  const { name, description, stages } = await c.req.json<{
    name?: string; description?: string;
    stages?: InlineStageInput[];
  }>();
  const db = c.env.DB;

  const existing = await db.prepare('SELECT * FROM sequence_plans WHERE id = ?').bind(planId).first();
  if (!existing) return c.json({ error: 'Plan not found' }, 404);

  if (stages !== undefined) {
    const err = validateInlineStages(stages);
    if (err) return c.json({ error: err }, 400);
  }

  // 全局规则：undefined = 不动；'' = 清空（但 name 是 NOT NULL UNIQUE，'' 视为非法）
  if (name !== undefined && name === '') {
    return c.json({ error: 'Name cannot be empty' }, 400);
  }

  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE sequence_plans SET name = ?, description = ?, updated_at = ? WHERE id = ?'
  ).bind(
    name !== undefined ? name : existing.name as string,
    description !== undefined ? description : existing.description as string,
    now, planId,
  ).run();

  if (stages && stages.length > 0) {
    await db.prepare('DELETE FROM plan_stages WHERE sequence_plan_id = ?').bind(planId).run();
    for (const s of stages) {
      const stageId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO plan_stages (id, sequence_plan_id, stage_order, name, length, probabilities, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(stageId, planId, s.stage_order, s.name, s.length, JSON.stringify(s.probabilities), now, now).run();
    }
  }

  return c.json({ success: true });
});

admin.delete('/sequence-plans/:id', async (c) => {
  const planId = c.req.param('id');
  const db = c.env.DB;
  const ref = await db.prepare(
    'SELECT COUNT(*) as c FROM generated_sequences WHERE sequence_plan_id = ?'
  ).bind(planId).first() as Record<string, unknown>;
  if (ref && (ref.c as number) > 0) {
    return c.json({ error: 'Plan has generated sequences, cannot delete' }, 400);
  }
  // ON DELETE CASCADE 会自动删 plan_stages
  await db.prepare('DELETE FROM sequence_plans WHERE id = ?').bind(planId).run();
  return c.json({ success: true });
});

// ---- Generated Sequences（已分页） ----
// 检测 sequence_name 在该 plan 下是否已存在；返回 null 表示可用，否则返回错误字符串
async function checkSequenceNameAvailable(
  db: D1Database,
  planId: string,
  name: string,
  excludeId?: string,
): Promise<string | null> {
  if (!name || name.trim() === '') return 'Name is required';
  let row: Record<string, unknown> | null;
  if (excludeId) {
    row = await db.prepare(
      'SELECT id FROM generated_sequences WHERE sequence_plan_id = ? AND sequence_name = ? AND id != ? LIMIT 1'
    ).bind(planId, name, excludeId).first() as Record<string, unknown> | null;
  } else {
    row = await db.prepare(
      'SELECT id FROM generated_sequences WHERE sequence_plan_id = ? AND sequence_name = ? LIMIT 1'
    ).bind(planId, name).first() as Record<string, unknown> | null;
  }
  if (row) return 'Name already exists in this plan';
  return null;
}

// GET /api/admin/generated-sequences/check-name?plan_id=X&name=Y&exclude_id=Z
admin.get('/generated-sequences/check-name', async (c) => {
  const planId = c.req.query('plan_id') || '';
  const name = c.req.query('name') || '';
  const excludeId = c.req.query('exclude_id') || undefined;
  if (!planId) return c.json({ available: false, reason: 'Missing plan_id' }, 400);
  const reason = await checkSequenceNameAvailable(c.env.DB, planId, name, excludeId);
  return c.json({ available: reason === null, reason });
});

admin.post('/generate-sequence', async (c) => {
  const { sequence_plan_id, count, sequence_name, sequence_note } = await c.req.json<{
    sequence_plan_id: string;
    count?: number;
    sequence_name?: string;
    sequence_note?: string;
  }>();
  if (!sequence_plan_id) return c.json({ error: 'Missing sequence_plan_id' }, 400);

  const db = c.env.DB;
  const stagesResult = await db.prepare(
    `SELECT id, stage_order, name, length, probabilities
     FROM plan_stages
     WHERE sequence_plan_id = ?
     ORDER BY stage_order`
  ).bind(sequence_plan_id).all();

  if (stagesResult.results.length === 0) {
    return c.json({ error: 'Plan has no stages configured' }, 400);
  }

  const planStages: PlanStageRow[] = stagesResult.results.map((s: Record<string, unknown>) => ({
    id: s.id as string,
    stage_order: s.stage_order as number,
    name: s.name as string,
    length: s.length as number,
    probabilities: s.probabilities as string,
  }));

  // 查 plan name，用于默认 sequence_name 自动生成
  const planRow = await db.prepare(
    'SELECT name FROM sequence_plans WHERE id = ?'
  ).bind(sequence_plan_id).first() as Record<string, unknown> | null;
  const planName = (planRow?.name as string) || '';

  const generateCount = count || 1;
  const seqNote = sequence_note ?? '';
  const generated = [];

  // 用户传了 sequence_name：必须非空 + 同 plan 下不重名（且若 generateCount > 1，第 2 条起会冲）
  if (sequence_name !== undefined) {
    if (!sequence_name || sequence_name.trim() === '') {
      return c.json({ error: 'Name is required' }, 400);
    }
    if (generateCount > 1) {
      return c.json({ error: 'Cannot create multiple sequences with the same name' }, 400);
    }
    const reason = await checkSequenceNameAvailable(db, sequence_plan_id, sequence_name);
    if (reason) return c.json({ error: reason }, 400);
  }

  for (let i = 0; i < generateCount; i++) {
    const sequence = await generateSequenceFromPlan(planStages);
    const seqId = crypto.randomUUID();
    const now = new Date().toISOString();

    // sequence_name 决策：
    //   - 用户传了 → 用用户的（已校验非空 + 不重名）
    //   - 未传 → 自动生成 {plan_name}_seq_{12位 uuid}，最多重试 3 次防碰撞
    let finalName: string;
    if (sequence_name !== undefined) {
      finalName = sequence_name;
    } else {
      let attempt = 0;
      do {
        finalName = `${planName}_seq_${crypto.randomUUID().slice(0, 12)}`;
        const reason = await checkSequenceNameAvailable(db, sequence_plan_id, finalName);
        if (!reason) break;
        attempt++;
      } while (attempt < 3);
      if (attempt >= 3) {
        return c.json({ error: 'Failed to generate unique name after 3 attempts' }, 500);
      }
    }

    await db.prepare(
      `INSERT INTO generated_sequences (id, sequence_plan_id, sequence_name, sequence_note, sequence_data, sequence_length, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'enabled', ?, ?)`
    ).bind(seqId, sequence_plan_id, finalName, seqNote, JSON.stringify(sequence), sequence.length, now, now).run();

    generated.push({ id: seqId, sequence_length: sequence.length, sequence_data: sequence, sequence_name: finalName, sequence_note: seqNote });
  }

  return c.json({ generated, count: generateCount });
});

admin.get('/generated-sequences', async (c) => {
  const planId = c.req.query('plan_id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const db = c.env.DB;

  let query = 'SELECT gs.*, sp.name as plan_name FROM generated_sequences gs LEFT JOIN sequence_plans sp ON gs.sequence_plan_id = sp.id';
  const params: unknown[] = [];
  if (planId) {
    query += ' WHERE gs.sequence_plan_id = ?';
    params.push(planId);
  }
  query += ' ORDER BY gs.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const results = await db.prepare(query).bind(...params).all();

  let countQuery = 'SELECT COUNT(*) as total FROM generated_sequences';
  const countParams: unknown[] = [];
  if (planId) {
    countQuery += ' WHERE sequence_plan_id = ?';
    countParams.push(planId);
  }
  const countResult = await db.prepare(countQuery).bind(...countParams).first() as Record<string, unknown>;

  return c.json({
    sequences: results.results.map((s: Record<string, unknown>) => ({
      ...s,
      sequence_data: JSON.parse(s.sequence_data as string),
    })),
    total: countResult?.total || 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult?.total as number) || 0) / limit),
  });
});

admin.get('/generated-sequences/:id', async (c) => {
  const seqId = c.req.param('id');
  const seq = await c.env.DB.prepare(
    'SELECT gs.*, sp.name as plan_name FROM generated_sequences gs LEFT JOIN sequence_plans sp ON gs.sequence_plan_id = sp.id WHERE gs.id = ?'
  ).bind(seqId).first() as Record<string, unknown> | null;
  if (!seq) return c.json({ error: 'Sequence not found' }, 404);
  return c.json({
    ...seq,
    sequence_data: JSON.parse(seq.sequence_data as string),
  });
});

admin.put('/generated-sequences/:id', async (c) => {
  const seqId = c.req.param('id');
  const body = await c.req.json<{ status?: string; sequence_name?: string; sequence_note?: string }>();
  const db = c.env.DB;

  // 校验 sequence_name：必填 + 同 plan 下不重名（排除自己）
  if (body.sequence_name !== undefined) {
    if (!body.sequence_name || body.sequence_name.trim() === '') {
      return c.json({ error: 'Name is required' }, 400);
    }
    const seqRow = await db.prepare(
      'SELECT sequence_plan_id FROM generated_sequences WHERE id = ?'
    ).bind(seqId).first() as Record<string, unknown> | null;
    if (!seqRow) return c.json({ error: 'Sequence not found' }, 404);
    const reason = await checkSequenceNameAvailable(db, seqRow.sequence_plan_id as string, body.sequence_name, seqId);
    if (reason) return c.json({ error: reason }, 400);
  }

  const sets: string[] = [];
  const params: unknown[] = [];

  if (body.status !== undefined) {
    if (body.status !== 'enabled' && body.status !== 'disabled') {
      return c.json({ error: 'Status must be enabled or disabled' }, 400);
    }
    sets.push('status = ?');
    params.push(body.status);
  }
  if (body.sequence_name !== undefined) {
    sets.push('sequence_name = ?');
    params.push(body.sequence_name);
  }
  if (body.sequence_note !== undefined) {
    sets.push('sequence_note = ?');
    params.push(body.sequence_note);
  }
  if (sets.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(seqId);

  await db.prepare(
    `UPDATE generated_sequences SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  return c.json({ success: true });
});

admin.delete('/generated-sequences/:id', async (c) => {
  const seqId = c.req.param('id');
  const force = c.req.query('force') === 'true';
  const db = c.env.DB;

  const totalRef = await db.prepare(
    'SELECT COUNT(*) as c FROM games WHERE generated_sequence_id = ?'
  ).bind(seqId).first() as Record<string, unknown>;
  const totalCount = totalRef ? (totalRef.c as number) : 0;

  const playingRef = await db.prepare(
    "SELECT COUNT(*) as c FROM games WHERE generated_sequence_id = ? AND status = 'playing'"
  ).bind(seqId).first() as Record<string, unknown>;
  const playingCount = playingRef ? (playingRef.c as number) : 0;

  if (totalCount > 0 && !force) {
    return c.json({
      error: 'Sequence is used by games, cannot delete',
      refCount: totalCount,
      playingCount,
    }, 400);
  }

  let stoppedGames = 0;
  if (force && totalCount > 0) {
    const now = new Date().toISOString();
    if (playingCount > 0) {
      await db.prepare(
        "UPDATE games SET status = 'finished', end_reason = 'sequence_force_deleted', ended_at = ?, last_update_at = ? WHERE generated_sequence_id = ? AND status = 'playing'"
      ).bind(now, now, seqId).run();
      stoppedGames = playingCount;
    }
    // 解除 FK 引用，否则后面 DELETE 会被外键约束拒绝
    await db.prepare(
      'UPDATE games SET generated_sequence_id = NULL WHERE generated_sequence_id = ?'
    ).bind(seqId).run();
  }

  await db.prepare('DELETE FROM generated_sequences WHERE id = ?').bind(seqId).run();
  return c.json({ success: true, stoppedGames });
});

// ================= Admin: users（用户配置表）=================
admin.get('/users', async (c) => {
  const db = c.env.DB;
  const rows = await db.prepare(
    `SELECT u.*, gs.sequence_name AS sequence_name
     FROM users u
     LEFT JOIN generated_sequences gs ON u.sequence_id = gs.id
     ORDER BY u.created_at DESC`
  ).all();
  return c.json({ users: rows.results });
});

admin.post('/users', async (c) => {
  const body = await c.req.json<{
    kol_user_id?: string;
    user_id?: string;
    platform_id?: string;
    sequence_id?: string;
    note?: string;
  }>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `INSERT INTO users (id, kol_user_id, user_id, platform_id, sequence_id, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.kol_user_id ?? '',
    body.user_id ?? '',
    body.platform_id ?? '',
    body.sequence_id ?? '',
    body.note ?? '',
    now, now,
  ).run();
  return c.json({ id });
});

admin.put('/users/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    kol_user_id?: string;
    user_id?: string;
    platform_id?: string;
    sequence_id?: string;
    note?: string;
  }>();
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const f of ['kol_user_id', 'user_id', 'platform_id', 'sequence_id', 'note'] as const) {
    if (body[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(body[f]);
    }
  }
  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400);
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  await c.env.DB.prepare(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  return c.json({ success: true });
});

admin.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// ================= Admin: distribution（全局分布表）=================
admin.get('/distribution', async (c) => {
  const db = c.env.DB;
  const rows = await db.prepare(
    `SELECT d.*, gs.sequence_name AS sequence_name, gs.sequence_plan_id AS sequence_plan_id, sp.name AS plan_name
     FROM distribution d
     LEFT JOIN generated_sequences gs ON d.sequence_id = gs.id
     LEFT JOIN sequence_plans sp ON gs.sequence_plan_id = sp.id
     ORDER BY d.created_at DESC`
  ).all();
  return c.json({ items: rows.results });
});

admin.post('/distribution', async (c) => {
  const body = await c.req.json<{ sequence_id: string; ratio: number }>();
  if (!body.sequence_id) return c.json({ error: 'Missing sequence_id' }, 400);
  if (!Number.isFinite(body.ratio) || body.ratio <= 0) {
    return c.json({ error: 'ratio must be a positive number' }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await c.env.DB.prepare(
      `INSERT INTO distribution (id, sequence_id, ratio, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(id, body.sequence_id, body.ratio, now, now).run();
  } catch (e) {
    return c.json({ error: (e as Error).message || 'Insert failed' }, 400);
  }
  return c.json({ id });
});

admin.put('/distribution/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ sequence_id?: string; ratio?: number }>();
  const sets: string[] = [];
  const params: unknown[] = [];
  if (body.sequence_id !== undefined) {
    sets.push('sequence_id = ?');
    params.push(body.sequence_id);
  }
  if (body.ratio !== undefined) {
    if (!Number.isFinite(body.ratio) || body.ratio <= 0) {
      return c.json({ error: 'ratio must be a positive number' }, 400);
    }
    sets.push('ratio = ?');
    params.push(body.ratio);
  }
  if (sets.length === 0) return c.json({ error: 'No fields to update' }, 400);
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());
  params.push(id);
  await c.env.DB.prepare(
    `UPDATE distribution SET ${sets.join(', ')} WHERE id = ?`
  ).bind(...params).run();
  return c.json({ success: true });
});

admin.delete('/distribution/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM distribution WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// 挂载 admin 路由到 /api/admin
app.route('/api/admin', admin);

export default app;
