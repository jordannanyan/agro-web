// Budget — the consolidated view of every Fund Request budget line.
//
// No "+ Add budget": the budget is entered once, in the Fund Request. Each row
// opens its document; to change a budget, revise the Fund Request (or move budget
// in its Section 3.1 once approved).

import { Fragment, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Search, Wallet, ExternalLink } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { ExportMenu } from "../../components/ExportMenu";
import { EntityTag } from "../../components/EntityScope";
import { rp, periodLabel } from "./frShared";
import { exportCsv, FinanceFilters, useFinanceFilters } from "./financeFilters";

interface Row {
  id: number; fund_request_id: number; fr_number: string; period: string; stage: string; status: string;
  entity_name: string; section: string; group_label: string | null; description: string; reason: string | null;
  period_to_be_paid: string | null; activities: string | null; species: string | null; profit_center: string | null;
  budget_code: string | null; main_account: string | null; sub_account: string | null; budget_purpose: string;
  planned: number; realloc: number; budget: number; actual: number; remaining: number;
}

export default function FinanceBudget() {
  const navigate = useNavigate();
  const f = useFinanceFilters();
  const [params] = useSearchParams();
  const codeFilter = params.get("budget_code_id") || undefined;
  const [all, setAll] = useState(false);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"none" | "main_account" | "budget_purpose" | "fr_number">("main_account");
  const { data, loading } = useApi<Row[]>("finance/budget", { ...f.query, status: all ? "all" : undefined, search: search || undefined, budget_code_id: codeFilter }, [f.key, all, search, codeFilter]);
  const rows = data || [];
  const approved = rows.filter((r) => r.stage === "hq_approved");
  const sum = (a: Row[], k: keyof Row) => a.reduce((s, r) => s + Number(r[k] || 0), 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const groups = useMemo(() => {
    if (groupBy === "none") return [["", rows]] as [string, Row[]][];
    const m = new Map<string, Row[]>();
    for (const r of rows) { const k = String((r as any)[groupBy] || "Tanpa budget code"); if (!m.has(k)) m.set(k, []); m.get(k)!.push(r); }
    return [...m.entries()];
  }, [rows, groupBy]);

  const kpi = [
    { label: "Total budget (disetujui)", value: rp(sum(approved, "budget")) },
    { label: "Budget bulan ini", value: rp(sum(approved.filter((r) => r.period === thisMonth), "budget")) },
    { label: `Budget YTD ${new Date().getFullYear()}`, value: rp(sum(approved.filter((r) => r.period.startsWith(String(new Date().getFullYear())) && r.period <= thisMonth), "budget")) },
    { label: "Sisa budget", value: rp(sum(approved, "remaining")) },
  ];
  const th = "py-2.5 px-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Budget</h1>
          <p className="text-sm text-slate-500">Konsolidasi item budget dari Fund Request. Tidak diinput di sini — ubah lewat Fund Request-nya.</p>
        </div>
        <ExportMenu onExportExcel={() => exportCsv("budget", rows, [
          ["FR", "fr_number"], ["Periode", "period"], ["PT", "entity_name"], ["Status", "status"], ["Budget purpose", "budget_purpose"],
          ["Main account", "main_account"], ["Sub account", "sub_account"], ["Deskripsi", "description"], ["Reason", "reason"],
          ["Period to be paid", "period_to_be_paid"], ["Activities", "activities"], ["Species", "species"], ["Profit centre", "profit_center"],
          ["Rencana", "planned"], ["Realloc", "realloc"], ["Budget", "budget"], ["Actual", "actual"], ["Remaining", "remaining"]])} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpi.map((k) => <Card key={k.label} className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{k.label}</p><p className="text-xl font-bold font-mono text-slate-900">{k.value}</p></Card>)}
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <FinanceFilters f={f} />
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
            <option value="main_account">Kelompokkan: Main account</option><option value="budget_purpose">Kelompokkan: Budget purpose</option>
            <option value="fr_number">Kelompokkan: Fund request</option><option value="none">Tanpa pengelompokan</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-emerald-500" />Termasuk yang belum disetujui</label>
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input className="pl-9" placeholder="Cari item, FR, kode…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </Card>
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              <th className={`${th} text-left`}>Fund request</th><th className={`${th} text-left`}>Sub account</th><th className={`${th} text-left`}>Deskripsi</th>
              <th className={`${th} text-left`}>Activities · Species · Profit centre</th>
              <th className={`${th} text-right`}>Budget</th><th className={`${th} text-right`}>Actual</th><th className={`${th} text-right`}>Remaining</th><th className={th} />
            </tr></thead>
            <tbody>
              {groups.map(([k, rs]) => (
                <Fragment key={`g-${k}`}>
                  {groupBy !== "none" && (
                    <tr className="bg-slate-50/70 border-y border-slate-100">
                      <td colSpan={4} className="px-3 py-2 text-xs font-semibold text-slate-700">{k} <span className="text-slate-400 font-normal">· {rs.length} item</span></td>
                      <td className="px-3 text-right font-mono text-xs font-semibold">{rp(sum(rs, "budget"))}</td>
                      <td className="px-3 text-right font-mono text-xs font-semibold">{rp(sum(rs, "actual"))}</td>
                      <td className="px-3 text-right font-mono text-xs font-semibold">{rp(sum(rs, "remaining"))}</td><td />
                    </tr>
                  )}
                  {rs.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 text-xs">
                        <span className="font-mono font-semibold text-emerald-700">{r.fr_number}</span>
                        <span className="block text-slate-400">{periodLabel(r.period)} · {r.status}</span>
                        <EntityTag name={r.entity_name} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-600">{r.sub_account || <span className="text-amber-600">tanpa kode</span>}<span className="block text-slate-400">{r.budget_purpose}</span></td>
                      <td className="px-3 py-2.5 text-sm text-slate-800">{r.description}{r.reason && <span className="block text-xs text-slate-400">{r.reason}</span>}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500">{[r.activities, r.species, r.profit_center].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-slate-900">{rp(r.budget)}{r.realloc !== 0 && <span className="block text-[10.5px] text-slate-400">realloc {r.realloc > 0 ? "+" : ""}{rp(r.realloc)}</span>}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-slate-700">{r.actual ? rp(r.actual) : "—"}</td>
                      <td className={`px-3 py-2.5 text-right font-mono text-sm font-semibold ${r.remaining < 0 ? "text-red-600" : "text-slate-900"}`}>{rp(r.remaining)}</td>
                      <td className="px-3"><button onClick={() => navigate(`/financial/fund-request/${r.fund_request_id}`)} title="Buka fund request" className="p-1.5 text-slate-400 hover:text-emerald-700"><ExternalLink className="w-4 h-4" /></button></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {!loading && rows.length === 0 && <div className="p-16 text-center"><Wallet className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada budget</p><p className="text-sm text-slate-400 mt-1">Budget muncul setelah Fund Request disetujui HQ.</p></div>}
      </Card>
    </div>
  );
}
