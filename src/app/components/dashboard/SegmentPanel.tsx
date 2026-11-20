// Each PT × commodity read as a business of its own (JNBS · Pisang, SNBS ·
// Pisang, SNBS · Kakao): sales against direct cost and non-direct spend, month by
// month. The split is the API's (GET dashboard/segments) — this only draws it.

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Card } from "../ui/card";
import { useApi } from "../../lib/hooks";

interface Segment {
  entity_id: number; entity_name: string; commodity_id: number; commodity_name: string;
  totals: { sales: number; direct: number; indirect: number; margin: number };
  parts: Record<string, number>;
  monthly: { period: string; sales: number; direct: number; indirect: number }[];
}

// The three colours the team asked for: green sales, blue direct cost, red the rest.
const C = { sales: "#10b981", direct: "#3b82f6", indirect: "#f43f5e" };

const PARTS: { key: string; label: string; group: "direct" | "indirect" }[] = [
  { key: "purchase", label: "Pembelian hasil panen (tunai ke petani/collector)", group: "direct" },
  { key: "harvest", label: "Biaya panen (tarif per kg PT)", group: "direct" },
  { key: "pnbp", label: "PNBP", group: "direct" },
  { key: "processing", label: "Proses — cuci, packing, sortir", group: "direct" },
  { key: "selling_cost", label: "Biaya kirim — transport, loading, packing", group: "direct" },
  { key: "loan_saprodi", label: "Saprodi ke petani — pupuk, pestisida, bibit", group: "indirect" },
  { key: "loan_labor", label: "Pinjaman tenaga kerja ke petani", group: "indirect" },
  { key: "ps_material", label: "Plot Profit Sharing — material", group: "indirect" },
  { key: "ps_labor", label: "Plot Profit Sharing — tenaga kerja", group: "indirect" },
];

const fmtRp = (n: number) => `Rp ${Math.round(Number(n || 0)).toLocaleString("id-ID")}`;
const fmtShort = (n: number) => {
  const v = Number(n || 0), a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}M`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}jt`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(0)}rb`;
  return String(Math.round(v));
};
const ptShort = (n: string) => n.match(/\(([^)]+)\)/)?.[1] ?? n;
const crop = (n: string) => n.match(/\(([^)]+)\)/)?.[1] ?? n;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(2, 4)}`;

const SEG_KEY = "exec_dashboard_segment";

/** 0 unless some month is clearly negative (over 5% of the tallest bar). */
function floorOf(rows: Record<string, any>[]) {
  const vals = rows.flatMap((r) => [r.Penjualan, r["Direct cost"], r["Bukan direct cost"]].map(Number));
  const max = Math.max(0, ...vals), min = Math.min(0, ...vals);
  return min < -0.05 * max ? min : 0;
}

export function SegmentPanel({ entityId }: { entityId: string }) {
  const { data, loading, error } = useApi<{ segments: Segment[] }>("dashboard/segments",
    entityId ? { entity_id: entityId } : undefined, [entityId]);
  const segs = data?.segments || [];
  const keyOf = (s: Segment) => `${s.entity_id}-${s.commodity_id}`;
  const [sel, setSel] = useState<string>(() => { try { return localStorage.getItem(SEG_KEY) || ""; } catch { return ""; } });
  const [span, setSpan] = useState<12 | 0>(12);
  const cur = segs.find((s) => keyOf(s) === sel) ?? segs[0];
  useEffect(() => { if (cur && keyOf(cur) !== sel) setSel(keyOf(cur)); }, [cur]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose = (k: string) => { setSel(k); try { localStorage.setItem(SEG_KEY, k); } catch { /* ignore */ } };

  const chart = useMemo(() => {
    const m = cur?.monthly || [];
    return (span ? m.slice(-span) : m).map((r) => ({
      period: monthLabel(r.period), Penjualan: r.sales, "Direct cost": r.direct, "Bukan direct cost": r.indirect,
    }));
  }, [cur, span]);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-slate-900 font-semibold">Per PT & Komoditas</h2>
          <p className="text-xs text-slate-500">Penjualan dibanding biaya langsung dan pengeluaran lain, per bulan</p>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
          {([[12, "12 bulan"], [0, "Semua"]] as [12 | 0, string][]).map(([v, l]) => (
            <button key={l} onClick={() => setSpan(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${span === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{l}</button>
          ))}
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-3">{error}</div>}
      {loading && !segs.length && <p className="text-sm text-slate-400">Memuat…</p>}
      {!loading && !segs.length && !error && <p className="text-sm text-slate-400">Belum ada data.</p>}

      {segs.length > 0 && (
        <>
          {/* One chip per PT × commodity, largest sales first. */}
          <div className="flex flex-wrap gap-2 mb-5">
            {segs.map((s) => {
              const on = cur && keyOf(s) === keyOf(cur);
              return (
                <button key={keyOf(s)} onClick={() => choose(keyOf(s))}
                  className={`px-3 py-2 rounded-xl border text-left transition-colors ${on ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                  <span className="block text-sm font-semibold text-slate-800">{ptShort(s.entity_name)} · {crop(s.commodity_name)}</span>
                  <span className="block text-[11px] text-slate-500 tabular-nums">
                    {s.totals.sales > 0 ? `jual ${fmtShort(s.totals.sales)}` : "belum ada penjualan"}
                  </span>
                </button>
              );
            })}
          </div>

          {cur && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { label: "Penjualan", v: cur.totals.sales, dot: C.sales },
                  { label: "Direct cost", v: cur.totals.direct, dot: C.direct },
                  { label: "Bukan direct cost", v: cur.totals.indirect, dot: C.indirect },
                  { label: "Selisih", v: cur.totals.margin, dot: null },
                ].map((x) => (
                  <div key={x.label} className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold uppercase tracking-wide">
                      {x.dot && <span className="w-2.5 h-2.5 rounded-sm" style={{ background: x.dot }} />}{x.label}
                    </p>
                    <p className={`text-lg font-bold tabular-nums mt-0.5 ${x.dot ? "text-slate-900" : x.v < 0 ? "text-red-700" : "text-emerald-700"}`}>{fmtRp(x.v)}</p>
                  </div>
                ))}
              </div>

              <div className="h-72 mb-5">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} barGap={2} barCategoryGap="22%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    {/* A small negative month (a ledger correction) must not drag the
                        axis down to −250jt; a real loss month still shows. */}
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={48}
                      domain={[floorOf(chart), "auto"]} allowDataOverflow />
                    <Tooltip formatter={(v: any) => fmtRp(Number(v))} cursor={{ fill: "rgba(148,163,184,0.12)" }}
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="square" />
                    <Bar dataKey="Penjualan" fill={C.sales} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Direct cost" fill={C.direct} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Bukan direct cost" fill={C.indirect} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* What each bar is made of, so a number can be traced to its source. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(["direct", "indirect"] as const).map((g) => {
                  const rows = PARTS.filter((p) => p.group === g && cur.parts[p.key]);
                  return (
                    <div key={g}>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: C[g] }} />
                        {g === "direct" ? "Direct cost" : "Bukan direct cost"}
                      </p>
                      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                        {rows.map((p) => (
                          <div key={p.key} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="text-slate-600">{p.label}</span>
                            <span className="font-mono tabular-nums text-slate-800">{fmtRp(cur.parts[p.key])}</span>
                          </div>
                        ))}
                        {!rows.length && <p className="px-3 py-2 text-sm text-slate-400">—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                Belanja lewat Payment Request tidak dipecah per komoditas di sini. Pupuk yang dibeli lewat PO baru terhitung saat dibagikan ke petani.
              </p>
            </>
          )}
        </>
      )}
    </Card>
  );
}
