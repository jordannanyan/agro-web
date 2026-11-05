// Stock out read the way people ask about it — per farmer, per plot, per
// commodity — instead of per document. Each group is one card: who or what, how
// much went out and how often, and, opened, the items under the commodity they
// were issued for. Plots show what grows on them.

import { useState } from "react";
import { ChevronDown, ChevronRight, Sprout, User, MapPin, Package } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";
import { EntityTag, useEntityBound } from "../../components/EntityScope";
import { useClientPage } from "../../components/Pagination";

export type Group = "farmer" | "plot" | "commodity";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const fmtDate = (d?: string | null) =>
  d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
// "Banana (Pisang)" → "Pisang": the name the field team uses.
const short = (n?: string | null) => (n ? (n.match(/\(([^)]+)\)/)?.[1] ?? n) : "");

interface Item { sapropdi_id: number | null; sapropdi_name: string; unit_name: string | null; qty: number; amount: number; line_count: number }
interface PerCommodity { commodity_id: number | null; commodity_name: string; scheme: string; amount: number; items: Item[] }
interface Row {
  id: number | null; name: string; entity_names: string[]; farmer_name?: string | null;
  amount: number; line_count: number; doc_count: number; farmer_count: number;
  first_date: string; last_date: string;
  plots: { id: number; plot_name: string; planted: string[] }[];
  farmers?: string[];
  by_scheme: Record<string, number>;
  by_commodity: PerCommodity[];
}

// What the goods were for. Taken from the line, not the plot: a plot that changed
// scheme keeps the old one on what it received before the change.
const SCHEME: Record<string, { label: string; cls: string }> = {
  PreFinance:    { label: "Pre-Finance", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  ProfitSharing: { label: "Profit Sharing", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  BeliPutus:     { label: "Beli Putus", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};
export function SchemeTag({ scheme }: { scheme: string }) {
  const m = SCHEME[scheme] ?? SCHEME.BeliPutus;
  return <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${m.cls}`}>{m.label}</span>;
}

const COLORS = ["bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-violet-500", "bg-rose-500", "bg-slate-400"];

export default function StockOutSummary({ group, query }: { group: Group; query: Record<string, string | undefined> }) {
  const bound = useEntityBound();
  const { data, loading, error } = useApi<Row[]>("stock-out/summary", { ...query, group }, [group, JSON.stringify(query)]);
  const rows: Row[] = data || [];
  const pg = useClientPage(rows);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const Icon = group === "farmer" ? User : group === "plot" ? MapPin : Sprout;
  const noun = group === "farmer" ? "petani" : group === "plot" ? "lahan" : "komoditas";

  if (loading) return <Card className="p-10 text-center text-sm text-slate-400">Memuat…</Card>;
  if (error) return <Card className="p-6 text-sm text-red-500">{String(error)}</Card>;
  if (!rows.length) return (
    <Card className="p-12 text-center"><Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-400">Belum ada barang keluar untuk filter ini.</p></Card>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-slate-600">
          <b className="text-slate-900">{rows.length}</b> {noun} menerima barang senilai <b className="text-slate-900">{fmtRp(total)}</b>
          <span className="text-slate-500"> — <b>semua komoditas</b> (pisang, kopi, mangga, balsa, …), dipisah per komoditas & skema di tiap kartu</span>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(new Set(rows.map((r) => String(r.id))))} className="text-xs text-emerald-700 hover:underline">Buka semua</button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={() => setOpen(new Set())} className="text-xs text-emerald-700 hover:underline">Tutup semua</button>
        </div>
      </div>

      {pg.pageRows.map((r) => {
        const k = String(r.id);
        const isOpen = open.has(k);
        const share = total > 0 ? (r.amount / total) * 100 : 0;
        return (
          <Card key={k} className="overflow-hidden">
            <button type="button" onClick={() => toggle(k)} className="w-full text-left p-4 hover:bg-slate-50/60">
              <div className="flex items-start gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 mt-1 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 text-slate-400 shrink-0" />}
                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{group === "commodity" ? short(r.name) || r.name : r.name}</span>
                    {group === "plot" && r.farmer_name && <span className="text-sm text-slate-500">· {r.farmer_name}</span>}
                    {!bound && r.entity_names.map((e) => <EntityTag key={e} name={e} />)}
                  </div>
                  {/* Debt and profit-sharing cost, side by side — they are settled differently. */}
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    {Object.entries(r.by_scheme || {}).sort((a, b) => b[1] - a[1]).map(([s, v]) => (
                      <span key={s} className="inline-flex items-center gap-1"><SchemeTag scheme={s} /><span className="font-mono text-slate-600">{fmtRp(v)}</span></span>
                    ))}
                  </div>
                  {/* Where it went, and what grows there. */}
                  {group !== "commodity" && r.plots.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {r.plots.map((p) => (
                        <span key={p.id} className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
                          {group === "farmer" && <><MapPin className="w-3 h-3 text-slate-400" />{p.plot_name}</>}
                          {p.planted.length > 0 && <span className="text-emerald-700">{group === "farmer" ? " · " : <Sprout className="inline w-3 h-3 mr-0.5" />}{p.planted.map(short).join(", ")}</span>}
                          {p.planted.length === 0 && group === "plot" && <span className="text-slate-400">komoditas lahan belum tercatat</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  {group === "commodity" && (
                    <p className="mt-1 text-xs text-slate-500">
                      {r.farmer_count} petani{r.farmers?.length ? `: ${r.farmers.slice(0, 6).join(", ")}${r.farmers.length > 6 ? `, +${r.farmers.length - 6} lainnya` : ""}` : ""}
                    </p>
                  )}
                  {/* For what crop, by value — a bar a reader takes in at a glance. */}
                  {group !== "commodity" && r.by_commodity.length > 0 && (
                    <div className="mt-2 max-w-xl">
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 gap-px">
                        {r.by_commodity.map((c, i) => (
                          <div key={`${c.commodity_id}-${c.scheme}`} className={COLORS[i % COLORS.length]} style={{ width: `${r.amount ? (c.amount / r.amount) * 100 : 0}%` }} />
                        ))}
                      </div>
                      {/* Crop and scheme, large: this list covers every commodity, not only
                          banana, and each crop is repaid on its own terms. */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.by_commodity.map((c, i) => (
                          <span key={`${c.commodity_id}-${c.scheme}`}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                            <span className={`w-2.5 h-2.5 rounded-sm ${COLORS[i % COLORS.length]}`} />
                            <span className="text-sm font-bold text-slate-900">{short(c.commodity_name) || "Tanpa komoditas"}</span>
                            <span className={`text-xs font-semibold ${c.scheme === "ProfitSharing" ? "text-violet-700" : c.scheme === "PreFinance" ? "text-sky-700" : "text-slate-500"}`}>
                              {SCHEME[c.scheme]?.label ?? c.scheme}
                            </span>
                            <span className="text-sm font-mono text-slate-700">{fmtRp(c.amount)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-slate-900">{fmtRp(r.amount)}</div>
                  <div className="text-[11px] text-slate-500">{share.toFixed(share < 10 ? 1 : 0)}% dari total</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{r.doc_count}× pengambilan · {r.line_count} barang</div>
                  <div className="text-[11px] text-slate-400">{fmtDate(r.first_date)}{r.first_date !== r.last_date ? ` – ${fmtDate(r.last_date)}` : ""}</div>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-3">
                {r.by_commodity.map((c, i) => (
                  <div key={`${c.commodity_id}-${c.scheme}`}>
                    {(
                      <div className="flex items-center justify-between mb-1">
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
                          <span className={`w-2.5 h-2.5 rounded-sm ${COLORS[i % COLORS.length]}`} />Untuk {short(c.commodity_name) || c.commodity_name}
                          <span className={`text-xs font-semibold ${c.scheme === "ProfitSharing" ? "text-violet-700" : c.scheme === "PreFinance" ? "text-sky-700" : "text-slate-500"}`}>
                            {SCHEME[c.scheme]?.label ?? c.scheme}
                          </span>
                        </span>
                        <span className="text-sm font-mono font-semibold text-slate-700">{fmtRp(c.amount)}</span>
                      </div>
                    )}
                    <table className="w-full text-sm bg-white rounded-lg border border-slate-100 overflow-hidden">
                      <thead><tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                        <th className="text-left py-1.5 px-3 font-semibold">Barang</th>
                        <th className="text-right py-1.5 px-3 font-semibold">Jumlah</th>
                        <th className="text-right py-1.5 px-3 font-semibold">Nilai</th>
                      </tr></thead>
                      <tbody>
                        {c.items.map((it, j) => (
                          <tr key={`${it.sapropdi_id}-${j}`} className="border-t border-slate-50">
                            <td className="py-1.5 px-3 text-slate-800">{it.sapropdi_name}</td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                              {num(it.qty)} <span className="font-sans text-xs text-slate-500">{it.unit_name || ""}</span>
                            </td>
                            <td className="py-1.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">{fmtRp(it.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
      {pg.pager}
    </div>
  );
}
