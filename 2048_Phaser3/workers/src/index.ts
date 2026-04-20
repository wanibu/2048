// Giant 2048 — Cloudflare Workers 后端（Hono 版）
// 职责：序列配置管理、局管理、排行榜、Admin

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateSequenceFromPlan, PlanStageRow } from './sequence-config';

type Bindings = { DB: D1Database };
type SequenceToken = `${number}` | 'stone';

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
    `SELECT s.id as stage_id, s.name, s.length, s.probabilities, sps.stage_order
     FROM sequence_plan_stages sps
     JOIN stages s ON s.id = sps.stage_id
     WHERE sps.sequence_plan_id = ?
     ORDER BY sps.stage_order ASC`
  ).bind(plan.id as string).all<PlanStageRow>();

  const stages = stagesResult.results || [];
  if (stages.length === 0) return null;

  const generatedSequenceId = crypto.randomUUID();
  const sequence = await generateSequenceFromPlan(stages) as SequenceToken[];
  const now = new Date().toISOString();

  await db.prepare(
    `INSERT INTO generated_sequences
     (id, sequence_plan_id, sequence_data, sequence_length, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'enabled', ?, ?)`
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

async function getPlayableSequence(db: D1Database): Promise<{
  generatedSequenceId: string;
  sequencePlanId: string;
}> {
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

  const created = await createGeneratedSequenceFromRandomPlan(db);
  if (!created) {
    throw new Error('No enabled generated sequence and no sequence plan available');
  }
  return {
    generatedSequenceId: created.generatedSequenceId,
    sequencePlanId: created.sequencePlanId,
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

// 全局错误处理
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal error' }, 500);
});

// ================= 公共游戏 API =================

app.post('/api/start-game', async (c) => {
  const { fingerprint, userId } = await c.req.json<{ fingerprint: string; userId?: string }>();
  if (!fingerprint) return c.json({ error: 'Missing fingerprint' }, 400);

  const db = c.env.DB;

  await db.prepare(
    "UPDATE games SET status = 'finished', end_reason = 'new_game', ended_at = ? WHERE fingerprint = ? AND status = 'playing'"
  ).bind(new Date().toISOString(), fingerprint).run();

  const gameId = generateGameId();
  const seed = Math.floor(Math.random() * 2147483647);
  const now = new Date().toISOString();
  const sign = await initSign(gameId);
  const { sequencePlanId, generatedSequenceId } = await getPlayableSequence(db);

  const genSeq = await db.prepare(
    'SELECT sequence_data FROM generated_sequences WHERE id = ?'
  ).bind(generatedSequenceId).first() as Record<string, unknown>;

  const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, 0, 3);

  await db.prepare(
    `INSERT INTO games
     (game_id, fingerprint, user_id, seed, step, score, sign, status,
      sequence_plan_id, generated_sequence_id, sequence_index, end_reason, ended_at, last_update_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    gameId, fingerprint, userId || '', seed, 0, 0, sign, 'playing',
    sequencePlanId, generatedSequenceId, newIndex, '', '', now, now,
  ).run();

  return c.json({ gameId, tokens, sequencePlanId, generatedSequenceId, sign });
});

app.post('/api/extend-sequence', (c) =>
  c.json({ error: 'Deprecated API: sequence is now returned only by /api/start-game' }, 410)
);

app.post('/api/next-token', async (c) => {
  const { gameId } = await c.req.json<{ gameId: string }>();
  if (!gameId) return c.json({ error: 'Missing gameId' }, 400);

  const db = c.env.DB;
  const game = await db.prepare(
    'SELECT game_id, status, generated_sequence_id, sequence_index FROM games WHERE game_id = ?'
  ).bind(gameId).first() as Record<string, unknown> | null;

  if (!game) return c.json({ error: 'Game not found' }, 404);
  if (game.status !== 'playing') return c.json({ error: 'Game finished' }, 400);

  const genSeq = await db.prepare(
    'SELECT sequence_data FROM generated_sequences WHERE id = ?'
  ).bind(game.generated_sequence_id as string).first() as Record<string, unknown>;

  if (!genSeq) return c.json({ error: 'Sequence not found' }, 500);

  const currentIndex = game.sequence_index as number;
  const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, currentIndex, 3);

  await db.prepare(
    'UPDATE games SET sequence_index = ?, last_update_at = ? WHERE game_id = ?'
  ).bind(newIndex, new Date().toISOString(), gameId).run();

  return c.json({ tokens });
});

app.post('/api/action', async (c) => {
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
  const game = await db.prepare(
    'SELECT * FROM games WHERE game_id = ?'
  ).bind(gameId).first() as Record<string, unknown> | null;

  if (!game) return c.json({ error: 'Game not found' }, 404);
  if (game.status !== 'playing') return c.json({ error: 'Game finished' }, 400);

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

  const newStep = (game.step as number) + 1;
  const newSign = await chainSign(game.sign as string, action, newStep);
  const now = new Date().toISOString();

  await db.prepare(
    'UPDATE games SET step = ?, sign = ?, last_update_at = ? WHERE game_id = ?'
  ).bind(newStep, newSign, now, gameId).run();

  return c.json({ step: newStep, sign: newSign });
});

app.post('/api/update-score', async (c) => {
  const { gameId, score } = await c.req.json<{ gameId: string; score: number }>();
  if (!gameId || !Number.isFinite(score)) {
    return c.json({ error: 'Missing or invalid fields' }, 400);
  }

  await c.env.DB.prepare(
    "UPDATE games SET score = ?, last_update_at = ? WHERE game_id = ? AND status = 'playing'"
  ).bind(score, new Date().toISOString(), gameId).run();

  return c.json({ success: true });
});

async function finishGame(db: D1Database, body: {
  gameId: string; finalSign: string; finalScore: number; endReason?: string;
}) {
  const { gameId, finalSign, finalScore, endReason } = body;
  if (!gameId || !finalSign || !Number.isFinite(finalScore)) {
    return { status: 400 as const, body: { error: 'Missing or invalid fields' } };
  }

  const game = await db.prepare('SELECT * FROM games WHERE game_id = ?').bind(gameId).first() as Record<string, unknown> | null;
  if (!game) return { status: 404 as const, body: { error: 'Game not found' } };
  if (game.status !== 'playing') return { status: 400 as const, body: { error: 'Game already finished' } };
  if (finalSign !== game.sign) return { status: 403 as const, body: { error: 'Invalid signature' } };

  const now = new Date().toISOString();
  const reason = endReason || 'gameover';

  await db.prepare(
    `UPDATE games SET score = ?, step = ?, status = 'finished', end_reason = ?, ended_at = ?, last_update_at = ? WHERE game_id = ?`
  ).bind(finalScore, game.step as number, reason, now, now, gameId).run();

  await db.prepare(
    'INSERT INTO scores (game_id, fingerprint, score, actions_count, sign, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(gameId, game.fingerprint as string, finalScore, game.step as number, finalSign, now).run();

  const rankResult = await db.prepare('SELECT COUNT(*) as rank FROM scores WHERE score > ?').bind(finalScore).first() as Record<string, unknown> | null;

  return { status: 200 as const, body: { success: true, score: finalScore, rank: rankResult ? (rankResult.rank as number) + 1 : 1 } };
}

app.post('/api/submit-game', async (c) => {
  const body = await c.req.json<{ gameId: string; finalSign: string; finalScore: number; endReason?: string }>();
  const r = await finishGame(c.env.DB, body);
  return c.json(r.body, r.status);
});

app.post('/api/end-game', async (c) => {
  const body = await c.req.json<{ gameId: string; finalSign: string; finalScore: number; endReason?: string }>();
  const r = await finishGame(c.env.DB, body);
  return c.json(r.body, r.status);
});

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
    const token = await sha256(`admin_token_${Date.now()}_giant2048`);
    return c.json({ success: true, token });
  }
  return c.json({ error: 'Invalid credentials' }, 401);
});

// 其他 admin 路由需要 Bearer token
admin.use('*', async (c, next) => {
  if (c.req.path === '/api/admin/login') return next();
  const auth = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!auth) return c.json({ error: 'Unauthorized' }, 401);
  await next();
});

// ---- 统计 ----
admin.get('/stats', async (c) => {
  const db = c.env.DB;
  const totalGames = await db.prepare('SELECT COUNT(*) as c FROM games').first() as Record<string, unknown>;
  const playingGames = await db.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'playing'").first() as Record<string, unknown>;
  const finishedGames = await db.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'finished'").first() as Record<string, unknown>;
  const topScore = await db.prepare('SELECT MAX(score) as m FROM scores').first() as Record<string, unknown>;
  const uniquePlayers = await db.prepare('SELECT COUNT(DISTINCT fingerprint) as c FROM games').first() as Record<string, unknown>;

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
  const offset = (page - 1) * limit;
  const db = c.env.DB;

  const games = await db.prepare(
    `SELECT game_id, fingerprint, user_id, seed, step, score, sign, status,
     sequence_plan_id, generated_sequence_id, end_reason, ended_at, last_update_at, created_at
     FROM games ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all();

  const countResult = await db.prepare('SELECT COUNT(*) as total FROM games').first() as Record<string, unknown> | null;

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
  const game = await c.env.DB.prepare('SELECT * FROM games WHERE game_id = ?').bind(gameId).first() as Record<string, unknown> | null;
  if (!game) return c.json({ error: 'Game not found' }, 404);
  return c.json({ ...game });
});

admin.delete('/delete-game/:id', async (c) => {
  const gameId = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM games WHERE game_id = ?').bind(gameId).run();
  await c.env.DB.prepare('DELETE FROM scores WHERE game_id = ?').bind(gameId).run();
  return c.json({ success: true });
});

// ---- Stages（加分页） ----
admin.post('/stages', async (c) => {
  const { name, length, probabilities } = await c.req.json<{
    name: string; length: number; probabilities: Record<string, number>;
  }>();
  if (!name || !length || !probabilities) return c.json({ error: 'Missing fields' }, 400);

  const total = Object.values(probabilities).reduce((sum, v) => sum + v, 0);
  if (Math.abs(total - 100) > 0.01) {
    return c.json({ error: `Probabilities sum must be 100, got ${total}` }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO stages (id, name, length, probabilities, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, name, length, JSON.stringify(probabilities), now, now).run();

  return c.json({ id, name, length, probabilities, created_at: now });
});

admin.get('/stages', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const db = c.env.DB;

  const results = await db.prepare(
    'SELECT * FROM stages ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const countResult = await db.prepare('SELECT COUNT(*) as total FROM stages').first() as Record<string, unknown> | null;

  return c.json({
    stages: results.results.map((s: Record<string, unknown>) => ({
      ...s,
      probabilities: JSON.parse(s.probabilities as string),
    })),
    total: countResult?.total || 0,
    page,
    limit,
    totalPages: Math.ceil(((countResult?.total as number) || 0) / limit),
  });
});

admin.put('/stages/:id', async (c) => {
  const stageId = c.req.param('id');
  const { name, length, probabilities } = await c.req.json<{
    name?: string; length?: number; probabilities?: Record<string, number>;
  }>();

  if (probabilities) {
    const total = Object.values(probabilities).reduce((sum, v) => sum + v, 0);
    if (Math.abs(total - 100) > 0.01) {
      return c.json({ error: `Probabilities sum must be 100, got ${total}` }, 400);
    }
  }

  const existing = await c.env.DB.prepare('SELECT * FROM stages WHERE id = ?').bind(stageId).first();
  if (!existing) return c.json({ error: 'Stage not found' }, 404);

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE stages SET name = ?, length = ?, probabilities = ?, updated_at = ? WHERE id = ?'
  ).bind(
    name || existing.name as string,
    length || existing.length as number,
    probabilities ? JSON.stringify(probabilities) : existing.probabilities as string,
    now, stageId,
  ).run();

  return c.json({ success: true });
});

admin.delete('/stages/:id', async (c) => {
  const stageId = c.req.param('id');
  const ref = await c.env.DB.prepare(
    'SELECT COUNT(*) as c FROM sequence_plan_stages WHERE stage_id = ?'
  ).bind(stageId).first() as Record<string, unknown>;
  if (ref && (ref.c as number) > 0) {
    return c.json({ error: 'Stage is used by sequence plans, cannot delete' }, 400);
  }
  await c.env.DB.prepare('DELETE FROM stages WHERE id = ?').bind(stageId).run();
  return c.json({ success: true });
});

// ---- Sequence Plans（加分页） ----
admin.post('/sequence-plans', async (c) => {
  const { name, description, stages } = await c.req.json<{
    name: string; description?: string;
    stages: { stage_id: string; stage_order: number }[];
  }>();
  if (!name || !stages || stages.length === 0) {
    return c.json({ error: 'Missing fields: name and stages required' }, 400);
  }

  const planId = crypto.randomUUID();
  const now = new Date().toISOString();
  const db = c.env.DB;

  await db.prepare(
    'INSERT INTO sequence_plans (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(planId, name, description || '', now, now).run();

  for (const s of stages) {
    const linkId = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(linkId, planId, s.stage_id, s.stage_order, now).run();
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
      `SELECT sps.stage_order, s.id, s.name, s.length, s.probabilities
       FROM sequence_plan_stages sps
       JOIN stages s ON sps.stage_id = s.id
       WHERE sps.sequence_plan_id = ?
       ORDER BY sps.stage_order`
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
    `SELECT sps.stage_order, s.id, s.name, s.length, s.probabilities
     FROM sequence_plan_stages sps
     JOIN stages s ON sps.stage_id = s.id
     WHERE sps.sequence_plan_id = ?
     ORDER BY sps.stage_order`
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
    stages?: { stage_id: string; stage_order: number }[];
  }>();
  const db = c.env.DB;

  const existing = await db.prepare('SELECT * FROM sequence_plans WHERE id = ?').bind(planId).first();
  if (!existing) return c.json({ error: 'Plan not found' }, 404);

  const now = new Date().toISOString();
  await db.prepare(
    'UPDATE sequence_plans SET name = ?, description = ?, updated_at = ? WHERE id = ?'
  ).bind(
    name || existing.name as string,
    description !== undefined ? description : existing.description as string,
    now, planId,
  ).run();

  if (stages && stages.length > 0) {
    await db.prepare('DELETE FROM sequence_plan_stages WHERE sequence_plan_id = ?').bind(planId).run();
    for (const s of stages) {
      const linkId = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(linkId, planId, s.stage_id, s.stage_order, now).run();
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
  await db.prepare('DELETE FROM sequence_plan_stages WHERE sequence_plan_id = ?').bind(planId).run();
  await db.prepare('DELETE FROM sequence_plans WHERE id = ?').bind(planId).run();
  return c.json({ success: true });
});

// ---- Generated Sequences（已分页） ----
admin.post('/generate-sequence', async (c) => {
  const { sequence_plan_id, count } = await c.req.json<{
    sequence_plan_id: string; count?: number;
  }>();
  if (!sequence_plan_id) return c.json({ error: 'Missing sequence_plan_id' }, 400);

  const db = c.env.DB;
  const stagesResult = await db.prepare(
    `SELECT sps.stage_order, sps.stage_id, s.name, s.length, s.probabilities
     FROM sequence_plan_stages sps
     JOIN stages s ON sps.stage_id = s.id
     WHERE sps.sequence_plan_id = ?
     ORDER BY sps.stage_order`
  ).bind(sequence_plan_id).all();

  if (stagesResult.results.length === 0) {
    return c.json({ error: 'Plan has no stages configured' }, 400);
  }

  const planStages: PlanStageRow[] = stagesResult.results.map((s: Record<string, unknown>) => ({
    stage_id: s.stage_id as string,
    stage_order: s.stage_order as number,
    name: s.name as string,
    length: s.length as number,
    probabilities: s.probabilities as string,
  }));

  const generateCount = count || 1;
  const generated = [];

  for (let i = 0; i < generateCount; i++) {
    const sequence = await generateSequenceFromPlan(planStages);
    const seqId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db.prepare(
      `INSERT INTO generated_sequences (id, sequence_plan_id, sequence_data, sequence_length, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'enabled', ?, ?)`
    ).bind(seqId, sequence_plan_id, JSON.stringify(sequence), sequence.length, now, now).run();

    generated.push({ id: seqId, sequence_length: sequence.length, sequence_data: sequence });
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
  const { status } = await c.req.json<{ status: string }>();
  if (status !== 'enabled' && status !== 'disabled') {
    return c.json({ error: 'Status must be enabled or disabled' }, 400);
  }
  await c.env.DB.prepare(
    'UPDATE generated_sequences SET status = ?, updated_at = ? WHERE id = ?'
  ).bind(status, new Date().toISOString(), seqId).run();
  return c.json({ success: true });
});

admin.delete('/generated-sequences/:id', async (c) => {
  const seqId = c.req.param('id');
  const ref = await c.env.DB.prepare(
    'SELECT COUNT(*) as c FROM games WHERE generated_sequence_id = ?'
  ).bind(seqId).first() as Record<string, unknown>;
  if (ref && (ref.c as number) > 0) {
    return c.json({ error: 'Sequence is used by games, cannot delete' }, 400);
  }
  await c.env.DB.prepare('DELETE FROM generated_sequences WHERE id = ?').bind(seqId).run();
  return c.json({ success: true });
});

// 挂载 admin 路由到 /api/admin
app.route('/api/admin', admin);

export default app;
