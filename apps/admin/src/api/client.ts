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
}

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

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = '';
    try {
      const j = await res.json();
      msg = (j as Record<string, unknown>)?.error as string || '';
    } catch {
      msg = res.statusText;
    }
    const err: ApiError = { status: res.status, error: msg || 'Request failed' };
    throw err;
  }

  return res.json() as Promise<T>;
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
