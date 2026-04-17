// 后端 API 客户端

const API_BASE = import.meta.env.VITE_API_URL as string;

export type SequenceToken = `${number}` | 'stone';

interface StartGameResponse {
  gameId: string;
  sequence: SequenceToken[];
  sequencePlanId: string;
  generatedSequenceId: string;
  sign: string;
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

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as Record<string, string>).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// 开局：获取本局完整序列。当前糖果、下一个糖果和 stone 指令都只来自这里。
export async function startGame(fingerprint: string, userId?: string): Promise<StartGameResponse> {
  return post<StartGameResponse>('/api/start-game', { fingerprint, userId });
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
