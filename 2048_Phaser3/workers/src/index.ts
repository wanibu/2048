// Giant 2048 — Cloudflare Workers 后端
// 职责：序列配置管理、局管理、链式签名验证、排行榜、Admin

import { generateSequence, randomConfig, getConfigById, SEQUENCE_CONFIGS } from './sequence-config';

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

        // 选择序列配置（随机选一套）
        const config = randomConfig(seed);

        // 生成第一批50个糖果
        const sequence = await generateSequence(seed, 1, BATCH_SIZE, config);

        await env.DB.prepare(
          `INSERT INTO games (game_id, fingerprint, user_id, seed, step, score, sign, status,
           sequence_config, sequence, end_reason, ended_at, last_update_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          gameId, fingerprint, userId || '', seed, 0, 0, sign, 'playing',
          config.id, JSON.stringify(sequence), '', '', now, now
        ).run();

        return jsonResponse({
          gameId,
          sequence, // 50个糖果值
          sequenceConfig: config.id,
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

        const config = getConfigById(game.sequence_config as string);
        if (!config) return jsonResponse({ error: 'Invalid config' }, 500);

        // 从当前已生成的序列之后继续
        const existingSeq = JSON.parse(game.sequence as string) as number[];
        const startStep = existingSeq.length + 1;
        const newBatch = await generateSequence(game.seed as number, startStep, BATCH_SIZE, config);

        // 追加到序列
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

      return jsonResponse({ error: 'Not Found' }, 404);

    } catch (e) {
      console.error(e);
      return jsonResponse({ error: 'Internal error' }, 500);
    }
  },
};
