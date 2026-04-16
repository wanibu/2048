// Giant 2048 — Cloudflare Workers 后端
// 职责：序列配置管理、局管理、链式签名验证、排行榜、Admin

import { generateSequence, randomConfig, getConfigById, SEQUENCE_CONFIGS, generateSequenceFromPlan, PlanStageRow } from './sequence-config';

interface GameAction {
  type: 'shoot' | 'rotate' | 'direct_merge';
  col?: number;
  value?: number;
  direction?: 'cw' | 'ccw';
  resultValue?: number;
}

interface Env {
  DB: D1Database;
}

const BATCH_SIZE = 50; // 每批生成50个糖果

// CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

async function chainSign(prevSign: string, action: GameAction, step: number): Promise<string> {
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
        const sign = await initSign(gameId);
        const now = new Date().toISOString();

        // 优先从预生成序列中随机取一条 enabled 的
        const genSeq = await env.DB.prepare(
          "SELECT * FROM generated_sequences WHERE status = 'enabled' ORDER BY RANDOM() LIMIT 1"
        ).first() as Record<string, unknown> | null;

        let sequence: (string | number)[];
        let sequenceConfig: string;
        let generatedSequenceId = '';

        if (genSeq) {
          // 使用预生成序列
          const fullSeq = JSON.parse(genSeq.sequence_data as string) as string[];
          sequence = fullSeq.slice(0, BATCH_SIZE);
          sequenceConfig = `plan:${genSeq.sequence_plan_id}`;
          generatedSequenceId = genSeq.id as string;
        } else {
          // 没有预生成序列时，降级用旧的硬编码配置
          const config = randomConfig(seed);
          sequence = await generateSequence(seed, 1, BATCH_SIZE, config);
          sequenceConfig = config.id;
        }

        await env.DB.prepare(
          `INSERT INTO games (game_id, fingerprint, user_id, seed, step, score, sign, status,
           sequence_config, sequence, end_reason, ended_at, last_update_at, created_at, generated_sequence_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          gameId, fingerprint, userId || '', seed, 0, 0, sign, 'playing',
          sequenceConfig, JSON.stringify(sequence), '', '', now, now, generatedSequenceId
        ).run();

        return jsonResponse({
          gameId,
          sequence,
          sequenceConfig,
          sign,
        });
      }

      // ===== 请求更多糖果（50个用完后） =====
      if (url.pathname === '/api/extend-sequence' && request.method === 'POST') {
        const { gameId } = await request.json() as { gameId: string };
        if (!gameId) return jsonResponse({ error: 'Missing gameId' }, 400);

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game finished' }, 400);

        const existingSeq = JSON.parse(game.sequence as string) as (string | number)[];
        const genSeqId = game.generated_sequence_id as string;

        let newBatch: (string | number)[];

        if (genSeqId) {
          // 预生成序列模式：从完整序列中继续切片
          const genSeq = await env.DB.prepare(
            'SELECT sequence_data FROM generated_sequences WHERE id = ?'
          ).bind(genSeqId).first() as Record<string, unknown> | null;

          if (!genSeq) return jsonResponse({ error: 'Generated sequence not found' }, 500);

          const fullSeq = JSON.parse(genSeq.sequence_data as string) as string[];
          const startIndex = existingSeq.length;
          newBatch = fullSeq.slice(startIndex, startIndex + BATCH_SIZE);

          if (newBatch.length === 0) {
            return jsonResponse({ error: 'Sequence exhausted', sequence: [], startIndex });
          }
        } else {
          // 旧版模式：动态生成
          const config = getConfigById(game.sequence_config as string);
          if (!config) return jsonResponse({ error: 'Invalid config' }, 500);

          const startStep = existingSeq.length + 1;
          newBatch = await generateSequence(game.seed as number, startStep, BATCH_SIZE, config);
        }

        // 追加到序列记录
        const fullSequence = [...existingSeq, ...newBatch];
        await env.DB.prepare(
          'UPDATE games SET sequence = ? WHERE game_id = ?'
        ).bind(JSON.stringify(fullSequence), gameId).run();

        return jsonResponse({ sequence: newBatch, startIndex: existingSeq.length });
      }

      // ===== 每步操作 =====
      if (url.pathname === '/api/action' && request.method === 'POST') {
        const { gameId, action } = await request.json() as { gameId: string; action: GameAction };
        if (!gameId || !action) return jsonResponse({ error: 'Missing fields' }, 400);

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game finished' }, 400);

        // 验证 action 合法性
        if (action.type === 'shoot' || action.type === 'direct_merge') {
          if (action.col === undefined || action.col < 0 || action.col >= 5)
            return jsonResponse({ error: 'Invalid column' }, 400);
        }
        if (action.type === 'rotate') {
          if (action.direction !== 'cw' && action.direction !== 'ccw')
            return jsonResponse({ error: 'Invalid direction' }, 400);
        }

        const newStep = (game.step as number) + 1;
        const newSign = await chainSign(game.sign as string, action, newStep);
        const now = new Date().toISOString();

        await env.DB.prepare(
          'UPDATE games SET step = ?, sign = ?, last_update_at = ? WHERE game_id = ?'
        ).bind(newStep, newSign, now, gameId).run();

        return jsonResponse({ step: newStep, sign: newSign });
      }

      // ===== 更新分数 =====
      if (url.pathname === '/api/update-score' && request.method === 'POST') {
        const { gameId, score } = await request.json() as { gameId: string; score: number };
        if (!gameId) return jsonResponse({ error: 'Missing gameId' }, 400);

        const now = new Date().toISOString();
        await env.DB.prepare(
          "UPDATE games SET score = ?, last_update_at = ? WHERE game_id = ? AND status = 'playing'"
        ).bind(score, now, gameId).run();

        return jsonResponse({ success: true });
      }

      // ===== 游戏结束 =====
      if (url.pathname === '/api/end-game' && request.method === 'POST') {
        const { gameId, finalSign, endReason } = await request.json() as {
          gameId: string; finalSign: string; endReason?: string;
        };
        if (!gameId || !finalSign) return jsonResponse({ error: 'Missing fields' }, 400);

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game already finished' }, 400);

        if (finalSign !== game.sign) {
          return jsonResponse({ error: 'Invalid signature' }, 403);
        }

        const now = new Date().toISOString();
        const reason = endReason || 'gameover';

        await env.DB.prepare(
          "UPDATE games SET status = 'finished', end_reason = ?, ended_at = ? WHERE game_id = ?"
        ).bind(reason, now, gameId).run();

        await env.DB.prepare(
          'INSERT INTO scores (game_id, fingerprint, score, actions_count, sign, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(gameId, game.fingerprint as string, game.score as number, game.step as number, finalSign, now).run();

        const rankResult = await env.DB.prepare(
          'SELECT COUNT(*) as rank FROM scores WHERE score > ?'
        ).bind(game.score as number).first() as Record<string, unknown> | null;

        return jsonResponse({
          success: true,
          score: game.score,
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
           sequence_config, end_reason, ended_at, last_update_at, created_at
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
          sequence: JSON.parse((game.sequence as string) || '[]'),
          signValid: true,
          suspiciousFlags: [],
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
          configs: SEQUENCE_CONFIGS.map(c => ({ id: c.id, name: c.name })),
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
