// 后端 API 客户端

const API_BASE = ((window as unknown) as Record<string, unknown>).__API_URL__ as string
  || 'https://giant-2048-api.xdreamstar2025.workers.dev';

export type SequenceToken = `${number}` | 'stone';

interface StartGameResponse {
  gameId: string;
  sequence: SequenceToken[];
  sequencePlanId: string;
  generatedSequenceId: string;
}

interface SubmitGameResponse {
  success: boolean;
  score: number;
  rank: number;
}

interface SubmitGamePayload {
  gameId: string;
  finalScore: number;
  actionsCount: number;
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

// 整局结束后一次性提交结果。
export async function submitGame(payload: SubmitGamePayload): Promise<SubmitGameResponse> {
  return post<SubmitGameResponse>('/api/submit-game', payload);
}
