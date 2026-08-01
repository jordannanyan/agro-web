import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, getToken, setToken } from "../lib/api";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  position?: string;
  /** Display label of the role — admins may rename it, so never gate on this. */
  role?: string | null;
  /** Stable slug (FIELD_ADMIN, PROCUREMENT, …) — all access checks use this. */
  role_code?: string | null;
  role_id?: number | null;
  entity_id?: number | null;
  entity?: { id: number; entities_name: string } | null;
}

interface AuthValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);
const USER_KEY = "agro_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  // Validate token on mount (refresh /me).
  useEffect(() => {
    let alive = true;
    async function init() {
      if (!getToken()) {
        // No token → any persisted user is stale. Clearing it prevents a
        // login↔dashboard redirect loop (Login sends a truthy user to "/",
        // dashboard has no token → 401 → back to /login → repeat).
        localStorage.removeItem(USER_KEY);
        if (alive) { setUser(null); setLoading(false); }
        return;
      }
      try {
        const res = await api.getRaw<{ user: any }>("me");
        // /me returns { user: { id, type, role, data } } — normalize to AuthUser
        const u = res.user;
        if (alive && u) {
          const merged: AuthUser = {
            id: u.id,
            name: u.data?.name ?? user?.name ?? u.data?.username ?? "",
            username: u.data?.username ?? "",
            email: u.data?.email,
            position: u.data?.position,
            role: u.role,
            role_code: u.roleCode ?? user?.role_code ?? null,
            role_id: u.data?.role_id ?? null,
            entity_id: u.data?.entity_id ?? null,
            entity: user?.entity ?? null,
          };
          setUser(merged);
          localStorage.setItem(USER_KEY, JSON.stringify(merged));
        }
      } catch {
        setToken(null);
        localStorage.removeItem(USER_KEY);
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    }
    init();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(username: string, password: string) {
    const res = await api.postRaw<{ token: string; user: AuthUser }>("login", { username, password });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }

  function logout() {
    api.post("logout").catch(() => undefined);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    location.href = "/login";
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function initials(name?: string): string {
  if (!name) return "?";
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("");
}
