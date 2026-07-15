import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ShoppingCart, Pencil } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";
import { ApprovalTimeline, ApprovalStep } from "../../components/ApprovalTimeline";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface PODetail {
  id: number; po_number: string; vendor_name: string; entity_name: string; budget_code: string | null;
  pr_number: string | null; order_date: string; due_date: string | null; payment_terms: string | null; status: string;
  items: { id: number; pr_item_description: string | null; order_qty: number; unit_price: number; total: number }[];
  extra_costs: { id: number; description: string; amount: number }[];
  totals: { items_subtotal: number; extra_cost_total: number; subtotal: number; tax_amount: number; grand_total: number };
}

function statusBadge(status: string) {
  const s = status?.toLowerCase() || "";
  if (s.includes("approv")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (s.includes("reject")) return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export default function PurchaseOrderView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data, loading, error } = useApi<PODetail>(id ? `purchase-orders/${id}` : null, undefined, [id]);
  const { data: approvals, refetch: refetchAppr } = useApi<ApprovalStep[]>(id ? `documents/PO/${id}/approvals` : null, undefined, [id]);

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/procurement/purchase-order")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg font-mono">{data?.po_number || "Purchase Order"}</h1><p className="text-slate-500 text-sm">Procurement → PO Detail</p></div>
          </div>
          {data && (
            <div className="ml-auto flex items-center gap-3">
              <Badge className={`border ${statusBadge(data.status)}`}>{data.status}</Badge>
              {data.status === "Draft" && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/procurement/po/${data.id}/edit`)}><Pencil className="w-4 h-4 mr-1.5" />Edit</Button>
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
                  { label: "Vendor", value: data.vendor_name },
                  { label: "Entitas", value: data.entity_name },
                  { label: "Sumber PR", value: data.pr_number || "—" },
                  { label: "Budget", value: data.budget_code || "—" },
                  { label: "Tanggal Order", value: data.order_date },
                  { label: "Jatuh Tempo", value: data.due_date || "—" },
                  { label: "Termin", value: data.payment_terms || "—" },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-0">
              <div className="p-6 border-b border-slate-100"><h2 className="text-slate-900 font-semibold">Item & Biaya</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    <th className="py-3 px-5 text-left text-xs font-semibold text-slate-600 uppercase">Deskripsi</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold text-slate-600 uppercase">Qty</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold text-slate-600 uppercase">Harga</th>
                    <th className="py-3 px-5 text-right text-xs font-semibold text-slate-600 uppercase">Total</th>
                  </tr></thead>
                  <tbody>
                    {data.items?.map((it) => (
                      <tr key={it.id} className="border-b border-slate-50">
                        <td className="py-3 px-5 text-sm text-slate-800">{it.pr_item_description || "Item"}</td>
                        <td className="py-3 px-5 text-sm font-mono text-slate-700 text-right">{Number(it.order_qty).toLocaleString("id-ID")}</td>
                        <td className="py-3 px-5 text-sm font-mono text-slate-700 text-right">{fmtRp(it.unit_price)}</td>
                        <td className="py-3 px-5 text-sm font-mono font-semibold text-slate-900 text-right">{fmtRp(it.total)}</td>
                      </tr>
                    ))}
                    {data.extra_costs?.map((e) => (
                      <tr key={`x${e.id}`} className="border-b border-slate-50 bg-amber-50/30">
                        <td className="py-3 px-5 text-sm text-amber-700" colSpan={3}>+ {e.description}</td>
                        <td className="py-3 px-5 text-sm font-mono text-amber-700 text-right">{fmtRp(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 border-t border-slate-100 space-y-1.5 max-w-xs ml-auto text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-mono">{fmtRp(data.totals?.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">PPN</span><span className="font-mono">{fmtRp(data.totals?.tax_amount)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-1.5"><span className="font-semibold text-slate-800">Grand Total</span><span className="font-mono font-bold text-emerald-700">{fmtRp(data.totals?.grand_total)}</span></div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-slate-900 font-semibold mb-4">Alur Approval</h2>
              <ApprovalTimeline docType="PO" docId={data.id} steps={approvals || []} onChanged={refetchAppr} />
            </Card>

            <Card className="p-6">
              <DocumentAttachments docType="PO" docId={data.id} categories={["Invoice", "Surat Jalan", "Kontrak", "Lainnya"]} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
