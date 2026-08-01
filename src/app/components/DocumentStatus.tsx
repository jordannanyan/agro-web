import { Clock, UserCheck } from "lucide-react";
import { useAuth } from "../store/AuthContext";

// "Pending" on its own says a document is stuck without saying on whom, so every
// row looked equally inert and nobody could tell which ones were theirs. The list
// endpoints now return the first unfinished step, and this renders it: the waiting
// role by name, and a stronger treatment when that role is the viewer's own.
export interface PendingInfo {
  status: string;
  pending_step_order?: number | null;
  pending_step_label?: string | null;
  pending_role_name?: string | null;
  pending_role_code?: string | null;
}

const STEP_VERB: Record<string, string> = {
  Requested: "diajukan", Approved: "disetujui", Acknowledged: "diketahui", Payment: "dibayar",
};

function statusClass(status: string) {
  const s = status?.toLowerCase() || "";
  if (s.includes("approv")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("pending") || s.includes("waiting")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("reject")) return "bg-red-50 text-red-700 border-red-200";
  if (s.includes("revis")) return "bg-violet-50 text-violet-700 border-violet-200";
  if (s.includes("paid") || s.includes("deliver")) return "bg-green-50 text-green-700 border-green-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function DocumentStatus({ row }: { row: PendingInfo }) {
  const { user } = useAuth();
  const waiting = (row.status || "").toLowerCase().includes("pending");

  if (!waiting || !row.pending_role_name) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusClass(row.status)}`}>
        {row.status}
      </span>
    );
  }

  const mine = !!row.pending_role_code && row.pending_role_code === user?.role_code;
  const verb = STEP_VERB[row.pending_step_label ?? ""] ?? "ditindak";
  const title = `Langkah ${row.pending_step_order ?? "?"} — menunggu ${verb} oleh ${row.pending_role_name}`;

  // The viewer's own queue gets a filled badge and a ring; everyone else's stays
  // outlined, so a screenful of pending rows still shows which few are actionable.
  return mine ? (
    <span title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 animate-pulse">
      <UserCheck className="w-3 h-3" />Perlu Anda
    </span>
  ) : (
    <span title={title}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">
      <Clock className="w-3 h-3" />Menunggu {row.pending_role_name}
    </span>
  );
}

/** True when the document is waiting on the signed-in user's role. */
export function isMyTurn(row: PendingInfo, roleCode?: string | null) {
  return (row.status || "").toLowerCase().includes("pending")
    && !!row.pending_role_code && row.pending_role_code === roleCode;
}
