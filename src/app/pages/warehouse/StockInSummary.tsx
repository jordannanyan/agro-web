// Goods received read the way people ask about them — what came in, from whom,
// and when — instead of per receipt. Each group is one card: what or who, how
// much and how often, and, opened, the items (or suppliers) under it.

import { useState } from "react";
import { ChevronDown, ChevronRight, Package, Truck, CalendarDays, PackagePlus } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";
import { EntityTag, useEntityBound } from "../../components/EntityScope";

export type InGroup = "item" | "source" | "month";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const fmtDate = (d?: string | null) =>
  d ? new Date(String(d).slice(0, 10) + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";
const fmtMonth = (m: string) =>
  /^\d{4}-\d{2}$/.test(m) ? new Date(`${m}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : m;

interface Part { id: string | number; name: string; unit_name: string | null; qty: number; value: number; unpriced: number; doc_count: number; last_date: string }
interface Row {
  id: string | number; name: string; entity_names: string[]; warehouse_names: string[];
  doc_count: number; line_count: number; first_date: string; last_date: string;
  value: number; unpriced: number; qty: number | null; unit_name: string | null; parts: Part[];
}

const COLORS = ["bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-violet-500", "bg-rose-500", "bg-slate-400"];

export default function StockInSummary({ group, query }: { group: InGroup; query: Record<string, string | undefined> }) {
  const bound = useEntityBound();
  const { data, loading, error } = useApi<Row[]>("stock-in/summary", { ...query, group }, [group, JSON.stringify(query)]);
  const rows: Row[] = data || [];
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const total = rows.reduce((s, r) => s + r.value, 0);
  const Icon = group === "item" ? Package : group === "source" ? Truck : CalendarDays;
  const noun = group === "item" ? "barang" : group === "source" ? "pemasok" : "bulan";
  const partNoun = group === "item" ? "Pemasok" : "Barang";

  if (loading) return <Card className="p-10 text-center text-sm text-slate-400">Memuat…</Card>;
  if (error) return <Card className="p-6 text-sm text-red-500">{String(error)}</Card>;
  if (!rows.length) return (
    <Card className="p-12 text-center"><PackagePlus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-400">Belum ada barang masuk untuk filter ini.</p></Card>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-sm text-slate-600">
          <b className="text-slate-900">{rows.length}</b> {noun} · barang masuk senilai <b className="text-slate-900">{fmtRp(total)}</b>
          <span className="text-slate-400"> (Stock In berstatus Draft tidak dihitung)</span>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(new Set(rows.map((r) => String(r.id))))} className="text-xs text-emerald-700 hover:underline">Buka semua</button>
          <span className="text-slate-300">·</span>
          <button type="button" onClick={() => setOpen(new Set())} className="text-xs text-emerald-700 hover:underline">Tutup semua</button>
        </div>
      </div>

      {rows.map((r) => {
        const k = String(r.id);
        const isOpen = open.has(k);
        const share = total > 0 ? (r.value / total) * 100 : 0;
        const top = r.parts.slice(0, 6);
        return (
          <Card key={k} className="overflow-hidden">
            <button type="button" onClick={() => toggle(k)} className="w-full text-left p-4 hover:bg-slate-50/60">
              <div className="flex items-start gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 mt-1 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 mt-1 text-slate-400 shrink-0" />}
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{group === "month" ? fmtMonth(String(r.name)) : r.name}</span>
                    {group === "item" && r.qty != null && (
                      <span className="text-sm font-mono text-slate-600">{num(r.qty)} <span className="font-sans text-xs text-slate-500">{r.unit_name || ""}</span></span>
                    )}
                    {!bound && r.entity_names.map((e) => <EntityTag key={e} name={e} />)}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">Gudang: {r.warehouse_names.join(", ") || "—"}</p>
                  {/* What it was made of, by value — a bar a reader takes in at a glance. */}
                  {top.length > 0 && r.value > 0 && (
                    <div className="mt-2 max-w-xl">
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 gap-px">
                        {top.map((p, i) => <div key={`${p.id}-${i}`} className={COLORS[i % COLORS.length]} style={{ width: `${(p.value / r.value) * 100}%` }} />)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-600">
                        {top.map((p, i) => (
                          <span key={`${p.id}-${i}`} className="inline-flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-sm ${COLORS[i % COLORS.length]}`} />{p.name}{group !== "item" ? ` ${num(p.qty)} ${p.unit_name || ""}` : ""} · {fmtRp(p.value)}
                          </span>
                        ))}
                        {r.parts.length > top.length && <span className="text-slate-400">+{r.parts.length - top.length} lainnya</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono font-semibold text-slate-900">{fmtRp(r.value)}</div>
                  <div className="text-[11px] text-slate-500">{share.toFixed(share < 10 ? 1 : 0)}% dari total</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{r.doc_count}× penerimaan · {r.line_count} baris</div>
                  <div className="text-[11px] text-slate-400">{fmtDate(r.first_date)}{r.first_date !== r.last_date ? ` – ${fmtDate(r.last_date)}` : ""}</div>
                  {r.unpriced > 0 && <div className="text-[11px] text-amber-600">{r.unpriced} baris tanpa harga</div>}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3">
                <table className="w-full text-sm bg-white rounded-lg border border-slate-100 overflow-hidden">
                  <thead><tr className="text-[11px] uppercase tracking-wide text-slate-500 bg-slate-50">
                    <th className="text-left py-1.5 px-3 font-semibold">{partNoun}</th>
                    <th className="text-right py-1.5 px-3 font-semibold">Jumlah</th>
                    <th className="text-right py-1.5 px-3 font-semibold">Nilai</th>
                    <th className="text-right py-1.5 px-3 font-semibold">Penerimaan</th>
                    <th className="text-right py-1.5 px-3 font-semibold">Terakhir</th>
                  </tr></thead>
                  <tbody>
                    {r.parts.map((p, j) => (
                      <tr key={`${p.id}-${j}`} className="border-t border-slate-50">
                        <td className="py-1.5 px-3 text-slate-800">{p.name}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">{num(p.qty)} <span className="font-sans text-xs text-slate-500">{p.unit_name || ""}</span></td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {p.value ? fmtRp(p.value) : <span className="text-xs text-slate-400">harga tidak tercatat</span>}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-600">{p.doc_count}×</td>
                        <td className="py-1.5 px-3 text-right text-slate-500 whitespace-nowrap">{fmtDate(p.last_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
