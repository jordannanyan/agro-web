// Budget vs Actual — the comparison layer. Budget = approved Fund Request lines
// (after reallocation); Actual = Paid payment requests + Finance's manual
// bookings. Variance = Budget − Actual; utilisation = Actual / Budget.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle2, AlertTriangle, XOctagon, HelpCircle, BarChart3 } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";
import { ExportMenu } from "../../components/ExportMenu";
import { rp } from "./frShared";
import { exportCsv, FinanceFilters, useFinanceFilters } from "./financeFilters";

interface Row {
  budget_code_id: number | null; budget_code: string; main_account: string; sub_account: string;
  budget: number; actual: number; variance: number; utilization: number | null; status: string; lines: number; transactions: number;
}

// Categorical slots 1–2 of the reference palette (validated: CVD ΔE 24.7, contrast ≥ 3:1 on white).
const C_BUDGET = "#2a78d6";
const C_ACTUAL = "#eb6834";

const STATUS: Record<string, { icon: any; cls: string; label: string }> = {
  "Under Budget": { icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Under budget" },
  "Near Budget": { icon: AlertTriangle, cls: "text-amber-700 bg-amber-50 border-amber-200", label: "Near budget" },
  "Over Budget": { icon: XOctagon, cls: "text-red-700 bg-red-50 border-red-200", label: "Over budget" },
  Unbudgeted: { icon: HelpCircle, cls: "text-slate-700 bg-slate-100 border-slate-200", label: "Tanpa budget" },
};
const short = (n: number) => {
  const a = Math.abs(n);
  return a >= 1e9 ? `${(n / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M` : a >= 1e6 ? `${(n / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : Math.round(n).toLocaleString("id-ID");
};

function StatusPill({ s }: { s: string }) {
  const m = STATUS[s] || STATUS["Under Budget"];
  const I = m.icon;
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${m.cls}`}><I className="w-3 h-3" />{m.label}</span>;
}

/** Paired horizontal bars per main account — one scale for both series. */
function Chart({ groups }: { groups: { main: string; budget: number; actual: number }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...groups.flatMap((g) => [g.budget, g.actual]));
  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: C_BUDGET }} />Budget</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: C_ACTUAL }} />Actual</span>
      </div>
      <div className="space-y-4">
        {groups.map((g) => {
          const pct = g.budget > 0 ? Math.round(g.actual / g.budget * 100) : null;
          return (
            <div key={g.main} onMouseEnter={() => setHover(g.main)} onMouseLeave={() => setHover(null)}
              className={`grid grid-cols-[180px_1fr_120px] items-center gap-3 rounded-lg px-2 py-1.5 ${hover === g.main ? "bg-slate-50" : ""}`}>
              <span className="text-xs text-slate-700 font-medium truncate" title={g.main}>{g.main}</span>
              <div className="space-y-[2px] relative">
                {([["Budget", g.budget, C_BUDGET], ["Actual", g.actual, C_ACTUAL]] as const).map(([lbl, v, col]) => (
                  <div key={lbl} className="h-3 bg-slate-100/60 rounded-r">
                    <div className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(v > 0 ? 0.6 : 0, v / max * 100)}%`, background: col }} />
                  </div>
                ))}
                {hover === g.main && (
                  <div className="absolute z-10 -top-14 left-0 bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap">
                    <b>{g.main}</b><br />Budget {rp(g.budget)} · Actual {rp(g.actual)}{pct != null ? ` · ${pct}%` : ""}
                  </div>
                )}
              </div>
              <span className="text-xs font-mono text-slate-600 text-right">{short(g.actual)} / {short(g.budget)}<span className="block text-[10.5px] text-slate-400">{pct != null ? `${pct}% terpakai` : "tanpa budget"}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FinanceBudgetVsActual() {
  const navigate = useNavigate();
  const f = useFinanceFilters();
  const { data, loading } = useApi<Row[]>("finance/budget-vs-actual", f.query, [f.key]);
  const rows = data || [];
  const tb = rows.reduce((s, r) => s + r.budget, 0);
  const ta = rows.reduce((s, r) => s + r.actual, 0);
  const groups = useMemo(() => {
    const m = new Map<string, { main: string; budget: number; actual: number }>();
    for (const r of rows) { const k = r.main_account || "—"; if (!m.has(k)) m.set(k, { main: k, budget: 0, actual: 0 }); const g = m.get(k)!; g.budget += r.budget; g.actual += r.actual; }
    return [...m.values()].sort((a, b) => b.budget - a.budget);
  }, [rows]);
  const util = tb > 0 ? Math.round(ta / tb * 1000) / 10 : null;
  const kpi = [
    { label: "Total budget", value: rp(tb) }, { label: "Total actual", value: rp(ta) },
    { label: "Sisa budget", value: rp(tb - ta), tone: tb - ta < 0 ? "text-red-600" : "text-slate-900" },
    { label: "Variance", value: rp(tb - ta), tone: tb - ta < 0 ? "text-red-600" : "text-emerald-700" },
    { label: "Utilisasi", value: util == null ? "—" : `${util.toLocaleString("id-ID")}%`, tone: util != null && util > 100 ? "text-red-600" : "text-slate-900" },
  ];
  const th = "py-2.5 px-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Budget vs Actual</h1>
          <p className="text-sm text-slate-500">Budget dari Fund Request yang disetujui, Actual dari Payment Request Paid + catatan manual Finance. Variance = Budget − Actual.</p>
        </div>
        <ExportMenu onExportExcel={() => exportCsv("budget-vs-actual", rows, [["Main account", "main_account"], ["Sub account", "sub_account"], ["Budget", "budget"],
          ["Actual", "actual"], ["Variance", "variance"], ["Utilisasi %", "utilization"], ["Status", "status"]])} />
      </div>
      <Card className="p-4"><div className="flex flex-wrap items-center gap-3"><FinanceFilters f={f} /></div></Card>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpi.map((k) => <Card key={k.label} className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{k.label}</p><p className={`text-xl font-bold font-mono ${k.tone || "text-slate-900"}`}>{k.value}</p></Card>)}
      </div>
      <Card className="p-6">
        <p className="text-sm font-semibold text-slate-800 mb-1">Per main account</p>
        <p className="text-xs text-slate-400 mb-4">Satu skala untuk kedua seri. Arahkan kursor untuk nilai lengkap; tabel di bawah memuat rinciannya.</p>
        {groups.length ? <Chart groups={groups} /> : <p className="text-sm text-slate-400 py-8 text-center">{loading ? "Memuat…" : "Belum ada data di periode ini."}</p>}
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className={`${th} text-left`}>Main account</th><th className={`${th} text-left`}>Sub account</th>
              <th className={`${th} text-right`}>Budget</th><th className={`${th} text-right`}>Actual</th><th className={`${th} text-right`}>Variance</th>
              <th className={`${th} text-left w-48`}>Utilisasi</th><th className={`${th} text-left`}>Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.budget_code_id)} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => r.budget_code_id && navigate(`/financial/budget?budget_code_id=${r.budget_code_id}`)}>
                  <td className="px-3 py-2.5 text-xs text-slate-500">{r.main_account}</td>
                  <td className="px-3 py-2.5 text-sm text-slate-800">{r.sub_account}<span className="block text-[11px] text-slate-400">{r.lines} item budget · {r.transactions} transaksi</span></td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm">{rp(r.budget)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-sm">{rp(r.actual)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono text-sm font-semibold ${r.variance < 0 ? "text-red-600" : "text-slate-900"}`}>{rp(r.variance)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${r.utilization != null && r.utilization > 100 ? "bg-red-500" : r.utilization != null && r.utilization >= 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, r.utilization ?? 100)}%` }} /></div>
                      <span className="text-xs font-mono text-slate-600 w-12 text-right">{r.utilization == null ? "—" : `${r.utilization}%`}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><StatusPill s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && <div className="p-16 text-center"><BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada budget atau realisasi</p></div>}
      </Card>
    </div>
  );
}
