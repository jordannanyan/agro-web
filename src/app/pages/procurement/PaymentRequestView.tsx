import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CreditCard, Pencil } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";
import { ApprovalTimeline, ApprovalStep } from "../../components/ApprovalTimeline";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface PayDetail {
  id: number; payreq_number: string; entity_name: string; budget_code: string | null;
  pr_number: string | null; po_number: string | null; route: string;
  amount: number; reason: string | null; person_in_charge: string | null;
  activity_date: string | null; estimated_pay_date: string | null; status: string;
  bank_name: string | null; bank_account: string | null; beneficiary_name: string | null;
  approvals: ApprovalStep[];
}

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
  const { data, loading, error, refetch } = useApi<PayDetail>(id ? `payment-requests/${id}` : null, undefined, [id]);

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

            <Card className="p-6">
              <DocumentAttachments docType="PayReq" docId={data.id} categories={["Bukti Bayar", "Invoice", "ToR / Estimasi", "Lainnya"]} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
