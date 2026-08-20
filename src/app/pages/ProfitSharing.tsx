import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { TrendingUp, PackageMinus, Calculator, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { MasterCrud, FieldDef } from "../components/MasterCrud";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });
const pct = (n: number) => `${Number(n || 0).toFixed(2)}%`;
const opt = (rows: any[] | null, v: string, l: string) => (rows || []).map((r) => ({ value: r[v], label: r[l] }));

type TabId = "investment" | "revenue" | "pl" | "ps";
const PATH_TO_TAB: Record<string, TabId> = {
  "/profit-sharing": "investment", "/profit-sharing/investment": "investment",
  "/profit-sharing/revenue": "revenue", "/profit-sharing/pl": "pl", "/profit-sharing/ps": "ps",
};

const th = (right: boolean) =>
  `${right ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`;

// -----------------------------------------------------------------------------
// Revenue — a plot's SHARE of each sale, not the whole of it.
//
// A sale is of a processing batch, and a batch is fed by several plots. The page
// used to print the full value of the sale on every plot's row, so a batch with
// seven depositors showed its value seven times over.
// -----------------------------------------------------------------------------
function RevenueTab() {
  const { data, loading } = useApi<any[]>("profit-sharing/revenue");
  const total = (data || []).reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  return (
    <Card className="p-0">
      <div className="p-5 border-b border-slate-100 flex items-start justify-between">
        <div>
          <h3 className="text-slate-800 font-semibold">Revenue (Scheme: Profit Sharing)</h3>
          <p className="text-xs text-slate-400">Porsi tiap lahan atas penjualan batch — dibagi menurut kg yang disetor</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Porsi</p>
          <p className="text-lg font-bold font-mono text-emerald-700">{fmtRp(total)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">
            {["Tanggal", "Periode", "Petani", "Plot", "Customer", "Kg Setor", "Porsi", "Harga/Kg", "Nilai Jual", "Bagian Lahan"].map((h) =>
              <th key={h} className={th(["Kg Setor", "Porsi", "Harga/Kg", "Nilai Jual", "Bagian Lahan"].includes(h))}>{h}</th>)}
          </tr></thead>
          <tbody>
            {(data || []).map((r, i) => (
              <tr key={`${r.id}-${r.plot_id}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{String(r.date).slice(0, 10)}</td>
                <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.period}</td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{r.plot_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{r.customer || "—"}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{num(r.qty)}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-blue-700">{pct(r.share_pct)}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(r.price_per_unit)}</td>
                {/* The whole sale, shown muted so the share can be read against it. */}
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-400">{fmtRp(r.sale_revenue)}</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-emerald-700">{fmtRp(r.total_revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && (data || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada revenue Profit Sharing</div>}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// P/L — the standing position of every Profit Sharing plot.
//
// Per plot, not per farmer: the scheme belongs to the plot, and a farmer may hold
// plots under two schemes at once. Plots that have not sold yet stay on the list
// with revenue 0 — cost without income is exactly what needs looking at.
// -----------------------------------------------------------------------------
function PLTab() {
  const { data, loading } = useApi<any[]>("profit-sharing/pl");
  const rows = data || [];
  const sum = (k: string) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const negatives = rows.filter((r) => Number(r.net_profit || 0) < 0).length;

  return (
    <div className="space-y-4">
      {negatives > 0 && (
        <Card className="p-4 border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">{negatives} dari {rows.length} lahan masih rugi.</p>
              <p className="text-amber-700 mt-0.5">
                Biaya yang belum tertutup dibawa ke penjualan berikutnya dari lahan yang sama.
                Selama lahan masih minus, bagian petani nol dan selisihnya ditanggung perusahaan.
              </p>
            </div>
          </div>
        </Card>
      )}
      <Card className="p-0">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-slate-800 font-semibold">Profit &amp; Loss per Lahan</h3>
          <p className="text-xs text-slate-400">Bagian penjualan − biaya olah − biaya jual − saprodi − biaya lahan</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Plot", "Petani", "Kg Terjual", "Bagian Jual", "B. Olah", "B. Jual", "Saprodi", "B. Lahan", "Total Biaya", "Net", "Dibayar ke Petani"].map((h) =>
                <th key={h} className={th(h !== "Plot" && h !== "Petani")}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => {
                const np = Number(r.net_profit || 0);
                return (
                  <tr key={r.plot_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">{r.plot_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{r.farmer_name}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{num(r.volume_sold)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-emerald-700">{fmtRp(r.total_revenue)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(r.cost_processing)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(r.cost_selling)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(r.cost_saprodi)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(r.cost_land)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-amber-700">{fmtRp(r.total_investment)}</td>
                    <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${np >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtRp(np)}</td>
                    <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(r.settled_farmer)}</td>
                  </tr>
                );
              })}
            </tbody>
            {rows.length > 0 && (
              <tfoot><tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="py-3 px-4 text-sm font-bold text-slate-800" colSpan={2}>Total</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-bold text-slate-700">{num(sum("volume_sold"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-bold text-emerald-700">{fmtRp(sum("total_revenue"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(sum("cost_processing"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(sum("cost_selling"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(sum("cost_saprodi"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(sum("cost_land"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-bold text-amber-700">{fmtRp(sum("total_investment"))}</td>
                <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${sum("net_profit") >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtRp(sum("net_profit"))}</td>
                <td className="py-3 px-4 text-right text-sm font-mono font-bold text-slate-800">{fmtRp(sum("settled_farmer"))}</td>
              </tr></tfoot>
            )}
          </table>
        </div>
        {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
        {!loading && rows.length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada lahan Profit Sharing</div>}
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Bagi Hasil — computed from a sale, not typed in.
//
// This tab used to be a plain data-entry form: revenue, investment, both
// percentages and both values were all keyed by hand, with nothing checking them
// against the sale they were supposed to describe.
// -----------------------------------------------------------------------------
function ShareTab() {
  const { data: sellings } = useApi<any[]>("selling");
  const { data: shares, refetch } = useApi<any[]>("profit-sharing/shares");
  const [sellingId, setSellingId] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  async function load(id: string) {
    setSellingId(id);
    setPreview(null);
    if (!id) return;
    setBusy(true);
    try { setPreview(await api.get(`profit-sharing/settlement/${id}`)); }
    catch (e: any) { toast.error(e?.message || "Gagal menghitung"); }
    finally { setBusy(false); }
  }

  async function settle() {
    setBusy(true);
    try {
      const r = await api.postRaw("profit-sharing/settle", { selling_id: Number(sellingId) });
      toast.success(r?.message || "Bagi hasil tersimpan");
      await load(sellingId);
      refetch();
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setBusy(false); }
  }

  const lines: any[] = preview?.lines || [];
  const totalFarmer = lines.reduce((s, l) => s + Number(l.value_farmer || 0), 0);
  const totalCompany = lines.reduce((s, l) => s + Number(l.value_company || 0), 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Calculator className="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-slate-800 font-semibold">Hitung Bagi Hasil</h3>
            <p className="text-xs text-slate-400">
              Pilih penjualan — sistem membagi hasilnya ke tiap lahan menurut kg yang disetor, lalu mengurangi biaya.
            </p>
          </div>
        </div>

        <div className="max-w-xl">
          <select value={sellingId} onChange={(e) => load(e.target.value)} className={selectCls}>
            <option value="">Pilih penjualan…</option>
            {(sellings || []).map((s) => (
              <option key={s.id} value={s.id}>
                {String(s.date).slice(0, 10)} · {s.processing?.processing_code ?? `#${s.id}`} · {s.offtaker?.offtaker_name ?? "—"} · {fmtRp(s.total_revenue)}
              </option>
            ))}
          </select>
        </div>

        {busy && <p className="text-sm text-slate-400">Menghitung…</p>}

        {preview && lines.length === 0 && (
          <p className="text-sm text-slate-500">Batch penjualan ini tidak memuat lahan Profit Sharing.</p>
        )}

        {preview && lines.length > 0 && (
          <>
            {preview.pct_farmer == null && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50/60">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Persentase bagi hasil belum diatur untuk entitas ini. Isi <strong>% Petani</strong> di
                  Settings → Entitas, atau pada penjualannya, sebelum bagi hasil bisa disimpan.
                </p>
              </div>
            )}
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full">
                <thead><tr className="bg-slate-50 border-b border-slate-100">
                  {["Plot", "Petani", "Kg", "Porsi", "Bagian Jual", "B. Olah", "B. Jual", "Saprodi", "B. Lahan", "Bawaan", "Laba", "Petani", "Perusahaan"].map((h) =>
                    <th key={h} className={th(h !== "Plot" && h !== "Petani")}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.plot_id} className="border-b border-slate-50">
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900">{l.plot_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{l.farmer_name}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{num(l.volume_share)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-blue-700">{pct(l.share_pct)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-emerald-700">{fmtRp(l.total_revenue)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(l.cost_processing)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(l.cost_selling)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(l.cost_saprodi)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-500">{fmtRp(l.cost_land)}</td>
                      <td className={`py-3 px-4 text-right text-sm font-mono ${Number(l.carry_in) < 0 ? "text-red-500" : "text-slate-400"}`}>{Number(l.carry_in) ? fmtRp(l.carry_in) : "—"}</td>
                      <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${Number(l.net_profit) >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtRp(l.net_profit)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-slate-900">{fmtRp(l.value_farmer)}</td>
                      <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(l.value_company)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Saprodi and land cost are standing balances per plot, so a settlement
                only charges what earlier settlements have not already taken. */}
            <p className="text-xs text-slate-400">
              <strong>Saprodi</strong> dan <strong>B. Lahan</strong> adalah sisa yang belum pernah dibebankan pada
              bagi hasil sebelumnya untuk lahan itu. <strong>Bawaan</strong> adalah kekurangan dari bagi hasil
              sebelumnya yang ikut terbawa ke sini — selama masih minus, bagian petani nol.
            </p>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-3">
                <div className="px-4 py-2 rounded-lg bg-slate-900 text-white">
                  <span className="text-xs opacity-70 block">Petani {preview.pct_farmer != null ? `(${pct(preview.pct_farmer)})` : ""}</span>
                  <span className="font-mono font-bold">{fmtRp(totalFarmer)}</span>
                </div>
                <div className="px-4 py-2 rounded-lg bg-slate-100">
                  <span className="text-xs text-slate-500 block">Perusahaan</span>
                  <span className={`font-mono font-bold ${totalCompany >= 0 ? "text-slate-800" : "text-red-600"}`}>{fmtRp(totalCompany)}</span>
                </div>
              </div>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={busy || preview.settled || preview.pct_farmer == null}
                onClick={settle}
              >
                {preview.settled ? "Sudah dibagihasilkan" : "Simpan Bagi Hasil"}
              </Button>
            </div>
          </>
        )}
      </Card>

      <Card className="p-0">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-slate-800 font-semibold">Catatan Bagi Hasil</h3>
          <p className="text-xs text-slate-400">Rekaman tetap — angkanya tidak ikut berubah bila persentase atau biaya diubah kemudian</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Periode", "Penjualan", "Plot", "Bagian Jual", "Total Biaya", "Bawaan", "Laba", "% Petani", "Petani", "Perusahaan", "Status"].map((h) =>
                <th key={h} className={th(["Bagian Jual", "Total Biaya", "Bawaan", "Laba", "% Petani", "Petani", "Perusahaan"].includes(h))}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(shares || []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.period}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.selling_id ? `#${r.selling_id}` : "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.plot_id ?? "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-emerald-700">{fmtRp(r.total_revenue)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-amber-700">{fmtRp(r.total_investment)}</td>
                  <td className={`py-3 px-4 text-right text-sm font-mono ${Number(r.carry_in) < 0 ? "text-red-500" : "text-slate-400"}`}>{Number(r.carry_in) ? fmtRp(r.carry_in) : "—"}</td>
                  <td className={`py-3 px-4 text-right text-sm font-mono font-semibold ${Number(r.net_profit) >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtRp(r.net_profit)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{pct(r.pct_farmer)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-slate-900">{fmtRp(r.value_farmer)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(r.value_company)}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(shares || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada perhitungan bagi hasil</div>}
      </Card>
    </div>
  );
}

export default function ProfitSharing() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab: TabId = PATH_TO_TAB[location.pathname] ?? "investment";

  const { data: farmers } = useApi<any[]>("farmers");
  const { data: plots } = useApi<any[]>("plots", { scheme: "ProfitSharing" });
  const { data: types } = useApi<any[]>("pre-finance-types");

  const farmerOpts = opt(farmers, "id", "farmer_name");
  const plotOpts = opt(plots, "id", "plot_name");
  const typeOpts = opt(types, "id", "type_name");

  const investmentFields: FieldDef[] = [
    { name: "period", label: "Periode (YYYY-MM)", required: true, placeholder: "2026-05" },
    { name: "farmer_id", label: "Petani", type: "select", options: farmerOpts, required: true },
    { name: "plot_id", label: "Plot", type: "select", options: plotOpts },
    { name: "pre_finance_type_id", label: "Tipe Biaya", type: "select", options: typeOpts },
    { name: "amount", label: "Nominal", type: "number", required: true, cell: (r) => fmtRp(r.amount) },
    { name: "description", label: "Keterangan", type: "textarea", hideInTable: true },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
        <div><h1 className="text-2xl text-slate-900">Profit Sharing</h1><p className="text-sm text-slate-500">Investasi operasional → penjualan → bagi hasil petani &amp; perusahaan</p></div>
      </div>

      {activeTab === "investment" && (
        <>
          {/* Saprodi is stock, and stock leaves through the warehouse. Recording it
              here as a bare amount is what used to let goods reach a farmer without
              ever being deducted from a warehouse. */}
          <Card className="p-4 border-orange-200 bg-orange-50/60">
            <div className="flex items-start gap-3">
              <PackageMinus className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-orange-800">Saprodi dicatat lewat Stock Out, bukan di sini.</p>
                <p className="text-orange-700 mt-0.5">
                  Barang yang keluar gudang harus mengurangi stok, dan itu hanya terjadi lewat Stock Out —
                  yang juga otomatis terhitung sebagai investasi di laporan P/L. Form di bawah untuk biaya
                  operasional non-barang saja (tenaga kerja, transport, sewa).
                </p>
                <button onClick={() => navigate("/warehouse/stock-out/create")}
                  className="mt-2 text-sm font-semibold text-orange-800 underline underline-offset-2 hover:text-orange-900">
                  Buka Stock Out →
                </button>
              </div>
            </div>
          </Card>
          <Card className="p-6"><MasterCrud endpoint="profit-sharing/investments" title="Investasi Operasional (non-barang)" fields={investmentFields} emptyText="Belum ada investasi" /></Card>
        </>
      )}
      {activeTab === "revenue" && <RevenueTab />}
      {activeTab === "pl" && <PLTab />}
      {activeTab === "ps" && <ShareTab />}
    </div>
  );
}
