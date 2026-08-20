// How many procurement documents are waiting on the signed-in user, for the badges
// in the sidebar.
//
// The lists already tint the rows that need this person, but only after they have
// opened the list. Someone with three requests to sign had no way of knowing until
// they went looking, so documents sat untouched for days. The count comes from
// GET /documents/inbox, which decides what "waiting on you" means — see that
// endpoint: a step assigned to your role, a revision you filed, and (finance only)
// an approved payment still to be released.

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export interface InboxBucket {
  approval: number;
  revision: number;
  /** PayReq only: approved requests still waiting for the cash to be released. */
  payment?: number;
  total: number;
}

export interface InboxCounts {
  PR: InboxBucket;
  PO: InboxBucket;
  PayReq: InboxBucket;
  total: number;
}

const EMPTY: InboxCounts = {
  PR: { approval: 0, revision: 0, total: 0 },
  PO: { approval: 0, revision: 0, total: 0 },
  PayReq: { approval: 0, revision: 0, payment: 0, total: 0 },
  total: 0,
};

const REFRESH_EVENT = "inbox:refresh";
const POLL_MS = 60_000;

/**
 * Ask for a fresh count now.
 *
 * Approving a document changes the badge of everyone in the chain, but only the
 * person who acted is on the page. They at least should not have to wait out the
 * poll to see their own number drop — a badge that still says "2" right after you
 * cleared the second one reads as a bug.
 */
export function refreshInbox() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/** Poll the inbox counts. Returns zeros while loading and on any failure. */
export function useInboxCounts(enabled = true): InboxCounts {
  const [counts, setCounts] = useState<InboxCounts>(EMPTY);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setCounts(await api.get<InboxCounts>("documents/inbox"));
    } catch {
      // A failed count is not worth a toast: the badge is an aid, not the work.
      // Keeping the previous numbers beats flashing zeros on a blip.
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) { setCounts(EMPTY); return; }
    load();
    const timer = window.setInterval(load, POLL_MS);
    // Coming back to the tab is the moment stale numbers are most visible, and
    // the cheapest time to fix them.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    window.addEventListener(REFRESH_EVENT, onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(REFRESH_EVENT, onFocus);
    };
  }, [enabled, load]);

  return counts;
}
