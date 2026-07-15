import { useState } from "react";
import { Check, X, RotateCcw, Clock, CircleCheck, CircleX } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Button } from "./ui/button";

export interface ApprovalStep {
  id: number;
  step_order: number;
  role_name: string | null;
  user_name?: string | null;
  name?: string | null;
  action_date?: string | null;
  note?: string | null;
  status: "Pending" | "Approved" | "Rejected" | "Revision";
}

const STATUS_META: Record<string, { cls: string; icon: any; label: string }> = {
  Pending:  { cls: "text-amber-600 bg-amber-50 border-amber-200",   icon: Clock,      label: "Menunggu" },
  Approved: { cls: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CircleCheck, label: "Disetujui" },
  Rejected: { cls: "text-red-600 bg-red-50 border-red-200",          icon: CircleX,    label: "Ditolak" },
  Revision: { cls: "text-violet-600 bg-violet-50 border-violet-200", icon: RotateCcw,  label: "Revisi" },
};

export function ApprovalTimeline({
  docType, docId, steps, onChanged,
}: {
  docType: "PR" | "PO" | "PayReq";
  docId: number;
  steps: ApprovalStep[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [note, setNote] = useState("");

  // The active step = first Pending one.
  const activeStepId = steps.find((s) => s.status === "Pending")?.id ?? null;

  async function act(stepId: number, action: "approve" | "reject" | "revision") {
    setBusy(stepId);
    try {
      await api.post(`documents/${docType}/${docId}/approvals/${stepId}/action`, { action, note: note || undefined });
      toast.success(action === "approve" ? "Langkah disetujui" : action === "reject" ? "Ditolak" : "Diminta revisi");
      setNoteFor(null); setNote("");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Gagal memproses");
    } finally { setBusy(null); }
  }

  if (!steps.length) {
    return <p className="text-sm text-slate-400">Belum ada alur approval (dokumen masih draft).</p>;
  }

  return (
    <div className="space-y-3">
      {steps.map((s) => {
        const meta = STATUS_META[s.status] ?? STATUS_META.Pending;
        const Icon = meta.icon;
        const isActive = s.id === activeStepId;
        return (
          <div key={s.id} className={`rounded-xl border p-4 ${isActive ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${meta.cls}`}><Icon className="w-4 h-4" /></div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Step {s.step_order} · {s.role_name || "—"}</p>
                <p className="text-xs text-slate-400">
                  {meta.label}{s.user_name || s.name ? ` · ${s.user_name || s.name}` : ""}{s.action_date ? ` · ${s.action_date}` : ""}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${meta.cls}`}>{meta.label}</span>
            </div>
            {s.note && <p className="text-xs text-slate-500 mt-2 pl-11">“{s.note}”</p>}

            {isActive && (
              <div className="mt-3 pl-11 space-y-2">
                {noteFor === s.id && (
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                )}
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" disabled={busy === s.id} onClick={() => act(s.id, "approve")}>
                    <Check className="w-4 h-4 mr-1" />Setujui
                  </Button>
                  <Button size="sm" variant="outline" className="text-violet-600" disabled={busy === s.id}
                    onClick={() => (noteFor === s.id ? act(s.id, "revision") : setNoteFor(s.id))}>
                    <RotateCcw className="w-4 h-4 mr-1" />Revisi
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600" disabled={busy === s.id}
                    onClick={() => (noteFor === s.id ? act(s.id, "reject") : setNoteFor(s.id))}>
                    <X className="w-4 h-4 mr-1" />Tolak
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
