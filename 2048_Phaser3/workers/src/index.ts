// 复用前端的共享类型和签名逻辑
interface GameAction {
  step: number;
  type: 'shoot' | 'rotate' | 'direct_merge';
  col?: number;
  value?: number;
  direction?: 'cw' | 'ccw';
  resultValue?: number;
}

interface GameRecord {
  actions: GameAction[];
  finalScore: number;
  finalSign: string;
  seed: number;
}

interface Env {
  DB: D1Database;
}

// SHA-256 hash
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function chainSign(prevSign: string, action: GameAction): Promise<string> {
  const actionStr = JSON.stringify(action);
  return sha256(prevSign + actionStr);
}

async function initSign(seed: number): Promise<string> {
  return sha256(`giant2048_seed_${seed}`);
}

// 验证游戏记录签名
async function verifyRecord(record: GameRecord): Promise<boolean> {
  let sign = await initSign(record.seed);
  for (const action of record.actions) {
    sign = await chainSign(sign, action);
  }
  return sign === record.finalSign;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // 提交分数
    if (url.pathname === '/api/submit-score' && request.method === 'POST') {
      try {
        const record = await request.json() as GameRecord;

        // 验证签名
        const isValid = await verifyRecord(record);
        if (!isValid) {
          return new Response(JSON.stringify({ error: 'Invalid signature' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // 存入 D1
        await env.DB.prepare(
          'INSERT INTO scores (score, actions_count, seed, sign, created_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(
          record.finalScore,
          record.actions.length,
          record.seed,
          record.finalSign,
          new Date().toISOString()
        ).run();

        return new Response(JSON.stringify({ success: true, score: record.finalScore }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 获取排行榜
    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      try {
        const results = await env.DB.prepare(
          'SELECT score, actions_count, created_at FROM scores ORDER BY score DESC LIMIT 20'
        ).all();

        return new Response(JSON.stringify({ leaderboard: results.results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ leaderboard: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
