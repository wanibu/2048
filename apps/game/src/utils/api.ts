// 后端 API 客户端

const API_BASE = import.meta.env.VITE_API_URL as string;

export type SequenceToken = `${number}` | 'stone';

interface StartGameResponse {
  gameId: string;
  tokens: SequenceToken[];
  sequencePlanId: string;
  generatedSequenceId: string;
  sign: string;
}

interface NextTokenResponse {
  tokens: SequenceToken[];
}

interface ActionResponse {
  step: number;
  sign: string;
}

interface EndGameResponse {
  success: boolean;
  score: number;
  rank: number;
}

interface GameAction {
  type: 'shoot' | 'rotate' | 'direct_merge';
  col?: number;
  value?: number;
  direction?: 'cw' | 'ccw';
  resultValue?: number;
}

interface UpdateScorePayload {
  gameId: string;
  score: number;
}

interface EndGamePayload {
  gameId: string;
  finalSign: string;
  finalScore: number;
  endReason?: string;
}

let apiCallSeq = 0;

async function post<T>(path: string, body: unknown): Promise<T> {
  const seq = ++apiCallSeq;
  const t0 = performance.now();
  console.log(`[api #${seq}] → POST ${path}`, body);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const dur = (performance.now() - t0).toFixed(0);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      console.warn(`[api #${seq}] ✗ POST ${path} ${res.status} (${dur}ms)`, err);
      throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`);
    }
    const data = await res.json() as T;
    console.log(`[api #${seq}] ✓ POST ${path} 200 (${dur}ms)`, data);
    return data;
  } catch (e) {
    const dur = (performance.now() - t0).toFixed(0);
    console.error(`[api #${seq}] ✗ POST ${path} throw (${dur}ms)`, e);
    throw e;
  }
}

// 开局：获取初始 tokens（前几个），后续通过 nextToken 按需拉取。
// planName / sequenceName：可选，按 plan name + sequence name 强制选用某条 sequence；查不到 fallback 到随机
export async function startGame(
  fingerprint: string,
  userId?: string,
  planName?: string,
  sequenceName?: string,
): Promise<StartGameResponse> {
  return post<StartGameResponse>('/api/start-game', { fingerprint, userId, planName, sequenceName });
}

// 按需拉取下一批 tokens。
export async function nextToken(gameId: string): Promise<NextTokenResponse> {
  return post<NextTokenResponse>('/api/next-token', { gameId });
}

// 每步操作：保留签名链。
export async function sendAction(gameId: string, action: GameAction): Promise<ActionResponse> {
  return post<ActionResponse>('/api/action', { gameId, action });
}

// 实时更新分数：保留旧接口，方便兼容现有前端链路。
export async function updateScore(payload: UpdateScorePayload): Promise<void> {
  await post('/api/update-score', payload);
}

// 游戏结束：提交最终分数，并带上最终签名。
export async function endGame(payload: EndGamePayload): Promise<EndGameResponse> {
  return post<EndGameResponse>('/api/end-game', payload);
}

// 兼容接口：submit-game 与 end-game 语义一致。
export async function submitGame(payload: EndGamePayload): Promise<EndGameResponse> {
  return post<EndGameResponse>('/api/submit-game', payload);
}
