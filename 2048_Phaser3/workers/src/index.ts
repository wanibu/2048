// Giant 2048 — Cloudflare Workers 后端
// 职责：序列配置管理、局管理、排行榜、Admin

import { generateSequenceFromPlan, PlanStageRow } from './sequence-config';

interface Env {
  DB: D1Database;
}

type SequenceToken = `${number}` | 'stone';

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

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

async function createGeneratedSequenceFromRandomPlan(env: Env): Promise<{
  generatedSequenceId: string;
  sequencePlanId: string;
  sequence: SequenceToken[];
} | null> {
  const plan = await env.DB.prepare(
    'SELECT id FROM sequence_plans ORDER BY RANDOM() LIMIT 1'
  ).first() as Record<string, unknown> | null;

  if (!plan) return null;

  const stagesResult = await env.DB.prepare(
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

  await env.DB.prepare(
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

async function getPlayableSequence(env: Env): Promise<{
  generatedSequenceId: string;
  sequencePlanId: string;
}> {
  const generated = await env.DB.prepare(
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

  const created = await createGeneratedSequenceFromRandomPlan(env);
  if (!created) {
    throw new Error('No enabled generated sequence and no sequence plan available');
  }
  return {
    generatedSequenceId: created.generatedSequenceId,
    sequencePlanId: created.sequencePlanId,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // ===== 开局 =====
      if (url.pathname === '/api/start-game' && request.method === 'POST') {
        const { fingerprint, userId } = await request.json() as { fingerprint: string; userId?: string };
        if (!fingerprint) return jsonResponse({ error: 'Missing fingerprint' }, 400);

        // 同一指纹的旧局自动结束
        await env.DB.prepare(
          "UPDATE games SET status = 'finished', end_reason = 'new_game', ended_at = ? WHERE fingerprint = ? AND status = 'playing'"
        ).bind(new Date().toISOString(), fingerprint).run();

        const gameId = generateGameId();
        const seed = Math.floor(Math.random() * 2147483647);
        const now = new Date().toISOString();
        const sign = await initSign(gameId);
        const { sequencePlanId, generatedSequenceId } = await getPlayableSequence(env);

        // Fetch sequence_data for slicing
        const genSeq = await env.DB.prepare(
          'SELECT sequence_data FROM generated_sequences WHERE id = ?'
        ).bind(generatedSequenceId).first() as Record<string, unknown>;

        const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, 0, 3);

        await env.DB.prepare(
          `INSERT INTO games
           (game_id, fingerprint, user_id, seed, step, score, sign, status,
            sequence_plan_id, generated_sequence_id, sequence_index, end_reason, ended_at, last_update_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          gameId,
          fingerprint,
          userId || '',
          seed,
          0,
          0,
          sign,
          'playing',
          sequencePlanId,
          generatedSequenceId,
          newIndex,
          '',
          '',
          now,
          now,
        ).run();

        return jsonResponse({
          gameId,
          tokens,
          sequencePlanId,
          generatedSequenceId,
          sign,
        });
      }

      // ===== Deprecated: 请求更多糖果 =====
      if (url.pathname === '/api/extend-sequence' && request.method === 'POST') {
        return jsonResponse({ error: 'Deprecated API: sequence is now returned only by /api/start-game' }, 410);
      }

      // ===== 取下一批 token =====
      if (url.pathname === '/api/next-token' && request.method === 'POST') {
        const { gameId } = await request.json() as { gameId: string };
        if (!gameId) return jsonResponse({ error: 'Missing gameId' }, 400);

        const game = await env.DB.prepare(
          'SELECT game_id, status, generated_sequence_id, sequence_index FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game finished' }, 400);

        const genSeq = await env.DB.prepare(
          'SELECT sequence_data FROM generated_sequences WHERE id = ?'
        ).bind(game.generated_sequence_id as string).first() as Record<string, unknown>;

        if (!genSeq) return jsonResponse({ error: 'Sequence not found' }, 500);

        const currentIndex = game.sequence_index as number;
        const { tokens, newIndex } = sliceTokens(genSeq.sequence_data as string, currentIndex, 3);

        await env.DB.prepare(
          'UPDATE games SET sequence_index = ?, last_update_at = ? WHERE game_id = ?'
        ).bind(newIndex, new Date().toISOString(), gameId).run();

        return jsonResponse({ tokens });
      }

      // ===== 每步操作：推进签名链 =====
      if (url.pathname === '/api/action' && request.method === 'POST') {
        const { gameId, action } = await request.json() as {
          gameId: string;
          action: {
            type: 'shoot' | 'rotate' | 'direct_merge';
            col?: number;
            value?: number;
            direction?: 'cw' | 'ccw';
            resultValue?: number;
          };
        };
        if (!gameId || !action) return jsonResponse({ error: 'Missing fields' }, 400);

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game finished' }, 400);

        if (action.type === 'shoot' || action.type === 'direct_merge') {
          if (action.col === undefined || action.col < 0 || action.col >= 5) {
            return jsonResponse({ error: 'Invalid column' }, 400);
          }
        }
        if (action.type === 'rotate') {
          if (action.direction !== 'cw' && action.direction !== 'ccw') {
            return jsonResponse({ error: 'Invalid direction' }, 400);
          }
        }

        const newStep = (game.step as number) + 1;
        const newSign = await chainSign(game.sign as string, action, newStep);
        const now = new Date().toISOString();

        await env.DB.prepare(
          'UPDATE games SET step = ?, sign = ?, last_update_at = ? WHERE game_id = ?'
        ).bind(newStep, newSign, now, gameId).run();

        return jsonResponse({ step: newStep, sign: newSign });
      }

      // ===== 更新分数：兼容旧前端链路 =====
      if (url.pathname === '/api/update-score' && request.method === 'POST') {
        const { gameId, score } = await request.json() as { gameId: string; score: number };
        if (!gameId || !Number.isFinite(score)) {
          return jsonResponse({ error: 'Missing or invalid fields' }, 400);
        }

        const now = new Date().toISOString();
        await env.DB.prepare(
          "UPDATE games SET score = ?, last_update_at = ? WHERE game_id = ? AND status = 'playing'"
        ).bind(score, now, gameId).run();

        return jsonResponse({ success: true });
      }

      // ===== submit-game：兼容 end-game 的别名 =====
      if (url.pathname === '/api/submit-game' && request.method === 'POST') {
        const {
          gameId,
          finalSign,
          finalScore,
          endReason,
        } = await request.json() as {
          gameId: string;
          finalSign: string;
          finalScore: number;
          endReason?: string;
        };
        if (!gameId || !finalSign || !Number.isFinite(finalScore)) {
          return jsonResponse({ error: 'Missing or invalid fields' }, 400);
        }

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game already finished' }, 400);
        if (finalSign !== game.sign) return jsonResponse({ error: 'Invalid signature' }, 403);

        const now = new Date().toISOString();
        const reason = endReason || 'gameover';

        await env.DB.prepare(
          `UPDATE games
           SET score = ?, step = ?, status = 'finished', end_reason = ?, ended_at = ?, last_update_at = ?
           WHERE game_id = ?`
        ).bind(finalScore, game.step as number, reason, now, now, gameId).run();

        await env.DB.prepare(
          'INSERT INTO scores (game_id, fingerprint, score, actions_count, sign, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(gameId, game.fingerprint as string, finalScore, game.step as number, finalSign, now).run();

        const rankResult = await env.DB.prepare(
          'SELECT COUNT(*) as rank FROM scores WHERE score > ?'
        ).bind(finalScore).first() as Record<string, unknown> | null;

        return jsonResponse({
          success: true,
          score: finalScore,
          rank: rankResult ? (rankResult.rank as number) + 1 : 1,
        });
      }

      // ===== 游戏结束：提交最终分数，并校验最终签名 =====
      if (url.pathname === '/api/end-game' && request.method === 'POST') {
        const {
          gameId,
          finalSign,
          finalScore,
          endReason,
        } = await request.json() as {
          gameId: string;
          finalSign: string;
          finalScore: number;
          endReason?: string;
        };
        if (!gameId || !finalSign || !Number.isFinite(finalScore)) {
          return jsonResponse({ error: 'Missing or invalid fields' }, 400);
        }

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game already finished' }, 400);
        if (finalSign !== game.sign) return jsonResponse({ error: 'Invalid signature' }, 403);

        const now = new Date().toISOString();
        const reason = endReason || 'gameover';

        await env.DB.prepare(
          `UPDATE games
           SET score = ?, step = ?, status = 'finished', end_reason = ?, ended_at = ?, last_update_at = ?
           WHERE game_id = ?`
        ).bind(finalScore, game.step as number, reason, now, now, gameId).run();

        await env.DB.prepare(
          'INSERT INTO scores (game_id, fingerprint, score, actions_count, sign, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(gameId, game.fingerprint as string, finalScore, game.step as number, finalSign, now).run();

        const rankResult = await env.DB.prepare(
          'SELECT COUNT(*) as rank FROM scores WHERE score > ?'
        ).bind(finalScore).first() as Record<string, unknown> | null;

        return jsonResponse({
          success: true,
          score: finalScore,
          rank: rankResult ? (rankResult.rank as number) + 1 : 1,
        });
      }

      // ===== 排行榜 =====
      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        const results = await env.DB.prepare(
          'SELECT score, actions_count, created_at FROM scores ORDER BY score DESC LIMIT 20'
        ).all();
        return jsonResponse({ leaderboard: results.results });
      }

      // ===== Admin: 登录 =====
      if (url.pathname === '/api/admin/login' && request.method === 'POST') {
        const { username, password } = await request.json() as { username: string; password: string };
        if (username === 'admin' && password === '123456') {
          const token = await sha256(`admin_token_${Date.now()}_giant2048`);
          return jsonResponse({ success: true, token });
        }
        return jsonResponse({ error: 'Invalid credentials' }, 401);
      }

      // ===== Admin: 游戏列表 =====
      if (url.pathname === '/api/admin/games' && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = 20;
        const offset = (page - 1) * limit;

        const games = await env.DB.prepare(
          `SELECT game_id, fingerprint, user_id, seed, step, score, sign, status,
           sequence_plan_id, generated_sequence_id, end_reason, ended_at, last_update_at, created_at
           FROM games ORDER BY created_at DESC LIMIT ? OFFSET ?`
        ).bind(limit, offset).all();

        const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM games').first() as Record<string, unknown> | null;

        return jsonResponse({
          games: games.results,
          total: countResult?.total || 0,
          page,
          totalPages: Math.ceil(((countResult?.total as number) || 0) / limit),
        });
      }

      // ===== Admin: 单局详情 =====
      if (url.pathname.startsWith('/api/admin/game/') && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const gameId = url.pathname.replace('/api/admin/game/', '');
        const game = await env.DB.prepare('SELECT * FROM games WHERE game_id = ?').bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);

        return jsonResponse({
          ...game,
        });
      }

      // ===== Admin: 统计 =====
      if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const totalGames = await env.DB.prepare('SELECT COUNT(*) as c FROM games').first() as Record<string, unknown>;
        const playingGames = await env.DB.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'playing'").first() as Record<string, unknown>;
        const finishedGames = await env.DB.prepare("SELECT COUNT(*) as c FROM games WHERE status = 'finished'").first() as Record<string, unknown>;
        const topScore = await env.DB.prepare('SELECT MAX(score) as m FROM scores').first() as Record<string, unknown>;
        const uniquePlayers = await env.DB.prepare('SELECT COUNT(DISTINCT fingerprint) as c FROM games').first() as Record<string, unknown>;

        return jsonResponse({
          totalGames: totalGames?.c || 0,
          playingGames: playingGames?.c || 0,
          finishedGames: finishedGames?.c || 0,
          topScore: topScore?.m || 0,
          uniquePlayers: uniquePlayers?.c || 0,
          sequencePlans: (await env.DB.prepare('SELECT COUNT(*) as c FROM sequence_plans').first() as Record<string, unknown> | null)?.c || 0,
          generatedSequences: (await env.DB.prepare('SELECT COUNT(*) as c FROM generated_sequences').first() as Record<string, unknown> | null)?.c || 0,
        });
      }

      // ===== Admin: 删除局 =====
      if (url.pathname.startsWith('/api/admin/delete-game/') && request.method === 'DELETE') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const gameId = url.pathname.replace('/api/admin/delete-game/', '');
        await env.DB.prepare('DELETE FROM games WHERE game_id = ?').bind(gameId).run();
        await env.DB.prepare('DELETE FROM scores WHERE game_id = ?').bind(gameId).run();

        return jsonResponse({ success: true });
      }

      // =============================================================
      // ===== Admin: Stage 管理 =====
      // =============================================================

      // 创建 Stage
      if (url.pathname === '/api/admin/stages' && request.method === 'POST') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const { name, length, probabilities } = await request.json() as {
          name: string; length: number; probabilities: Record<string, number>;
        };
        if (!name || !length || !probabilities) return jsonResponse({ error: 'Missing fields' }, 400);

        // 验证概率总和 = 100
        const total = Object.values(probabilities).reduce((sum, v) => sum + v, 0);
        if (Math.abs(total - 100) > 0.01) {
          return jsonResponse({ error: `Probabilities sum must be 100, got ${total}` }, 400);
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO stages (id, name, length, probabilities, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(id, name, length, JSON.stringify(probabilities), now, now).run();

        return jsonResponse({ id, name, length, probabilities, created_at: now });
      }

      // 列出所有 Stages
      if (url.pathname === '/api/admin/stages' && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const results = await env.DB.prepare(
          'SELECT * FROM stages ORDER BY created_at DESC'
        ).all();

        return jsonResponse({
          stages: results.results.map((s: Record<string, unknown>) => ({
            ...s,
            probabilities: JSON.parse(s.probabilities as string),
          })),
        });
      }

      // 更新 Stage
      if (url.pathname.match(/^\/api\/admin\/stages\/[^/]+$/) && request.method === 'PUT') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const stageId = url.pathname.split('/').pop()!;
        const { name, length, probabilities } = await request.json() as {
          name?: string; length?: number; probabilities?: Record<string, number>;
        };

        if (probabilities) {
          const total = Object.values(probabilities).reduce((sum, v) => sum + v, 0);
          if (Math.abs(total - 100) > 0.01) {
            return jsonResponse({ error: `Probabilities sum must be 100, got ${total}` }, 400);
          }
        }

        const existing = await env.DB.prepare('SELECT * FROM stages WHERE id = ?').bind(stageId).first();
        if (!existing) return jsonResponse({ error: 'Stage not found' }, 404);

        const now = new Date().toISOString();
        await env.DB.prepare(
          'UPDATE stages SET name = ?, length = ?, probabilities = ?, updated_at = ? WHERE id = ?'
        ).bind(
          name || existing.name as string,
          length || existing.length as number,
          probabilities ? JSON.stringify(probabilities) : existing.probabilities as string,
          now, stageId
        ).run();

        return jsonResponse({ success: true });
      }

      // 删除 Stage
      if (url.pathname.match(/^\/api\/admin\/stages\/[^/]+$/) && request.method === 'DELETE') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const stageId = url.pathname.split('/').pop()!;

        // 检查是否被 plan 引用
        const ref = await env.DB.prepare(
          'SELECT COUNT(*) as c FROM sequence_plan_stages WHERE stage_id = ?'
        ).bind(stageId).first() as Record<string, unknown>;
        if (ref && (ref.c as number) > 0) {
          return jsonResponse({ error: 'Stage is used by sequence plans, cannot delete' }, 400);
        }

        await env.DB.prepare('DELETE FROM stages WHERE id = ?').bind(stageId).run();
        return jsonResponse({ success: true });
      }

      // =============================================================
      // ===== Admin: Sequence Plan 管理 =====
      // =============================================================

      // 创建 Sequence Plan（含 stages 关联）
      if (url.pathname === '/api/admin/sequence-plans' && request.method === 'POST') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const { name, description, stages } = await request.json() as {
          name: string; description?: string;
          stages: { stage_id: string; stage_order: number }[];
        };
        if (!name || !stages || stages.length === 0) {
          return jsonResponse({ error: 'Missing fields: name and stages required' }, 400);
        }

        const planId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          'INSERT INTO sequence_plans (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(planId, name, description || '', now, now).run();

        // 插入 stage 关联
        for (const s of stages) {
          const linkId = crypto.randomUUID();
          await env.DB.prepare(
            'INSERT INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES (?, ?, ?, ?, ?)'
          ).bind(linkId, planId, s.stage_id, s.stage_order, now).run();
        }

        return jsonResponse({ id: planId, name, description: description || '', stages });
      }

      // 列出所有 Sequence Plans（含 stages 详情）
      if (url.pathname === '/api/admin/sequence-plans' && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const plans = await env.DB.prepare(
          'SELECT * FROM sequence_plans ORDER BY created_at DESC'
        ).all();

        const result = [];
        for (const plan of plans.results) {
          const stagesResult = await env.DB.prepare(
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

        return jsonResponse({ plans: result });
      }

      // 查看单个 Sequence Plan 详情
      if (url.pathname.match(/^\/api\/admin\/sequence-plans\/[^/]+$/) && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const planId = url.pathname.split('/').pop()!;
        const plan = await env.DB.prepare('SELECT * FROM sequence_plans WHERE id = ?').bind(planId).first();
        if (!plan) return jsonResponse({ error: 'Plan not found' }, 404);

        const stagesResult = await env.DB.prepare(
          `SELECT sps.stage_order, s.id, s.name, s.length, s.probabilities
           FROM sequence_plan_stages sps
           JOIN stages s ON sps.stage_id = s.id
           WHERE sps.sequence_plan_id = ?
           ORDER BY sps.stage_order`
        ).bind(planId).all();

        return jsonResponse({
          ...plan,
          stages: stagesResult.results.map((s: Record<string, unknown>) => ({
            ...s,
            probabilities: JSON.parse(s.probabilities as string),
          })),
          total_length: stagesResult.results.reduce((sum, s: Record<string, unknown>) => sum + (s.length as number), 0),
        });
      }

      // 更新 Sequence Plan（替换 stages 关联）
      if (url.pathname.match(/^\/api\/admin\/sequence-plans\/[^/]+$/) && request.method === 'PUT') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const planId = url.pathname.split('/').pop()!;
        const { name, description, stages } = await request.json() as {
          name?: string; description?: string;
          stages?: { stage_id: string; stage_order: number }[];
        };

        const existing = await env.DB.prepare('SELECT * FROM sequence_plans WHERE id = ?').bind(planId).first();
        if (!existing) return jsonResponse({ error: 'Plan not found' }, 404);

        const now = new Date().toISOString();
        await env.DB.prepare(
          'UPDATE sequence_plans SET name = ?, description = ?, updated_at = ? WHERE id = ?'
        ).bind(
          name || existing.name as string,
          description !== undefined ? description : existing.description as string,
          now, planId
        ).run();

        // 如果传了 stages，替换关联
        if (stages && stages.length > 0) {
          await env.DB.prepare(
            'DELETE FROM sequence_plan_stages WHERE sequence_plan_id = ?'
          ).bind(planId).run();

          for (const s of stages) {
            const linkId = crypto.randomUUID();
            await env.DB.prepare(
              'INSERT INTO sequence_plan_stages (id, sequence_plan_id, stage_id, stage_order, created_at) VALUES (?, ?, ?, ?, ?)'
            ).bind(linkId, planId, s.stage_id, s.stage_order, now).run();
          }
        }

        return jsonResponse({ success: true });
      }

      // 删除 Sequence Plan
      if (url.pathname.match(/^\/api\/admin\/sequence-plans\/[^/]+$/) && request.method === 'DELETE') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const planId = url.pathname.split('/').pop()!;

        // 检查是否有生成的序列
        const ref = await env.DB.prepare(
          'SELECT COUNT(*) as c FROM generated_sequences WHERE sequence_plan_id = ?'
        ).bind(planId).first() as Record<string, unknown>;
        if (ref && (ref.c as number) > 0) {
          return jsonResponse({ error: 'Plan has generated sequences, cannot delete' }, 400);
        }

        await env.DB.prepare('DELETE FROM sequence_plan_stages WHERE sequence_plan_id = ?').bind(planId).run();
        await env.DB.prepare('DELETE FROM sequence_plans WHERE id = ?').bind(planId).run();
        return jsonResponse({ success: true });
      }

      // =============================================================
      // ===== Admin: Generated Sequence 管理 =====
      // =============================================================

      // 生成序列（根据 plan 配置）
      if (url.pathname === '/api/admin/generate-sequence' && request.method === 'POST') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const { sequence_plan_id, count } = await request.json() as {
          sequence_plan_id: string; count?: number;
        };
        if (!sequence_plan_id) return jsonResponse({ error: 'Missing sequence_plan_id' }, 400);

        // 查 plan 的 stages
        const stagesResult = await env.DB.prepare(
          `SELECT sps.stage_order, sps.stage_id, s.name, s.length, s.probabilities
           FROM sequence_plan_stages sps
           JOIN stages s ON sps.stage_id = s.id
           WHERE sps.sequence_plan_id = ?
           ORDER BY sps.stage_order`
        ).bind(sequence_plan_id).all();

        if (stagesResult.results.length === 0) {
          return jsonResponse({ error: 'Plan has no stages configured' }, 400);
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

          await env.DB.prepare(
            `INSERT INTO generated_sequences (id, sequence_plan_id, sequence_data, sequence_length, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'enabled', ?, ?)`
          ).bind(seqId, sequence_plan_id, JSON.stringify(sequence), sequence.length, now, now).run();

          generated.push({ id: seqId, sequence_length: sequence.length, sequence_data: sequence });
        }

        return jsonResponse({ generated, count: generateCount });
      }

      // 列出生成的序列
      if (url.pathname === '/api/admin/generated-sequences' && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const planId = url.searchParams.get('plan_id');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = 20;
        const offset = (page - 1) * limit;

        let query = 'SELECT gs.*, sp.name as plan_name FROM generated_sequences gs LEFT JOIN sequence_plans sp ON gs.sequence_plan_id = sp.id';
        const params: unknown[] = [];

        if (planId) {
          query += ' WHERE gs.sequence_plan_id = ?';
          params.push(planId);
        }
        query += ' ORDER BY gs.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const results = await env.DB.prepare(query).bind(...params).all();

        let countQuery = 'SELECT COUNT(*) as total FROM generated_sequences';
        const countParams: unknown[] = [];
        if (planId) {
          countQuery += ' WHERE sequence_plan_id = ?';
          countParams.push(planId);
        }
        const countResult = await env.DB.prepare(countQuery).bind(...countParams).first() as Record<string, unknown>;

        return jsonResponse({
          sequences: results.results.map((s: Record<string, unknown>) => ({
            ...s,
            sequence_data: JSON.parse(s.sequence_data as string),
          })),
          total: countResult?.total || 0,
          page,
          totalPages: Math.ceil(((countResult?.total as number) || 0) / limit),
        });
      }

      // 查看单条生成序列详情
      if (url.pathname.match(/^\/api\/admin\/generated-sequences\/[^/]+$/) && request.method === 'GET') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const seqId = url.pathname.split('/').pop()!;
        const seq = await env.DB.prepare(
          'SELECT gs.*, sp.name as plan_name FROM generated_sequences gs LEFT JOIN sequence_plans sp ON gs.sequence_plan_id = sp.id WHERE gs.id = ?'
        ).bind(seqId).first() as Record<string, unknown> | null;

        if (!seq) return jsonResponse({ error: 'Sequence not found' }, 404);

        return jsonResponse({
          ...seq,
          sequence_data: JSON.parse(seq.sequence_data as string),
        });
      }

      // 更新序列状态（enabled/disabled）
      if (url.pathname.match(/^\/api\/admin\/generated-sequences\/[^/]+$/) && request.method === 'PUT') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const seqId = url.pathname.split('/').pop()!;
        const { status } = await request.json() as { status: string };

        if (status !== 'enabled' && status !== 'disabled') {
          return jsonResponse({ error: 'Status must be enabled or disabled' }, 400);
        }

        const now = new Date().toISOString();
        await env.DB.prepare(
          'UPDATE generated_sequences SET status = ?, updated_at = ? WHERE id = ?'
        ).bind(status, now, seqId).run();

        return jsonResponse({ success: true });
      }

      // 删除生成的序列
      if (url.pathname.match(/^\/api\/admin\/generated-sequences\/[^/]+$/) && request.method === 'DELETE') {
        const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!authToken) return jsonResponse({ error: 'Unauthorized' }, 401);

        const seqId = url.pathname.split('/').pop()!;

        // 检查是否有游戏在使用
        const ref = await env.DB.prepare(
          'SELECT COUNT(*) as c FROM games WHERE generated_sequence_id = ?'
        ).bind(seqId).first() as Record<string, unknown>;
        if (ref && (ref.c as number) > 0) {
          return jsonResponse({ error: 'Sequence is used by games, cannot delete' }, 400);
        }

        await env.DB.prepare('DELETE FROM generated_sequences WHERE id = ?').bind(seqId).run();
        return jsonResponse({ success: true });
      }

      return jsonResponse({ error: 'Not Found' }, 404);

    } catch (e) {
      console.error(e);
      return jsonResponse({ error: 'Internal error' }, 500);
    }
  },
};
