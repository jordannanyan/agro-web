// What happened that you should know about.
//
// Deliberately a separate list from the inbox counts in ./inbox.ts, and worth
// keeping separate: the inbox answers "what is waiting for me to do", and this
// answers "what has already happened that I would otherwise have to ask about" —
// my request came out approved, the order I have to pay for cleared, the goods I
// will receive have been paid for. Mixing them would make the number on the bell
// mean two things at once, and a number that means two things gets ignored.

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export interface AppNotification {
  id: number;
  kind: "pr_approved" | "po_approved" | "payreq_paid" | "goods_in_transit" | string;
  title: string;
  body: string | null;
  document_type: string | null;
  document_id: number | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const REFRESH_EVENT = "notifications:refresh";
const POLL_MS = 60_000;

/** Ask every mounted listener to reload — call after acting on something. */
export function refreshNotifications() {
  window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
}

export function useNotifications(enabled: boolean) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await api.getRaw<{ data: AppNotification[]; unread: number }>("notifications", { limit: 30 });
      setItems(res?.data || []);
      setUnread(Number(res?.unread || 0));
    } catch {
      // A failed poll keeps what is on screen. Flashing an empty list every time
      // the network hiccups is how people learn to distrust the bell.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    load();
    const t = setInterval(load, POLL_MS);
    const onRefresh = () => load();
    const onFocus = () => load();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, load]);

  const markRead = useCallback(async (id: number) => {
    // Optimistic: the row greys out at once. The reload that follows is what makes
    // it true, and a failure simply leaves it unread again on the next poll.
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnread((n) => Math.max(0, n - 1));
    try { await api.post(`notifications/${id}/read`, {}); } catch { /* the poll corrects it */ }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnread(0);
    try { await api.post("notifications/read-all", {}); } catch { /* the poll corrects it */ }
    load();
  }, [load]);

  return { items, unread, loading, reload: load, markRead, markAllRead };
}

/** Relative time, in the words somebody would actually say. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
