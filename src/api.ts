export const API = '/api';
export function authHeaders(): Record<string,string> { const token = localStorage.getItem('pjpw_token'); return token ? { Authorization: `Bearer ${token}` } : {}; }
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  for (const [key, value] of Object.entries(authHeaders())) headers.set(key, value);
  const response = await fetch(`${API}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Request complete nahi ho payi');
  return payload as T;
}
