// Actual — what was really spent. Never typed here: Paid payment requests (the
// bank statement confirmed them) plus what Finance booked on a Fund Request line
// for spending that never passes through a payment request. A PO is a commitment
// and a Fund Request a plan; neither is ever Actual.

import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Receipt, ExternalLink } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { ExportMenu } from "../../components/ExportMenu";
import { EntityTag } from "../../components/EntityScope";
import { rp, fmtDate, periodLabel } from "./frShared";
import { exportCsv, FinanceFilters, useFinanceFilters } from "./financeFilters";

interface Row {
  source: "payment_request" | "manual"; source_id: number; reference: string; payreq_kind: string | null;
  entity_name: string; period: string; date: string; budget_code: string | null; main_account: string | null; sub_account: string | null;
  description: string | null; vendor: string | null; amount: number; fund_request_line_id: number | null;
  fund_request_id: number | null; fr_number: string | null;
}

export default function FinanceActual() {
  const navigate = useNavigate();
  const f = useFinanceFilters();
  const [search, setSearch] = useState("");
  const { data, loading } = useApi<Row[]>("finance/actual", { ...f.query, search: search || undefined }, [f.key, search]);
  const rows = data || [];
  const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const linked = rows.filter((r) => r.fund_request_line_id).reduce((s, r) => s + Number(r.amount || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const kpi = [
    { label: "Total actual", value: rp(total) },
    { label: "Actual bulan ini", value: rp(rows.filter((r) => r.period === thisMonth).reduce((s, r) => s + Number(r.amount || 0), 0)) },
    { label: "Terikat item fund request", value: rp(linked) },
    { label: "Tidak terikat (per budget code)", value: rp(total - linked) },
  ];
  const open = (r: Row) => r.source === "manual"
    ? navigate(`/financial/fund-request/${r.fund_request_id}`)
    : navigate(r.payreq_kind === "Expense" ? `/reimbursement/pribadi/${r.source_id}` : r.payreq_kind === "Reimbursement" ? `/reimbursement/${r.source_id}` : `/procurement/payreq/${r.source_id}`);
  const th = "py-2.5 px-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Actual</h1>
          <p className="text-sm text-slate-500">Realisasi dari Payment Request yang sudah Paid (terkonfirmasi rekening koran) dan catatan manual Finance pada item fund request.</p>
        </div>
        <ExportMenu onExportExcel={() => exportCsv("actual", rows, [["Tanggal", "date"], ["Referensi", "reference"], ["Sumber", "source"], ["PT", "entity_name"],
          ["Periode", "period"], ["Main account", "main_account"], ["Sub account", "sub_account"], ["Deskripsi", "description"], ["Vendor/penerima", "vendor"],
          ["Fund request", "fr_number"], ["Nominal", "amount"]])} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map((k) => <Card key={k.label} className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{k.label}</p><p className="text-xl font-bold font-mono text-slate-900">{k.value}</p></Card>)}
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FinanceFilters f={f} />
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input className="pl-9" placeholder="Cari referensi, deskripsi, vendor…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Tanggal", "Referensi", "PT", "Budget code", "Deskripsi", "Vendor / penerima", "Fund request", "Nominal", ""].map((h, i) => (
                <th key={h + i} className={`${th} ${h === "Nominal" ? "text-right" : "text-left"}`}>{h}</th>))}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.source}-${r.source_id}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">{fmtDate(r.date)}<span className="block text-[11px] text-slate-400">{periodLabel(r.period)}</span></td>
                  <td className="px-3 py-2.5 text-sm">
                    <span className="font-mono font-semibold text-slate-800">{r.reference}</span>
                    <span className={`block text-[10.5px] font-semibold ${r.source === "manual" ? "text-amber-600" : "text-slate-400"}`}>{r.source === "manual" ? "Manual (Finance)" : `Payment Request${r.payreq_kind && r.payreq_kind !== "Procurement" ? ` · ${r.payreq_kind}` : ""}`}</span>
                  </td>
                  <td className="px-3 py-2.5"><EntityTag name={r.entity_name} /></td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{r.sub_account || <span className="text-amber-600">tanpa kode</span>}<span className="block text-slate-400">{r.main_account}</span></td>
                  <td className="px-3 py-2.5 text-sm text-slate-800">{r.description || "—"}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-500">{r.vendor || "—"}</td>
                  <td className="px-3 py-2.5 text-xs font-mono">{r.fr_number ? <span className="text-emerald-700">{r.fr_number}</span> : <span className="text-slate-400">tidak terikat</span>}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold text-slate-900">{rp(r.amount)}</td>
                  <td className="px-3"><button onClick={() => open(r)} title="Buka transaksi" className="p-1.5 text-slate-400 hover:text-emerald-700"><ExternalLink className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {!loading && rows.length === 0 && <div className="p-16 text-center"><Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada realisasi di periode ini</p></div>}
      </Card>
    </div>
  );
}
