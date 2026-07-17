// Lightweight API client for the Agro Supply Chain API (agro-api).
// Attaches JWT from localStorage, unwraps { data } responses, throws ApiError.

const BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:3002/api";
export const FILE_BASE = (import.meta as any).env?.VITE_FILE_BASE || "http://localhost:3002";

const TOKEN_KEY = "agro_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(BASE.replace(/\/$/, "") + "/" + path.replace(/^\//, ""));
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function handle(res: Response): Promise<any> {
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  if (!res.ok) {
    if (res.status === 401) {
      // token invalid/expired → force re-login. Clear BOTH token and the
      // persisted user, otherwise a stale user bounces /login → dashboard → 401.
      setToken(null);
      localStorage.removeItem("agro_user");
      if (!location.pathname.startsWith("/login")) location.href = "/login";
    }
    const msg = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, json);
  }
  return json;
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { ...(extra || {}) };
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export const api = {
  /** GET → returns response.data if present, else the raw json. */
  async get<T = any>(path: string, query?: Query): Promise<T> {
    const json = await handle(await fetch(buildUrl(path, query), { headers: authHeaders() }));
    return (json && json.data !== undefined ? json.data : json) as T;
  },
  /** GET returning the full envelope (message, data, token, ...). */
  async getRaw<T = any>(path: string, query?: Query): Promise<T> {
    return handle(await fetch(buildUrl(path, query), { headers: authHeaders() }));
  },
  async post<T = any>(path: string, body?: any): Promise<T> {
    const json = await handle(await fetch(buildUrl(path), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body ?? {}),
    }));
    return (json && json.data !== undefined ? json.data : json) as T;
  },
  async postRaw<T = any>(path: string, body?: any): Promise<T> {
    return handle(await fetch(buildUrl(path), {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body ?? {}),
    }));
  },
  async put<T = any>(path: string, body?: any): Promise<T> {
    const json = await handle(await fetch(buildUrl(path), {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body ?? {}),
    }));
    return (json && json.data !== undefined ? json.data : json) as T;
  },
  async del<T = any>(path: string): Promise<T> {
    return handle(await fetch(buildUrl(path), { method: "DELETE", headers: authHeaders() }));
  },
  /** multipart upload (FormData). Do not set Content-Type manually. */
  async upload<T = any>(path: string, form: FormData, method: "POST" | "PUT" = "POST"): Promise<T> {
    const json = await handle(await fetch(buildUrl(path), { method, headers: authHeaders(), body: form }));
    return (json && json.data !== undefined ? json.data : json) as T;
  },
};

export function fileUrl(p?: string | null): string | undefined {
  if (!p) return undefined;
  if (/^https?:\/\//.test(p)) return p;
  return FILE_BASE.replace(/\/$/, "") + "/" + p.replace(/^\//, "");
}
