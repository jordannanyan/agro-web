import { useState } from "react";
import { useNavigate } from "react-router";
import { Pencil, Send, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { refreshInbox } from "../lib/inbox";
import { Button } from "./ui/button";
import { useAuth } from "../store/AuthContext";
import {
  canEditDocument, canResubmit, revisionNote,
  type DocType, type StepLike, type DocLike,
} from "../lib/permissions";

const ENDPOINT: Record<DocType, string> = {
  PR: "purchase-requests",
  PO: "purchase-orders",
  PayReq: "payment-requests",
  Reimbursement: "reimbursements",
};

const EDIT_PATH: Record<DocType, string> = {
  PR: "/procurement/pr",
  PO: "/procurement/po",
  PayReq: "/procurement/payreq",
  Reimbursement: "/reimbursement",
};

/**
 * The requester's controls on a document detail page: edit, submit a draft, and
 * send a revised document back into the chain.
 *
 * The last one is the piece the flow was missing. An approver's "Revisi" verdict
 * handed the document back to whoever filed it, but there was nothing on screen
 * to hand it forward again — the document could only be looked at, so every
 * revision was a dead end.
 */
export function DocumentActions({
  docType, doc, approvals, onChanged,
}: {
  docType: DocType;
  doc: DocLike & { id: number };
  approvals?: StepLike[] | null;
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const mayEdit = canEditDocument(user, docType, doc, approvals);
  const mayResubmit = canResubmit(user, docType, doc, approvals);
  const maySubmitDraft = doc.status === "Draft" && mayEdit;

  async function submitDraft() {
    setBusy(true);
    try {
      await api.put(`${ENDPOINT[docType]}/${doc.id}`, { status: "Pending" });
      toast.success("Dokumen diajukan untuk approval");
      onChanged();
      refreshInbox();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengajukan dokumen");
    } finally { setBusy(false); }
  }

  async function resubmit() {
    setBusy(true);
    try {
      await api.post(`documents/${docType}/${doc.id}/resubmit`);
      toast.success("Dokumen dikirim ulang untuk approval");
      onChanged();
      refreshInbox();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mengirim ulang dokumen");
    } finally { setBusy(false); }
  }

  if (!mayEdit && !mayResubmit) return null;

  return (
    <>
      {mayEdit && (
        <Button size="sm" variant="outline" onClick={() => navigate(`${EDIT_PATH[docType]}/${doc.id}/edit`)}>
          <Pencil className="w-4 h-4 mr-1.5" />Edit
        </Button>
      )}
      {maySubmitDraft && (
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={busy} onClick={submitDraft}>
          <Send className="w-4 h-4 mr-1.5" />{busy ? "Mengirim…" : "Ajukan Approval"}
        </Button>
      )}
      {mayResubmit && (
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white" disabled={busy} onClick={resubmit}>
          <RotateCcw className="w-4 h-4 mr-1.5" />{busy ? "Mengirim…" : "Kirim Ulang"}
        </Button>
      )}
    </>
  );
}

/**
 * What the approver asked to be changed, shown at the top of the document so the
 * requester does not have to hunt through the timeline for it.
 */
export function RevisionBanner({
  docType, doc, approvals,
}: {
  docType: DocType;
  doc: DocLike;
  approvals?: StepLike[] | null;
}) {
  const { user } = useAuth();
  if (doc.status !== "Revision") return null;
  const info = revisionNote(approvals);
  if (!info) return null;
  const mine = canResubmit(user, docType, doc, approvals);

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-violet-900">
          Dikembalikan untuk revisi{info.role ? ` oleh ${info.role}` : ""}
        </p>
        {info.note && <p className="text-sm text-violet-800 mt-1">“{info.note}”</p>}
        <p className="text-xs text-violet-600 mt-2">
          {mine
            ? "Perbaiki dokumen lewat tombol Edit, lalu tekan Kirim Ulang untuk mengembalikannya ke alur approval."
            : "Menunggu perbaikan dari pihak yang mengajukan dokumen ini."}
        </p>
      </div>
    </div>
  );
}
