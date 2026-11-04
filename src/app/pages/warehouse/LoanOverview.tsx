// The JNBS "Farmer Loan Overview - Banana / Mango / Coffee" sheets, read from the
// system: per farmer × plot × commodity, what was lent (saprodi, labour), what
// has been repaid off deliveries, and what is left — with the goods and labour a
// profit-sharing plot received beside it, which are a cost of its season and
// never part of the debt. Same columns as the sheets, so the two can be laid
// side by side.

import { useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";
import { EntityTag, useEntityBound } from "../../components/EntityScope";

interface Row {
  farmer_id: number; farmer_name: string; entity_name: string | null;
  plot_id: number | null; plot_name: string | null; plot_scheme: string | null;
  commodities_id: number | null; commodity_name: string | null;
  saprodi_pf: number; labour_pf: number; other_pf: number; debt_total: number;
  paid_saprodi: number; paid_labour: number; paid_other: number; paid_total: number; remaining: number;
  saprodi_ps: number; labour_ps: number; ps_total: number;
}

const rp = (n: number) => (Number(n || 0) === 0 ? "–" : Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 }));
const short = (n?: string | null) => (n ? (n.match(/\(([^)]+)\)/)?.[1] ?? n) : "");

export default function LoanOverview({ query }: { query: Record<string, string | undefined> }) {
  const bound = useEntityBound();
  const { data, loading, error } = useApi<Row[]>("pre-finance/outstanding/overview", query, [JSON.stringify(query)]);
  const [com, setCom] = useState("");
  const all: Row[] = data || [];
  // One tab per commodity, like the sheets: Pisang, Mangga, Kopi, …
  const commodities = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of all) if (r.commodity_name) m.set(r.commodity_name, (m.get(r.commodity_name) || 0) + r.debt_total + r.ps_total);
    return [...m].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }, [all]);
  // Repayments with no delivery behind them belong to no plot and no crop, so
  // they stay on every tab — they pay down the farmer's debt as a whole.
  const rows = all.filter((r) => !com || r.commodity_name === com || (r.plot_id == null && r.commodity_name == null));
  const sum = (k: keyof Row) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

  if (loading) return <Card className="p-10 text-center text-sm text-slate-400">Memuat…</Card>;
  if (error) return <Card className="p-6 text-sm text-red-500">{String(error)}</Card>;

  const th = "py-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap";
  const td = "py-2 px-3 text-right font-mono text-sm whitespace-nowrap";
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {["", ...commodities].map((c) => (
          <button key={c || "all"} type="button" onClick={() => setCom(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${com === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {c ? short(c) : "Semua komoditas"}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500 px-1">
        Sama dengan sheet <b>Farmer Loan Overview</b> di JNBS Database: utang = pinjaman saprodi + tenaga kerja berskema
        <span className="font-semibold text-sky-700"> Pre-Finance</span>, cicilan = potongan dari setoran panen lahan itu.
        Kolom <span className="font-semibold text-violet-700">Bagi Hasil</span> adalah barang & tenaga kerja untuk lahan profit sharing —
        dipotong dari margin saat penjualan, <i>tidak</i> masuk utang maupun sisa cicilan.
      </p>
      <Card className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className={`${th} text-left`} rowSpan={2}>Nama Petani</th>
              <th className={`${th} text-left`} rowSpan={2}>Plot ID</th>
              <th className={`${th} text-left`} rowSpan={2}>Komoditas</th>
              <th className={`${th} text-center border-l border-slate-200 text-sky-700`} colSpan={3}>Utang Pre-Finance</th>
              <th className={`${th} text-center border-l border-slate-200`} colSpan={3}>Cicilan Terbayar</th>
              <th className={`${th} text-right border-l border-slate-200`} rowSpan={2}>Sisa Cicilan</th>
              <th className={`${th} text-center border-l border-slate-200 text-violet-700`} colSpan={2}>Bagi Hasil (bukan utang)</th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className={`${th} text-right border-l border-slate-200`}>Saprodi</th><th className={`${th} text-right`}>Tenaga Kerja</th><th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right border-l border-slate-200`}>Saprodi</th><th className={`${th} text-right`}>Tenaga Kerja</th><th className={`${th} text-right`}>Total</th>
              <th className={`${th} text-right border-l border-slate-200`}>Saprodi</th><th className={`${th} text-right`}>Tenaga Kerja</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.farmer_id}-${r.plot_id}-${r.commodities_id}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-2 px-3 text-sm font-semibold text-slate-900 whitespace-nowrap">
                  {r.farmer_name}{!bound && r.entity_name && <span className="ml-1.5"><EntityTag name={r.entity_name} /></span>}
                </td>
                <td className="py-2 px-3 text-sm text-slate-700 whitespace-nowrap">
                  {r.plot_name ?? <span className="text-slate-400 italic" title="Cicilan tunai dari buku cicilan TK, tidak terkait setoran panen lahan mana pun">tanpa lahan</span>}
                  {r.plot_scheme === "ProfitSharing" && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full border bg-violet-50 text-violet-700 border-violet-200">PS</span>}
                </td>
                <td className="py-2 px-3 text-sm text-slate-600 whitespace-nowrap">{short(r.commodity_name) || "—"}</td>
                <td className={`${td} border-l border-slate-100 text-slate-700`}>{rp(r.saprodi_pf + r.other_pf)}</td>
                <td className={`${td} text-slate-700`}>{rp(r.labour_pf)}</td>
                <td className={`${td} font-semibold text-slate-900`}>{rp(r.debt_total)}</td>
                <td className={`${td} border-l border-slate-100 text-emerald-700`}>{rp(r.paid_saprodi + r.paid_other)}</td>
                <td className={`${td} text-emerald-700`}>{rp(r.paid_labour)}</td>
                <td className={`${td} font-semibold text-emerald-800`}>{rp(r.paid_total)}</td>
                <td className={`${td} border-l border-slate-100 font-bold ${r.remaining < 0 ? "text-red-600" : "text-amber-700"}`}>{rp(r.remaining)}</td>
                <td className={`${td} border-l border-slate-100 text-violet-700`}>{rp(r.saprodi_ps)}</td>
                <td className={`${td} text-violet-700`}>{rp(r.labour_ps)}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={12} className="p-10 text-center text-sm text-slate-400">Tidak ada data untuk filter ini.</td></tr>}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="py-2.5 px-3 text-sm font-bold text-slate-900" colSpan={3}>Total ({rows.length} baris)</td>
                <td className={`${td} border-l border-slate-200 font-bold`}>{rp(sum("saprodi_pf") + sum("other_pf"))}</td>
                <td className={`${td} font-bold`}>{rp(sum("labour_pf"))}</td>
                <td className={`${td} font-bold`}>{rp(sum("debt_total"))}</td>
                <td className={`${td} border-l border-slate-200 font-bold text-emerald-800`}>{rp(sum("paid_saprodi") + sum("paid_other"))}</td>
                <td className={`${td} font-bold text-emerald-800`}>{rp(sum("paid_labour"))}</td>
                <td className={`${td} font-bold text-emerald-800`}>{rp(sum("paid_total"))}</td>
                <td className={`${td} border-l border-slate-200 font-bold text-amber-700`}>{rp(sum("remaining"))}</td>
                <td className={`${td} border-l border-slate-200 font-bold text-violet-700`}>{rp(sum("saprodi_ps"))}</td>
                <td className={`${td} font-bold text-violet-700`}>{rp(sum("labour_ps"))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </Card>
    </div>
  );
}
