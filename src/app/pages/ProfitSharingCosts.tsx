// Profit Sharing → Biaya Lahan Bagi Hasil: every cost of a profit-sharing season
// in one place. The costs sit in two tables because they were recorded two ways —
// goods issued from the warehouse and labour weeks (JNBS) line by line; the SNBS
// ledger's labour and material columns and other costs (ojek, transport) as
// Operational Investment — but the summary splits them by what they ARE:
// saprodi, tenaga kerja, operasional.
// Their total per plot is what the plot's margin has to clear before the farmer's
// share is paid out (Bayar Bagi Hasil).

import { useState } from "react";
import { Layers, Package, Wrench } from "lucide-react";
import { Card } from "../components/ui/card";
import { useApi } from "../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../components/EntityScope";
import Distribution from "./prefinance/Distribution";
import { OperationalInvestmentPanel } from "./ProfitSharing";
import { useClientPage } from "../components/Pagination";
import { useNavigate } from "react-router";
import CostEntryDialog, { CostHowTo } from "../components/CostEntryDialog";
import { canWriteOperations } from "../lib/permissions";
import { useAuth } from "../store/AuthContext";

const fmtRp = (n: number) => (Number(n || 0) === 0 ? "–" : `Rp ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`);

interface Row {
  plot_id: number; plot_name: string; farmer_name: string | null; entity_name: string | null;
  saprodi: number; labour: number; operasional: number; total: number; line_count: number; ops_count: number;
  from_lines: number; from_investments: number;
}
type Tab = "summary" | "lines" | "ops";

export default function ProfitSharingCosts({ initialTab = "summary" }: { initialTab?: Tab }) {
  const bound = useEntityBound();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [entityFilter, setEntityFilter] = useState("");
  const { data, loading, refetch } = useApi<Row[]>("profit-sharing/costs/summary", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const [adding, setAdding] = useState(false);
  // New lines go into the per-line list; remount it so it shows them.
  const [linesKey, setLinesKey] = useState(0);
  const rows = data || [];
  const pg = useClientPage(rows);
  const sum = (k: keyof Row) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const th = "py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";
  const td = "py-2.5 px-4 text-right font-mono text-sm whitespace-nowrap";
  const TABS: [Tab, string, typeof Layers][] = [
    ["summary", "Ringkasan per Lahan", Layers], ["lines", "Rincian Biaya (per baris)", Package], ["ops", "Catatan Bulanan (buku besar)", Wrench],
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Biaya Lahan Bagi Hasil</h1>
        <p className="text-sm text-slate-500">
          Semua biaya lahan <span className="font-semibold text-violet-700">Profit Sharing</span>: saprodi, tenaga kerja, dan operasional.
          Totalnya per lahan yang harus dilampaui margin sebelum bagian petani dibayarkan. Ini <b>bukan utang petani</b> — pinjaman
          Pre-Finance ada di Pre-Finance → Rincian Utang Petani.
        </p>
        <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
      </div>

      <CostHowTo ps mayWrite={mayWrite} onAdd={() => setAdding(true)} onStockOut={() => navigate("/warehouse/stock-out/create")} />
      {adding && <CostEntryDialog mode="ProfitSharing" onClose={() => setAdding(false)}
        onSaved={() => { refetch(); setLinesKey((k) => k + 1); setTab("lines"); }} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([["Saprodi", sum("saprodi"), "text-emerald-700"], ["Tenaga Kerja", sum("labour"), "text-blue-700"],
           ["Operasional", sum("operasional"), "text-amber-700"], ["Total biaya", sum("total"), "text-slate-900"]] as [string, number, string][])
          .map(([l, v, c]) => (
            <Card key={l} className="p-4"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{l}</p>
              <p className={`text-xl font-bold font-mono mt-1 ${c}`}>{loading ? "…" : fmtRp(v)}</p></Card>
          ))}
      </div>

      <div className="flex flex-wrap gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(([t, label, Icon]) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === "summary" && (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Lahan", "Petani", ...(bound ? [] : ["Entitas"]), "Saprodi", "Tenaga Kerja", "Operasional", "Total Biaya"].map((h) =>
                <th key={h} className={`${th} ${["Saprodi", "Tenaga Kerja", "Operasional", "Total Biaya"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {pg.pageRows.map((r) => (
                <tr key={r.plot_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 text-sm font-semibold text-slate-900">{r.plot_name}</td>
                  <td className="py-2.5 px-4 text-sm text-slate-700">{r.farmer_name || "—"}</td>
                  {!bound && <td className="py-2.5 px-4"><EntityTag name={r.entity_name} /></td>}
                  <td className={`${td} text-emerald-700`}>{fmtRp(r.saprodi)}</td>
                  <td className={`${td} text-blue-700`}>{fmtRp(r.labour)}</td>
                  <td className={`${td} text-amber-700`} title={r.ops_count ? `${r.ops_count} catatan operasional` : ""}>{fmtRp(r.operasional)}</td>
                  <td className={`${td} font-bold text-slate-900`}
                      title={`Dari rincian gudang & tenaga kerja ${fmtRp(r.from_lines)} · dari catatan biaya ${fmtRp(r.from_investments)}`}>{fmtRp(r.total)}</td>
                </tr>
              ))}
              {!loading && !rows.length && <tr><td colSpan={bound ? 6 : 7} className="p-12 text-center text-sm text-slate-400">Belum ada biaya lahan bagi hasil</td></tr>}
            </tbody>
            {rows.length > 0 && (
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="py-2.5 px-4 text-sm font-bold" colSpan={bound ? 2 : 3}>Total ({rows.length} lahan)</td>
                <td className={`${td} font-bold text-emerald-700`}>{fmtRp(sum("saprodi"))}</td>
                <td className={`${td} font-bold text-blue-700`}>{fmtRp(sum("labour"))}</td>
                <td className={`${td} font-bold text-amber-700`}>{fmtRp(sum("operasional"))}</td>
                <td className={`${td} font-bold`}>{fmtRp(sum("total"))}</td>
              </tr></tfoot>
            )}
          </table>{pg.pager}
          {loading && <div className="p-10 text-center text-sm text-slate-400">Memuat…</div>}
        </Card>
      )}
      {tab === "lines" && <Distribution key={linesKey} kind="ps" embedded />}
      {tab === "ops" && <OperationalInvestmentPanel />}
    </div>
  );
}
