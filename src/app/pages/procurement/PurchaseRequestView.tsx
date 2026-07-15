import { useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";
import { ApprovalTimeline, ApprovalStep } from "../../components/ApprovalTimeline";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface PRDetail {
  id: number; pr_number: string; entity_name: string; request_date: string; date_required: string | null;
  status: string; grand_total: number; requested_by_name: string | null;
  items: { id: number; description: string; budget_code: string | null; unit_name: string | null; quantity: number; unit_cost: number; total_cost: number; sapropdi_name: string | null }[];
  approvals: ApprovalStep[];
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() || "";
  if (s.includes("approv")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("reject")) return "bg-red-50 text-red-700 border-red-200";
  if (s.includes("revis")) return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function PurchaseRequestView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, loading, error, refetch } = useApi<PRDetail>(id ? `purchase-requests/${id}` : null, undefined, [id]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/procurement/purchase-request")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-slate-900 font-semibold text-lg font-mono">{data?.pr_number || "Purchase Request"}</h1>
              <p className="text-slate-500 text-sm">Procurement → PR Detail</p>
            </div>
          </div>
          {data && (
            <div className="ml-auto flex items-center gap-3">
              <Badge className={`border ${statusBadge(data.status)}`}>{data.status}</Badge>
              {data.status === "Draft" && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/procurement/pr/${data.id}/edit`)}><Pencil className="w-4 h-4 mr-1.5" />Edit</Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 max-w-5xl mx-auto space-y-6">
        {loading && <div className="text-center text-slate-400 py-16 text-sm">Memuat…</div>}
        {error && <div className="text-center text-red-500 py-16 text-sm">{error}</div>}
        {data && (
          <>
            <Card className="p-6">
              <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi</h2>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "Entitas", value: data.entity_name },
                  { label: "Tanggal Request", value: data.request_date },
                  { label: "Dibutuhkan", value: data.date_required || "—" },
                  { label: "Requester", value: data.requested_by_name || "—" },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0">
              <div className="p-6 border-b border-slate-100"><h2 className="text-slate-900 font-semibold">Item</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    {["Deskripsi", "Budget", "Saprodi", "Unit", "Qty", "Harga", "Total"].map((h, i) => (
                      <th key={h} className={`py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide ${i >= 4 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.items?.map((it) => (
                      <tr key={it.id} className="border-b border-slate-50">
                        <td className="py-3 px-5 text-sm text-slate-800">{it.description}</td>
                        <td className="py-3 px-5 text-sm font-mono text-slate-500">{it.budget_code || "—"}</td>
                        <td className="py-3 px-5 text-sm text-slate-500">{it.sapropdi_name || "—"}</td>
                        <td className="py-3 px-5 text-sm text-slate-500">{it.unit_name || "—"}</td>
                        <td className="py-3 px-5 text-sm font-mono text-slate-700 text-right">{Number(it.quantity).toLocaleString("id-ID")}</td>
                        <td className="py-3 px-5 text-sm font-mono text-slate-700 text-right">{fmtRp(it.unit_cost)}</td>
                        <td className="py-3 px-5 text-sm font-mono font-semibold text-slate-900 text-right">{fmtRp(it.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="bg-slate-50 border-t border-slate-200">
                    <td colSpan={6} className="py-3 px-5 text-sm font-semibold text-slate-700 text-right">Grand Total</td>
                    <td className="py-3 px-5 text-right text-sm font-mono font-bold text-emerald-700">{fmtRp(data.grand_total)}</td>
                  </tr></tfoot>
                </table>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-slate-900 font-semibold mb-4">Alur Approval</h2>
              <ApprovalTimeline docType="PR" docId={data.id} steps={data.approvals || []} onChanged={refetch} />
            </Card>

            <Card className="p-6">
              <DocumentAttachments docType="PR" docId={data.id} categories={["Dokumen Pendukung", "Foto Barang", "Kutipan Harga", "Lainnya"]} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
