// Outstanding Petani, per commodity (feedback JNBS finance, 2026-11-05).
//
// A farmer repays off the deliveries of one crop — banana today; mango, coffee
// and balsa have not been harvested — so each crop is read on its own:
// distributed, repaid off that crop's deliveries, and what is left. Mango and
// coffee therefore show their debt at 0% paid, which is the truth.
//
// Frozen: the banana of Mustari, Eko Irawan and Yudis moved to profit sharing on
// 29 Aug 2025. Nothing is deducted per kg any more; the debt left on 28 Aug is
// frozen and settled out of the profit share at the end (Bayar Bagi Hasil). No
// progress bar there — per plot, the figures of the JNBS "Mustari Outstanding
// Debt" sheet.

import { Fragment, useMemo, useState } from "react";
import { Search, AlertTriangle, Users, DollarSign, TrendingDown, Snowflake, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { useClientPage } from "../../components/Pagination";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";

interface PlotLine { plot_id: number | null; plot_name: string | null; scheme: string | null; frozen_since: string | null; distributed: number; paid: number; outstanding: number }
interface Row {
  farmer_id: number; farmer_name: string; entity_name: string | null;
  commodities_id: number | null; commodity_name: string | null;
  distributed: number; paid: number; cash_paid: number; outstanding: number;
  frozen: boolean; frozen_since: string | null; frozen_outstanding: number;
  plots: PlotLine[];
}

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const short = (n?: string | null) => (n ? (n.match(/\(([^)]+)\)/)?.[1] ?? n) : "Tanpa komoditas");
const fmtD = (d?: string | null) =>
  d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";

type Status = "frozen" | "lunas" | "berjalan" | "belum";
function statusOf(r: Row): Status {
  if (r.frozen) return "frozen";
  if (r.outstanding <= 0) return "lunas";
  return r.paid > 0 ? "berjalan" : "belum";
}
const STATUS: Record<Status, { label: string; cls: string; dot: string }> = {
  frozen:   { label: "Dibekukan",          cls: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-500" },
  lunas:    { label: "Lunas",              cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  berjalan: { label: "Berjalan",           cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  belum:    { label: "Belum ada cicilan",  cls: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

export default function OutstandingFarmer() {
  const bound = useEntityBound();
  const [entityFilter, setEntityFilter] = useState("");
  const { data, loading, error } = useApi<Row[]>("pre-finance/outstanding/by-commodity", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const all = useMemo(() => data || [], [data]);
  // One button per crop, the largest debt first — Pisang, Kakao, Kopi, Mangga …
  const commodities = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of all) m.set(r.commodity_name ?? "", (m.get(r.commodity_name ?? "") || 0) + r.distributed);
    return [...m].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [all]);
  const [com, setCom] = useState<string | null>(null);
  const active = com ?? commodities[0] ?? "";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | Status>("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const ofCom = all.filter((r) => (r.commodity_name ?? "") === active);
  const filtered = ofCom.filter((r) => (search === "" || r.farmer_name.toLowerCase().includes(search.toLowerCase()))
    && (!statusFilter || statusOf(r) === statusFilter));
  const pg = useClientPage(filtered, [active, search, statusFilter]);
  const sum = (rs: Row[], k: keyof Row) => rs.reduce((s, r) => s + Number(r[k] || 0), 0);
  const frozenRows = ofCom.filter((r) => r.frozen);
  const th = "py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Outstanding Petani</h1>
        <p className="text-sm text-slate-500">
          Utang Pre-Finance per komoditas: total distribusi − cicilan dari setoran komoditas itu. Pilih komoditasnya di bawah —
          cicilan dari setoran pisang hanya membayar utang pisang.
        </p>
        <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
      </div>

      {/* One button per crop, large on purpose: the figures below are for that crop only. */}
      <div className="flex flex-wrap gap-2">
        {commodities.map((c) => {
          const rs = all.filter((r) => (r.commodity_name ?? "") === c);
          return (
            <button key={c || "none"} type="button" onClick={() => setCom(c)}
              className={`text-left rounded-2xl border px-4 py-3 min-w-[150px] transition-colors ${active === c ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className={`text-base font-bold ${active === c ? "text-emerald-800" : "text-slate-800"}`}>{short(c)}</div>
              <div className="text-xs text-slate-500 mt-0.5">{rs.length} petani · sisa <span className="font-mono">{fmtRp(sum(rs, "outstanding"))}</span></div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: `Petani ${short(active)}`, value: String(ofCom.length), icon: Users, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "Total Distribusi", value: fmtRp(sum(ofCom, "distributed")), icon: DollarSign, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Total Terbayar", value: fmtRp(sum(ofCom, "paid")), icon: TrendingDown, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Outstanding", value: fmtRp(sum(ofCom, "outstanding")), icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{s.label}</p>
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            </div>
            <p className={`text-lg font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {frozenRows.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-violet-50 border border-violet-200 rounded-xl">
          <Snowflake className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-violet-800">
            <span className="font-semibold">{frozenRows.map((r) => r.farmer_name).join(", ")}</span>: lahan {short(active).toLowerCase()} beralih ke
            Profit Sharing — utang Pre-Finance <b>dibekukan per {fmtD(frozenRows[0].frozen_since)}</b> sebesar{" "}
            <b className="font-mono">{fmtRp(sum(frozenRows, "frozen_outstanding"))}</b>. Tidak dicicil per kg lagi; sisanya dipotong dari
            bagian bagi hasil petani di akhir (Bayar Bagi Hasil).
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option value="">Semua status</option>
          {(Object.keys(STATUS) as Status[]).map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
        <div className="flex-1 relative min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari petani..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Petani", ...(bound ? [] : ["Entitas"]), "Lahan", "Total Distribusi", "Total Terbayar", "Outstanding", "Progress Bayar", "Status"].map((h) => (
                <th key={h} className={`${["Total Distribusi", "Total Terbayar", "Outstanding"].includes(h) ? "text-right" : "text-left"} ${th}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pg.pageRows.map((r) => {
                const k = `${r.farmer_id}-${r.commodities_id}`;
                const st = statusOf(r);
                const pct = r.distributed > 0 ? Math.min((r.paid / r.distributed) * 100, 100) : 0;
                const plotsWithDebt = r.plots.filter((p) => p.plot_id != null);
                const isOpen = open.has(k);
                return (
                  <Fragment key={k}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; })}>
                      <td className="py-4 px-5 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {isOpen ? <ChevronDown className="inline w-3.5 h-3.5 mr-1 text-slate-400" /> : <ChevronRight className="inline w-3.5 h-3.5 mr-1 text-slate-400" />}
                        {r.farmer_name}
                      </td>
                      {!bound && <td className="py-4 px-5"><EntityTag name={r.entity_name} /></td>}
                      <td className="py-4 px-5 text-xs text-slate-600">{plotsWithDebt.map((p) => p.plot_name).join(", ") || "—"}</td>
                      <td className="py-4 px-5 text-right text-sm font-mono text-slate-700">{fmtRp(r.distributed)}</td>
                      <td className="py-4 px-5 text-right text-sm font-mono text-emerald-700 font-semibold">{r.paid ? fmtRp(r.paid) : "—"}</td>
                      <td className="py-4 px-5 text-right">
                        <span className={`text-sm font-mono font-bold ${r.outstanding > 0 ? (r.frozen ? "text-violet-700" : "text-amber-700") : "text-slate-400"}`}>
                          {r.outstanding > 0 ? fmtRp(r.outstanding) : "—"}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        {r.frozen ? (
                          // No bar: nothing is repaid per kg any more.
                          <span className="inline-flex items-center gap-1 text-xs text-violet-700"><Snowflake className="w-3.5 h-3.5" />beku per {fmtD(r.frozen_since)}</span>
                        ) : (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">{pct.toFixed(0)}%</p>
                            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS[st].cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS[st].dot}`} />{STATUS[st].label}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <td colSpan={bound ? 7 : 8} className="px-5 py-3">
                          <table className="w-full text-sm bg-white rounded-lg border border-slate-100">
                            <thead><tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                              <th className="text-left py-1.5 px-3">Lahan</th><th className="text-right py-1.5 px-3">Distribusi</th>
                              <th className="text-right py-1.5 px-3">Terbayar</th><th className="text-right py-1.5 px-3">Sisa</th><th className="text-left py-1.5 px-3">Keterangan</th>
                            </tr></thead>
                            <tbody>
                              {r.plots.map((p) => (
                                <tr key={String(p.plot_id)} className="border-t border-slate-50">
                                  <td className="py-1.5 px-3 font-medium text-slate-800">{p.plot_name ?? "cicilan tunai (tanpa setoran)"}</td>
                                  <td className="py-1.5 px-3 text-right font-mono">{p.distributed ? fmtRp(p.distributed) : "—"}</td>
                                  <td className="py-1.5 px-3 text-right font-mono text-emerald-700">{p.paid ? fmtRp(p.paid) : "—"}</td>
                                  <td className="py-1.5 px-3 text-right font-mono font-semibold">{fmtRp(p.outstanding)}</td>
                                  <td className="py-1.5 px-3 text-xs text-slate-500">
                                    {p.frozen_since ? `Dibekukan per ${fmtD(r.frozen_since)} — beralih ke Profit Sharing`
                                      : p.plot_id == null ? "dicatat di buku cicilan, tidak terkait setoran lahan mana pun" : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="py-3 px-5 text-sm font-semibold text-slate-700" colSpan={bound ? 2 : 3}>Total {short(active)} ({filtered.length} petani)</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-slate-700">{fmtRp(sum(filtered, "distributed"))}</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-emerald-700">{fmtRp(sum(filtered, "paid"))}</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-amber-700">{fmtRp(sum(filtered, "outstanding"))}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>{pg.pager}
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat data…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Tidak ada data outstanding</p>
          </div>
        )}
      </Card>
    </div>
  );
}
