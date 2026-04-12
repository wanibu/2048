// Giant 2048 — Cloudflare Workers 后端
// 职责：开局管理、糖果序列生成、链式签名验证、排行榜

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

// 可生成的糖果池
const SPAWN_POOL = [2, 4, 8, 16, 32];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// SHA-256 hash
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 链式签名
async function chainSign(prevSign: string, action: GameAction, step: number): Promise<string> {
  const actionStr = JSON.stringify({ step, ...action });
  return sha256(prevSign + actionStr);
}

// 初始签名
async function initSign(gameId: string): Promise<string> {
  return sha256(`giant2048_game_${gameId}`);
}

// 确定性随机糖果生成：用 seed + step 决定糖果值
// seed 不发给前端，前端无法预测
async function generateCandy(seed: number, step: number): Promise<number> {
  const hash = await sha256(`${seed}_candy_${step}`);
  const index = parseInt(hash.slice(0, 8), 16) % SPAWN_POOL.length;
  return SPAWN_POOL[index];
}

// 生成唯一 gameId
function generateGameId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `g_${timestamp}_${random}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      // ===== 开局 =====
      if (url.pathname === '/api/start-game' && request.method === 'POST') {
        const { fingerprint } = await request.json() as { fingerprint: string };
        if (!fingerprint) return jsonResponse({ error: 'Missing fingerprint' }, 400);

        const gameId = generateGameId();
        const seed = Math.floor(Math.random() * 2147483647);
        const sign = await initSign(gameId);

        // 用 seed 生成第1个和第2个糖果
        const currentCandy = await generateCandy(seed, 0);
        const nextCandy = await generateCandy(seed, 1);

        // 存入 D1
        await env.DB.prepare(
          'INSERT INTO games (game_id, fingerprint, seed, step, score, sign, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(gameId, fingerprint, seed, 0, 0, sign, 'playing', new Date().toISOString()).run();

        return jsonResponse({
          gameId,
          currentCandy,
          nextCandy,
          sign,
        });
      }

      // ===== 每步操作 =====
      if (url.pathname === '/api/action' && request.method === 'POST') {
        const { gameId, action } = await request.json() as { gameId: string; action: GameAction };
        if (!gameId || !action) return jsonResponse({ error: 'Missing gameId or action' }, 400);

        // 查询当前局状态
        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game already finished' }, 400);

        // 验证 action 合法性
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

        // 生成下一个糖果（用 seed + newStep+1）
        const nextCandy = await generateCandy(game.seed as number, newStep + 1);

        // 更新 games 表
        await env.DB.prepare(
          'UPDATE games SET step = ?, sign = ?, score = score WHERE game_id = ?'
        ).bind(newStep, newSign, gameId).run();

        return jsonResponse({
          step: newStep,
          sign: newSign,
          nextCandy,
        });
      }

      // ===== 更新分数（合并后前端上报） =====
      if (url.pathname === '/api/update-score' && request.method === 'POST') {
        const { gameId, score } = await request.json() as { gameId: string; score: number };
        if (!gameId) return jsonResponse({ error: 'Missing gameId' }, 400);

        await env.DB.prepare(
          'UPDATE games SET score = ? WHERE game_id = ? AND status = ?'
        ).bind(score, gameId, 'playing').run();

        return jsonResponse({ success: true });
      }

      // ===== 游戏结束 =====
      if (url.pathname === '/api/end-game' && request.method === 'POST') {
        const { gameId, finalSign } = await request.json() as { gameId: string; finalSign: string };
        if (!gameId || !finalSign) return jsonResponse({ error: 'Missing fields' }, 400);

        const game = await env.DB.prepare(
          'SELECT * FROM games WHERE game_id = ?'
        ).bind(gameId).first() as Record<string, unknown> | null;

        if (!game) return jsonResponse({ error: 'Game not found' }, 404);
        if (game.status !== 'playing') return jsonResponse({ error: 'Game already finished' }, 400);

        // 验证签名
        if (finalSign !== game.sign) {
          return jsonResponse({ error: 'Invalid signature, score rejected' }, 403);
        }

        // 标记结束
        await env.DB.prepare(
          'UPDATE games SET status = ? WHERE game_id = ?'
        ).bind('finished', gameId).run();

        // 写入排行榜
        await env.DB.prepare(
          'INSERT INTO scores (game_id, fingerprint, score, actions_count, sign, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(
          gameId,
          game.fingerprint as string,
          game.score as number,
          game.step as number,
          finalSign,
          new Date().toISOString()
        ).run();

        // 查排名
        const rankResult = await env.DB.prepare(
          'SELECT COUNT(*) as rank FROM scores WHERE score > ?'
        ).bind(game.score as number).first() as Record<string, unknown> | null;
        const rank = rankResult ? (rankResult.rank as number) + 1 : 1;

        return jsonResponse({
          success: true,
          score: game.score,
          rank,
        });
      }

      // ===== 排行榜 =====
      if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
        const results = await env.DB.prepare(
          'SELECT score, actions_count, created_at FROM scores ORDER BY score DESC LIMIT 20'
        ).all();

        return jsonResponse({ leaderboard: results.results });
      }

      return jsonResponse({ error: 'Not Found' }, 404);

    } catch (e) {
      console.error(e);
      return jsonResponse({ error: 'Internal error' }, 500);
    }
  },
};
