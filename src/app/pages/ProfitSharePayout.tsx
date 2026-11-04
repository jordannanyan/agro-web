// Paying the profit share out — once, at the end, per plot.
//
// The per-sale settlements above only build up each plot's balances. When the
// plot's harvests are done (JNBS: 2027/2028) the share is paid from here, and
// only while the plot stands in profit: its cumulative margin above every
// profit-sharing cost. Of what is released, the farmer's remaining Pre-Finance
// debt (loans from before the plot became profit sharing) is kept back first and
// booked as a repayment; the rest goes to the farmer.

import { useEffect, useState } from "react";
import { Wallet, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const selectCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

interface Preview {
  plot_id: number; plot_name: string; farmer_name: string; date: string; payout_rule: string; pct_farmer: number | null;
  settlements: number; last_sale_date: string | null; unsettled_sales: { id: number; date: string }[];
  margin_total: number; ps_cost_total: number; position: number; farmer_share_total: number; already_paid: number;
  share_amount: number; pf_outstanding: number; pf_deduction: number;
  pf_deduction_lines: { type_name: string; outstanding: number; amount: number }[];
  paid_amount: number; blocked: string | null;
}

export default function ProfitSharePayout({ mayWrite }: { mayWrite: boolean }) {
  const { data: plots } = useApi<any[]>("profit-sharing/pl");
  const { data: payouts, refetch } = useApi<any[]>("profit-sharing/payouts");
  const [plotId, setPlotId] = useState("");
  // Local date, not UTC: in WIB the UTC date is still yesterday until 07:00.
  const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE"));
  const [notes, setNotes] = useState("");
  const [pv, setPv] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!plotId) { setPv(null); return; }
    try { setPv(await api.get<Preview>("profit-sharing/payouts/preview", { plot_id: plotId, date })); }
    catch (e: any) { toast.error(e?.message || "Gagal memuat"); }
  }
  useEffect(() => { load(); }, [plotId, date]); // eslint-disable-line react-hooks/exhaustive-deps

  async function pay() {
    if (!pv || pv.blocked) return;
    if (!confirm(`Bayarkan bagi hasil ${pv.plot_name}?\n\nBagian petani ${fmtRp(pv.share_amount)}\nDipotong utang Pre-Finance ${fmtRp(pv.pf_deduction)}\nDiterima petani ${fmtRp(pv.paid_amount)}`)) return;
    setBusy(true);
    try {
      const r = await api.postRaw("profit-sharing/payouts", { plot_id: Number(plotId), date, notes: notes || undefined });
      toast.success(r?.message || "Dibayarkan");
      setNotes(""); refetch(); load();
    } catch (e: any) { toast.error(e?.message || "Gagal"); }
    finally { setBusy(false); }
  }
  async function remove(id: number) {
    if (!confirm("Hapus pembayaran ini? Potongan utang Pre-Finance-nya ikut dibatalkan.")) return;
    try { await api.del(`profit-sharing/payouts/${id}`); toast.success("Dihapus"); refetch(); load(); }
    catch (e: any) { toast.error(e?.message || "Gagal"); }
  }

  const row = (label: string, value: React.ReactNode, cls = "text-slate-800") => (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-50 text-sm">
      <span className="text-slate-500">{label}</span><span className={`font-mono ${cls}`}>{value}</span>
    </div>
  );

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0"><Wallet className="w-4.5 h-4.5 text-sky-600" /></div>
        <div>
          <h3 className="text-slate-800 font-semibold">Bayar Bagi Hasil (akhir musim)</h3>
          <p className="text-xs text-slate-400">
            Dilakukan sekali per lahan setelah seluruh panen selesai. Hanya bisa bila lahan <b>untung</b> — margin kumulatif melampaui
            semua biaya bagi hasil (saprodi, tenaga kerja, lahan). Dari bagian petani, sisa utang <b>Pre-Finance</b> dipotong dulu
            dan dicatat sebagai cicilan; sisanya diterima petani.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl">
        <select value={plotId} onChange={(e) => setPlotId(e.target.value)} className={selectCls}>
          <option value="">Pilih lahan bagi hasil…</option>
          {(plots || []).map((p) => <option key={p.plot_id} value={p.plot_id}>{p.plot_name} · {p.farmer_name}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectCls} title="Tanggal pembayaran" />
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (opsional)" className={selectCls} />
      </div>

      {pv && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Posisi lahan {pv.plot_name}</p>
            {row("Penjualan dibagihasilkan", `${pv.settlements}${pv.last_sale_date ? ` · terakhir ${String(pv.last_sale_date).slice(0, 10)}` : ""}`)}
            {row("Margin kumulatif", fmtRp(pv.margin_total))}
            {row("Biaya bagi hasil (saprodi + TK + lahan)", `− ${fmtRp(pv.ps_cost_total)}`, "text-amber-700")}
            {row("Posisi", fmtRp(pv.position), pv.position > 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold")}
            {row(`Saldo bagian petani${pv.pct_farmer != null ? ` (${pv.pct_farmer}%)` : ""}`, fmtRp(pv.farmer_share_total))}
            {pv.already_paid > 0 && row("Sudah dibayarkan sebelumnya", `− ${fmtRp(pv.already_paid)}`)}
          </div>
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Pembayaran</p>
            {pv.blocked ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  {pv.blocked}
                  {pv.unsettled_sales.length > 0 && (
                    <div className="mt-1 text-xs">{pv.unsettled_sales.slice(0, 8).map((s) => `#${s.id} (${String(s.date).slice(0, 10)})`).join(", ")}{pv.unsettled_sales.length > 8 ? ", …" : ""}</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {row("Bagian petani yang dibayarkan", fmtRp(pv.share_amount))}
                {row(`Sisa utang Pre-Finance ${pv.farmer_name}`, fmtRp(pv.pf_outstanding), "text-slate-500")}
                {pv.pf_deduction_lines.map((l) => row(`Dipotong — ${l.type_name === "Labor" ? "Tenaga Kerja" : l.type_name}`, `− ${fmtRp(l.amount)}`, "text-sky-700"))}
                {row("Diterima petani", fmtRp(pv.paid_amount), "text-emerald-700 font-bold")}
              </>
            )}
            {mayWrite && (
              <Button className="mt-3 bg-sky-600 hover:bg-sky-700 text-white" disabled={busy || !!pv.blocked} onClick={pay}>Bayar Bagi Hasil</Button>
            )}
          </div>
        </div>
      )}

      {(payouts || []).length > 0 && (
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wide text-slate-600">
              {["Tanggal", "Lahan", "Petani", "Posisi", "Bagian Petani", "Potong Utang PF", "Diterima", "Oleh", ""].map((h) =>
                <th key={h} className={`py-2.5 px-3 font-semibold ${["Posisi", "Bagian Petani", "Potong Utang PF", "Diterima"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(payouts || []).map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-2 px-3 font-mono text-slate-600">{String(p.payout_date).slice(0, 10)}</td>
                  <td className="py-2 px-3 font-semibold text-slate-900">{p.plot_name}</td>
                  <td className="py-2 px-3 text-slate-700">{p.farmer_name}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">{fmtRp(Number(p.margin_total) - Number(p.ps_cost_total))}</td>
                  <td className="py-2 px-3 text-right font-mono">{fmtRp(p.share_amount)}</td>
                  <td className="py-2 px-3 text-right font-mono text-sky-700">{Number(p.pf_deduction) > 0 ? `− ${fmtRp(p.pf_deduction)}` : "—"}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{fmtRp(p.paid_amount)}</td>
                  <td className="py-2 px-3 text-slate-500">{p.created_by_name || "—"}</td>
                  <td className="py-2 px-3">{mayWrite && <button type="button" title="Hapus" onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
