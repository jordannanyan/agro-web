import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CreditCard, Banknote, Copy, Check, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { refreshInbox } from "../../lib/inbox";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canRecordPayment, canOverridePayment } from "../../lib/permissions";
import { ApprovalTimeline, ApprovalStep } from "../../components/ApprovalTimeline";
import { DocumentAttachments } from "../../components/DocumentAttachments";
import { DocumentActions, RevisionBanner } from "../../components/DocumentActions";
import { SourceDocumentPreview } from "../../components/SourceDocumentPreview";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface PayDetail {
  id: number; payreq_number: string; entity_id: number | null; entity_name: string; budget_code: string | null;
  pr_number: string | null; po_number: string | null; route: string;
  purchase_request_id: number | null; purchase_order_id: number | null;
  amount: number; reason: string | null; person_in_charge: string | null;
  activity_date: string | null; estimated_pay_date: string | null; status: string;
  released_pay_date: string | null;
  payment_code: string | null;
  payment_code_issued_at: string | null;
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
  const [copied, setCopied] = useState(false);

  // The approval chain must be fully signed off before cash may be released.
  // The API enforces this too — this only decides whether to show the form.
  const approvalSteps = (data?.approvals || []).filter((s) => s.step_label !== "Payment");
  const fullyApproved = approvalSteps.length > 0 && approvalSteps.every((s) => s.status === "Approved");
  const alreadyPaid = data?.status === "Paid";
  // The normal way to settle is to transfer quoting the code below and upload the
  // statement; the form stays only as a break-glass for the override account, and
  // the API refuses it for everybody else.
  const awaitingPayment = !!data && fullyApproved && !alreadyPaid;
  const showCodeCard = awaitingPayment && !!data?.payment_code;
  const showPayPanel = awaitingPayment && canOverridePayment(user?.role_code);

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
      refreshInbox(); // paid: it drops out of finance's "siap dibayar" count
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
              <DocumentActions docType="PayReq" doc={data} approvals={data.approvals} onChanged={refetch} />
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
        {loading && <div className="text-center text-slate-400 py-16 text-sm">Memuat…</div>}
        {error && <div className="text-center text-red-500 py-16 text-sm">{error}</div>}
        {data && (
          <>
            <RevisionBanner docType="PayReq" doc={data} approvals={data.approvals} />

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Informasi</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${data.route === "via_po" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>{data.route === "via_po" ? "dari PO" : "dari PR"}</span>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Entitas", value: data.entity_name },
                  { label: "Sumber", value: data.po_number || data.pr_number || "—" },
                  { label: "Project Code", value: data.budget_code || "—" },
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

            {/* An approver signing off cash should be able to see the goods without
                leaving the page. */}
            <SourceDocumentPreview
              docType={data.purchase_order_id ? "PO" : "PR"}
              docId={data.purchase_order_id || data.purchase_request_id}
            />

            <Card className="p-6">
              <h2 className="text-slate-900 font-semibold mb-4">Alur Approval</h2>
              <ApprovalTimeline docType="PayReq" docId={data.id} steps={data.approvals || []} onChanged={refetch} />
            </Card>

            {/* Payment execution — step 5. Deliberately outside the approval timeline:
                the chain ends with the Director acknowledging, then Finance releases
                the cash in the bank's own channel.

                What settles the request is the bank statement, not a button here:
                the code below has to reach the transfer remark, and the matching
                line in the uploaded statement is what marks this Paid. */}
            {showCodeCard && (
              <Card className="p-6 border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="w-4 h-4 text-amber-600" />
                  <h2 className="text-slate-900 font-semibold">Menunggu Pembayaran</h2>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Seluruh approval selesai. Transfer <span className="font-semibold">{fmtRp(data.amount)}</span> lewat
                  bank, lalu <span className="font-semibold">salin kode di bawah ke kolom Berita/Keterangan transfer</span>.
                  Status berubah menjadi Paid setelah rekening koran diunggah dan barisnya cocok — bukan dengan menekan tombol.
                </p>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[240px] flex items-center gap-3 bg-white border-2 border-dashed border-amber-300 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 mb-0.5">Kode Pembayaran</p>
                      <p className="text-2xl font-bold font-mono tracking-wider text-slate-900">{data.payment_code}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-300"
                      onClick={() => {
                        navigator.clipboard?.writeText(data.payment_code || "");
                        setCopied(true);
                        toast.success("Kode disalin — tempel di keterangan transfer");
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                      {copied ? "Tersalin" : "Salin"}
                    </Button>
                  </div>
                  <div className="text-xs text-slate-500 leading-relaxed max-w-xs">
                    <p className="font-semibold text-slate-600 mb-0.5">Cara menulisnya</p>
                    Huruf dan angkanya harus persis — ada karakter pemeriksa, jadi satu huruf salah akan
                    ditolak sistem, bukan tercocokkan ke pembayaran lain. Spasinya bebas: boleh diketik
                    <span className="font-mono"> PAY26 7K4Q3 </span> atau <span className="font-mono">PAY267K4Q3</span>.
                  </div>
                </div>

                {canRecordPayment(user?.role_code) && (
                  <button
                    onClick={() => navigate("/procurement/reconciliation")}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800"
                  >
                    <FileSpreadsheet className="w-4 h-4" />Buka Rekonsiliasi Pembayaran →
                  </button>
                )}
              </Card>
            )}

            {/* Break-glass only: asserting a payment happened with no statement to
                show for it. The API demands a reason and records it as [MANUAL]. */}
            {showPayPanel && (
              <Card className="p-6 border-sky-200 bg-sky-50/40">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-sky-600" />
                  <h2 className="text-slate-900 font-semibold">Pelunasan Manual (override)</h2>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Jalur darurat di luar rekonsiliasi — pakai hanya bila pembayaran {fmtRp(data.amount)} benar-benar
                  sudah terjadi tetapi tidak bisa dibuktikan lewat rekening koran. Tercatat sebagai
                  <span className="font-semibold"> [MANUAL]</span> di timeline berikut alasannya.
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
                    <label className="text-xs text-slate-500 mb-1 block">Alasan (wajib)</label>
                    <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Kenapa tidak lewat rekening koran…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/30" />
                  </div>
                </div>
                <Button className="mt-4 bg-sky-600 hover:bg-sky-700 text-white" disabled={paying || !payNote.trim()} onClick={recordPayment}>
                  <Banknote className="w-4 h-4 mr-1.5" />{paying ? "Menyimpan…" : "Tandai Paid Tanpa Rekening Koran"}
                </Button>
              </Card>
            )}

            {alreadyPaid && (
              <Card className="p-6 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-emerald-800 font-medium">
                    Sudah dibayar{data.released_pay_date ? ` pada ${data.released_pay_date}` : ""}
                    {data.payment_code ? ` · kode ${data.payment_code}` : ""}.
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
