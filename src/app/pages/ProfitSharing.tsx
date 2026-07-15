import { useLocation } from "react-router";
import { TrendingUp } from "lucide-react";
import { Card } from "../components/ui/card";
import { MasterCrud, FieldDef } from "../components/MasterCrud";
import { useApi } from "../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");
const opt = (rows: any[] | null, v: string, l: string) => (rows || []).map((r) => ({ value: r[v], label: r[l] }));

type TabId = "investment" | "revenue" | "pl" | "ps";
const PATH_TO_TAB: Record<string, TabId> = {
  "/profit-sharing": "investment", "/profit-sharing/investment": "investment",
  "/profit-sharing/revenue": "revenue", "/profit-sharing/pl": "pl", "/profit-sharing/ps": "ps",
};

function RevenueTab() {
  const { data, loading } = useApi<any[]>("profit-sharing/revenue");
  return (
    <Card className="p-0">
      <div className="p-5 border-b border-slate-100"><h3 className="text-slate-800 font-semibold">Revenue (Scheme: Profit Sharing)</h3><p className="text-xs text-slate-400">Penjualan dari batch yang mengandung plot Profit Sharing</p></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Tanggal", "Periode", "Petani", "Plot", "Customer", "Qty (Kg)", "Harga/Kg", "Revenue"].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-3 px-4 text-sm text-slate-600">{r.date}</td>
                <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.period}</td>
                <td className="py-3 px-4 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{r.plot_name}</td>
                <td className="py-3 px-4 text-sm text-slate-600">{r.customer || "—"}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{num(r.qty)}</td>
                <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(r.price_per_unit)}</td>
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

function PLTab() {
  const { data, loading } = useApi<any[]>("profit-sharing/pl");
  return (
    <Card className="p-0">
      <div className="p-5 border-b border-slate-100"><h3 className="text-slate-800 font-semibold">Profit & Loss</h3><p className="text-xs text-slate-400">Revenue − Investasi Operasional per periode/petani</p></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Periode", "Petani", "Revenue", "Investasi", "Net Profit"].map((h) => <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((r, i) => {
              const np = Number(r.net_profit || 0);
              return (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm font-mono text-slate-500">{r.period}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-emerald-700">{fmtRp(r.total_revenue)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-amber-700">{fmtRp(r.total_investment)}</td>
                  <td className={`py-3 px-4 text-right text-sm font-mono font-bold ${np >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fmtRp(np)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && (data || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada data P/L</div>}
    </Card>
  );
}

export default function ProfitSharing() {
  const location = useLocation();
  const activeTab: TabId = PATH_TO_TAB[location.pathname] ?? "investment";

  const { data: farmers } = useApi<any[]>("farmers");
  const { data: plots } = useApi<any[]>("plots", { scheme: "ProfitSharing" });
  const { data: types } = useApi<any[]>("pre-finance-types");
  const { data: commodities } = useApi<any[]>("commodities");

  const farmerOpts = opt(farmers, "id", "farmer_name");
  const plotOpts = opt(plots, "id", "plot_name");
  const typeOpts = opt(types, "id", "type_name");
  const commodityOpts = opt(commodities, "id", "commodities_name");

  const investmentFields: FieldDef[] = [
    { name: "period", label: "Periode (YYYY-MM)", required: true, placeholder: "2026-05" },
    { name: "farmer_id", label: "Petani", type: "select", options: farmerOpts, required: true },
    { name: "plot_id", label: "Plot", type: "select", options: plotOpts },
    { name: "pre_finance_type_id", label: "Tipe Biaya", type: "select", options: typeOpts },
    { name: "amount", label: "Nominal", type: "number", required: true, cell: (r) => fmtRp(r.amount) },
    { name: "description", label: "Keterangan", type: "textarea", hideInTable: true },
  ];
  const shareFields: FieldDef[] = [
    { name: "period", label: "Periode", required: true, placeholder: "2026-05" },
    { name: "farmer_id", label: "Petani", type: "select", options: farmerOpts, required: true },
    { name: "plot_id", label: "Plot", type: "select", options: plotOpts },
    { name: "commodities_id", label: "Komoditas", type: "select", options: commodityOpts, hideInTable: true },
    { name: "total_revenue", label: "Revenue", type: "number", cell: (r) => fmtRp(r.total_revenue) },
    { name: "total_investment", label: "Investasi", type: "number", cell: (r) => fmtRp(r.total_investment) },
    { name: "pct_farmer", label: "% Petani", type: "number" },
    { name: "pct_company", label: "% Perusahaan", type: "number", hideInTable: true },
    { name: "value_farmer", label: "Nilai Petani", type: "number", cell: (r) => fmtRp(r.value_farmer) },
    { name: "value_company", label: "Nilai Perusahaan", type: "number", cell: (r) => fmtRp(r.value_company) },
    { name: "status", label: "Status", hideInTable: true },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
        <div><h1 className="text-2xl text-slate-900">Profit Sharing</h1><p className="text-sm text-slate-500">Investasi operasional → penjualan → bagi hasil petani & perusahaan</p></div>
      </div>

      {activeTab === "investment" && <Card className="p-6"><MasterCrud endpoint="profit-sharing/investments" title="Investasi Operasional" fields={investmentFields} emptyText="Belum ada investasi" /></Card>}
      {activeTab === "revenue" && <RevenueTab />}
      {activeTab === "pl" && <PLTab />}
      {activeTab === "ps" && <Card className="p-6"><MasterCrud endpoint="profit-sharing/shares" title="Bagi Hasil (Split)" fields={shareFields} emptyText="Belum ada perhitungan bagi hasil" /></Card>}
    </div>
  );
}
