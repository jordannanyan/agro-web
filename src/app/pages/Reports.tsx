import { useState } from "react";
import { FileText, ShoppingCart, CreditCard, Sprout } from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useApi } from "../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function statusBadge(s: string) {
  const t = s?.toLowerCase() || "";
  if (t.includes("approv") || t.includes("paid")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (t.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
  if (t.includes("reject")) return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function ProcurementReport() {
  const { data: prs } = useApi<any[]>("purchase-requests");
  const { data: pos } = useApi<any[]>("purchase-orders");
  const prList = prs || [], poList = pos || [];
  const prTotal = prList.reduce((s, r) => s + Number(r.grand_total || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total PR</p><p className="text-2xl font-bold text-slate-900">{prList.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total PO</p><p className="text-2xl font-bold text-slate-900">{poList.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Nilai PR</p><p className="text-2xl font-bold text-emerald-700">{fmtRp(prTotal)}</p></Card>
      </div>
      <Card className="p-0">
        <div className="p-5 border-b border-slate-100"><h3 className="text-slate-800 font-semibold">Purchase Requests</h3></div>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Nomor", "Entitas", "Tanggal", "Total", "Status"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>{prList.slice(0, 20).map((r) => (
            <tr key={r.id} className="border-b border-slate-50"><td className="py-3 px-5 text-sm font-mono text-blue-700">{r.pr_number}</td><td className="py-3 px-5 text-sm text-slate-600">{r.entity_name}</td><td className="py-3 px-5 text-sm text-slate-600">{r.request_date}</td><td className="py-3 px-5 text-right text-sm font-mono text-slate-900">{fmtRp(r.grand_total)}</td><td className="py-3 px-5"><Badge className={`border ${statusBadge(r.status)}`}>{r.status}</Badge></td></tr>
          ))}</tbody>
        </table></div>
        {prList.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Belum ada data</div>}
      </Card>
    </div>
  );
}

function PaymentReport() {
  const { data } = useApi<any[]>("payment-requests");
  const list = data || [];
  const total = list.reduce((s, r) => s + Number(r.amount || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total PayReq</p><p className="text-2xl font-bold text-slate-900">{list.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase font-semibold mb-1">Total Nominal</p><p className="text-2xl font-bold text-amber-700">{fmtRp(total)}</p></Card>
      </div>
      <Card className="p-0">
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Nomor", "Sumber", "Nominal", "Est. Bayar", "Status"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>{list.slice(0, 20).map((r) => (
            <tr key={r.id} className="border-b border-slate-50"><td className="py-3 px-5 text-sm font-mono text-amber-700">{r.payreq_number}</td><td className="py-3 px-5 text-sm text-slate-600">{r.po_number || r.pr_number || "—"}</td><td className="py-3 px-5 text-right text-sm font-mono text-slate-900">{fmtRp(r.amount)}</td><td className="py-3 px-5 text-sm text-slate-600">{r.estimated_pay_date || "—"}</td><td className="py-3 px-5"><Badge className={`border ${statusBadge(r.status)}`}>{r.status}</Badge></td></tr>
          ))}</tbody>
        </table></div>
        {list.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Belum ada data</div>}
      </Card>
    </div>
  );
}

function TraceabilityReport() {
  const { data: dash } = useApi<any>("dashboard/executive");
  const k = dash?.kpis;
  const stats = [
    { label: "Volume Beli (Kg)", value: Number(k?.purchasing_qty || 0).toLocaleString("id-ID") },
    { label: "Nilai Pembelian", value: fmtRp(k?.purchasing_value || 0) },
    { label: "Revenue Penjualan", value: fmtRp(k?.selling_revenue || 0) },
    { label: "Outstanding Petani", value: fmtRp(k?.outstanding_total || 0) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <Card key={s.label} className="p-5"><p className="text-xs text-slate-500 uppercase font-semibold mb-1">{s.label}</p><p className="text-xl font-bold text-slate-900">{s.value}</p></Card>)}
      </div>
      <Card className="p-5">
        <h3 className="text-slate-800 font-semibold mb-3">Pembelian per Skema</h3>
        <div className="space-y-3">
          {(dash?.purchasing_by_scheme || []).map((s: any) => (
            <div key={s.scheme} className="flex items-center justify-between"><span className="text-sm text-slate-700">{s.scheme}</span><span className="text-sm font-mono text-slate-600">{s.count} transaksi · {fmtRp(s.value)}</span></div>
          ))}
          {(!dash?.purchasing_by_scheme || dash.purchasing_by_scheme.length === 0) && <p className="text-sm text-slate-400">Belum ada pembelian</p>}
        </div>
      </Card>
    </div>
  );
}

export default function Reports() {
  const [tab, setTab] = useState<"procurement" | "payment" | "traceability">("procurement");
  const tabs: { id: typeof tab; label: string; icon: any }[] = [
    { id: "procurement", label: "Procurement", icon: ShoppingCart },
    { id: "payment", label: "Pembayaran", icon: CreditCard },
    { id: "traceability", label: "Traceability", icon: Sprout },
  ];
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><FileText className="w-5 h-5 text-emerald-600" /></div>
        <div><h1 className="text-2xl text-slate-900">Laporan Operasional</h1><p className="text-sm text-slate-500">Ringkasan procurement, pembayaran, dan traceability</p></div>
      </div>
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}><t.icon className="w-4 h-4" />{t.label}</button>
          ))}
        </div>
      </div>
      {tab === "procurement" && <ProcurementReport />}
      {tab === "payment" && <PaymentReport />}
      {tab === "traceability" && <TraceabilityReport />}
    </div>
  );
}
