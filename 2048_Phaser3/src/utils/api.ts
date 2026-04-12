// 后端 API 客户端
// 和 Cloudflare Workers 通信：开局、每步操作、结局

const API_BASE = ((window as unknown) as Record<string, unknown>).__API_URL__ as string
  || 'https://giant-2048-api.xdreamstar2025.workers.dev';

interface StartGameResponse {
  gameId: string;
  currentCandy: number;
  nextCandy: number;
  sign: string;
}

interface ActionResponse {
  step: number;
  sign: string;
  nextCandy: number;
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

// 开局：获取 gameId + 第1个和第2个糖果
export async function startGame(fingerprint: string): Promise<StartGameResponse> {
  return post<StartGameResponse>('/api/start-game', { fingerprint });
}

// 每步操作：发送 action，获取下一个糖果
export async function sendAction(gameId: string, action: GameAction): Promise<ActionResponse> {
  return post<ActionResponse>('/api/action', { gameId, action });
}

// 更新分数
export async function updateScore(gameId: string, score: number): Promise<void> {
  await post('/api/update-score', { gameId, score });
}

// 游戏结束
export async function endGame(gameId: string, finalSign: string): Promise<EndGameResponse> {
  return post<EndGameResponse>('/api/end-game', { gameId, finalSign });
}
