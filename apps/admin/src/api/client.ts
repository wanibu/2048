// API 封装：带 admin token 的 fetch

const TOKEN_KEY = 'admin_token';
const API_BASE = import.meta.env.VITE_API_BASE || '';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  status: number;
  error: string;
  [key: string]: unknown;
}

let apiSeq = 0;

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; noAuth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, noAuth = false } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!noAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const seq = ++apiSeq;
  const t0 = performance.now();
  console.log(`[admin-api #${seq}] → ${method} ${path}`, body ?? '');

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const dur = (performance.now() - t0).toFixed(0);

  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // not JSON
    }
    const err: ApiError = {
      ...body,
      status: res.status,
      error: (body.error as string) || res.statusText || 'Request failed',
    };
    console.warn(`[admin-api #${seq}] ✗ ${method} ${path} → ${res.status} (${dur}ms)`, err);
    throw err;
  }

  const data = await res.json() as T;
  console.log(`[admin-api #${seq}] ✓ ${method} ${path} → 200 (${dur}ms)`, data);
  return data;
}

export async function login(username: string, password: string): Promise<string> {
  const res = await api<{ success: boolean; token: string }>('/api/admin/login', {
    method: 'POST',
    body: { username, password },
    noAuth: true,
  });
  if (!res.success || !res.token) throw { status: 401, error: 'Login failed' };
  setToken(res.token);
  return res.token;
}
