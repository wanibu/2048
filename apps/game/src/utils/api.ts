// 后端 API 客户端 — 新协议（/game/...，sign: header）

const API_BASE = import.meta.env.VITE_API_URL as string;

export type SequenceToken = `${number}` | 'stone';

interface InitGameResponse {
  gameId: string;
  tokens: SequenceToken[];
  sequencePlanId: string;
  generatedSequenceId: string;
  sign: string;
}

interface UserInfo {
  userId: string;
  kolUserId: string;
  platformId: string;
  appId: string;
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
let cachedToken: string = '';

// 由 GameScene 在 create() 解 URL 后调一次设进来；之后所有 /game/* 请求带这个 token
export function setGameToken(token: string): void {
  cachedToken = token;
}
export function getGameToken(): string {
  return cachedToken;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const seq = ++apiCallSeq;
  const t0 = performance.now();
  console.log(`[api #${seq}] → POST ${path}`, body ?? '');
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (cachedToken) headers['sign'] = cachedToken;
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body ?? {}),
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

interface AuthLoginResponse {
  token: string;
  user: {
    userId: string;
    kolUserId: string;
    platformId: string;
    appId: string;
    nickname: string;
    avatar: string;
    score: string;
    currency: string;
  };
  super86Verified: boolean;
}

// 用 super86 长 JWT (gameToken) 换我们的内部 short token
// 这是公开接口（不需要 sign header），调用前 cachedToken 还没设
export async function authLogin(gameToken: string): Promise<AuthLoginResponse> {
  return post<AuthLoginResponse>('/game/auth/login', { gameToken });
}

// 开局：返回初始 tokens、gameId、sign。后续 /game/2048/next-token 按需拉。
export async function gameInit(): Promise<InitGameResponse> {
  return post<InitGameResponse>('/game/game/init');
}

// 当前用户信息（解 token 出来）
export async function gameUser(): Promise<UserInfo> {
  return post<UserInfo>('/game/game/user');
}

// 按需拉取下一批 tokens。
export async function nextToken(gameId: string): Promise<NextTokenResponse> {
  return post<NextTokenResponse>('/game/2048/next-token', { gameId });
}

// 每步操作：保留签名链。
export async function sendAction(gameId: string, action: GameAction): Promise<ActionResponse> {
  return post<ActionResponse>('/game/2048/action', { gameId, action });
}

// 实时更新分数。
export async function updateScore(payload: UpdateScorePayload): Promise<void> {
  await post('/game/2048/update-score', payload);
}

// 游戏结束：提交最终分数，并带上最终签名。
export async function endGame(payload: EndGamePayload): Promise<EndGameResponse> {
  return post<EndGameResponse>('/game/2048/end-game', payload);
}
