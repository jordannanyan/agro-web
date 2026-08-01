import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CreditCard, Pencil, Banknote } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canRecordPayment } from "../../lib/permissions";
import { ApprovalTimeline, ApprovalStep } from "../../components/ApprovalTimeline";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface PayDetail {
  id: number; payreq_number: string; entity_name: string; budget_code: string | null;
  pr_number: string | null; po_number: string | null; route: string;
  amount: number; reason: string | null; person_in_charge: string | null;
  activity_date: string | null; estimated_pay_date: string | null; status: string;
  released_pay_date: string | null;
  bank_name: string | null; bank_account: string | null; beneficiary_name: string | null;
  approvals: ApprovalStep[];
}

interface PaymentMethod { id: number; method_name: string }

function statusBadge(status: string) {
  const s = status?.toLowerCase() || "";
  if (s.includes("approv") || s.includes("paid")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("reject")) return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function PaymentRequestView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi<PayDetail>(id ? `payment-requests/${id}` : null, undefined, [id]);
  const { data: methods } = useApi<PaymentMethod[]>("payment-methods");

  const [paying, setPaying] = useState(false);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [methodId, setMethodId] = useState("");
  const [payNote, setPayNote] = useState("");

  // The approval chain must be fully signed off before cash may be released.
  // The API enforces this too — this only decides whether to show the form.
  const approvalSteps = (data?.approvals || []).filter((s) => s.step_label !== "Payment");
  const fullyApproved = approvalSteps.length > 0 && approvalSteps.every((s) => s.status === "Approved");
  const alreadyPaid = data?.status === "Paid";
  const showPayPanel = !!data && canRecordPayment(user?.role_code) && fullyApproved && !alreadyPaid;

  async function recordPayment() {
    if (!data) return;
    setPaying(true);
    try {
      await api.post(`payment-requests/${data.id}/pay`, {
        released_pay_date: payDate,
        payment_method_id: methodId || undefined,
        note: payNote || undefined,
      });
      toast.success("Pembayaran dicatat");
      setPayNote("");
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Gagal mencatat pembayaran");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/procurement/payment-request")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><CreditCard className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg font-mono">{data?.payreq_number || "Payment Request"}</h1><p className="text-slate-500 text-sm">Procurement → PayReq Detail</p></div>
          </div>
          {data && (
            <div className="ml-auto flex items-center gap-3">
              <Badge className={`border ${statusBadge(data.status)}`}>{data.status}</Badge>
              {data.status === "Draft" && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/procurement/payreq/${data.id}/edit`)}><Pencil className="w-4 h-4 mr-1.5" />Edit</Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
        {loading && <div className="text-center text-slate-400 py-16 text-sm">Memuat…</div>}
        {error && <div className="text-center text-red-500 py-16 text-sm">{error}</div>}
        {data && (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Informasi</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${data.route === "via_po" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{data.route === "via_po" ? "dari PO" : "dari PR"}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Entitas", value: data.entity_name },
                  { label: "Sumber", value: data.po_number || data.pr_number || "—" },
                  { label: "Budget", value: data.budget_code || "—" },
                  { label: "PIC", value: data.person_in_charge || "—" },
                  { label: "Tanggal Kegiatan", value: data.activity_date || "—" },
                  { label: "Estimasi Bayar", value: data.estimated_pay_date || "—" },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
              {data.reason && <div className="mt-4 bg-slate-50 rounded-xl px-3 py-2.5"><p className="text-xs text-slate-400 mb-0.5">Keterangan</p><p className="text-sm text-slate-700">{data.reason}</p></div>}
              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white">
                <span className="text-sm font-medium">Nominal</span>
                <span className="text-lg font-bold font-mono">{fmtRp(data.amount)}</span>
              </div>
              {(data.bank_name || data.bank_account) && (
                <p className="text-xs text-slate-400 mt-3">Rekening: {data.bank_name} · {data.bank_account} · a.n. {data.beneficiary_name || "—"}</p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-slate-900 font-semibold mb-4">Alur Approval</h2>
              <ApprovalTimeline docType="PayReq" docId={data.id} steps={data.approvals || []} onChanged={refetch} />
            </Card>

            {/* Payment execution — step 5. Deliberately outside the approval timeline:
                the chain ends with the Director acknowledging, then Finance releases
                the cash. Both Finance Manager and Finance Staff may record it. */}
            {showPayPanel && (
              <Card className="p-6 border-sky-200 bg-sky-50/40">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="w-4 h-4 text-sky-600" />
                  <h2 className="text-slate-900 font-semibold">Input Pembayaran</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Seluruh approval sudah selesai. Catat realisasi pembayaran {fmtRp(data.amount)}.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Tanggal Bayar</label>
                    <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Metode</label>
                    <select value={methodId} onChange={(e) => setMethodId(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30">
                      <option value="">— pilih —</option>
                      {(methods || []).map((m) => <option key={m.id} value={m.id}>{m.method_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Catatan (opsional)</label>
                    <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="No. referensi transfer…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
                  </div>
                </div>
                <Button className="mt-4 bg-sky-600 hover:bg-sky-700 text-white" disabled={paying} onClick={recordPayment}>
                  <Banknote className="w-4 h-4 mr-1.5" />{paying ? "Menyimpan…" : "Catat Pembayaran"}
                </Button>
              </Card>
            )}

            {alreadyPaid && (
              <Card className="p-6 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-emerald-800 font-medium">
                    Sudah dibayar{data.released_pay_date ? ` pada ${data.released_pay_date}` : ""}.
                  </p>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <DocumentAttachments docType="PayReq" docId={data.id} categories={["Bukti Bayar", "Invoice", "ToR / Estimasi", "Lainnya"]} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
