import { useState } from "react";
import { FileBarChart } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID");
const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

function InventoryReport() {
  const { data, loading } = useApi<any[]>("warehouse-stock/inventory");
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Gudang", "Saprodi", "Masuk", "Keluar", "Sisa"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((r) => (
              <tr key={`${r.warehouse_id}-${r.sapropdi_id}`} className="border-b border-slate-50">
                <td className="py-3 px-5 text-sm text-slate-600">{r.warehouse_name}</td>
                <td className="py-3 px-5 text-sm font-semibold text-slate-900">{r.sapropdi_name}</td>
                <td className="py-3 px-5 text-right text-sm font-mono text-emerald-700">{num(r.total_in)}</td>
                <td className="py-3 px-5 text-right text-sm font-mono text-amber-700">{num(r.total_out)}</td>
                <td className="py-3 px-5 text-right text-sm font-mono font-bold text-slate-900">{num(r.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && (data || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada stok</div>}
    </Card>
  );
}

function StockInReport() {
  const { data, loading } = useApi<any[]>("stock-in");
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Nomor SI", "Tanggal", "Gudang", "PO", "Status"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {(data || []).map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="py-3 px-5 text-sm font-mono font-semibold text-emerald-700">{r.stock_in_number}</td>
                <td className="py-3 px-5 text-sm text-slate-600">{r.stock_in_date}</td>
                <td className="py-3 px-5 text-sm text-slate-700">{r.warehouse_name}</td>
                <td className="py-3 px-5 text-sm font-mono text-blue-600">{r.po_number || "—"}</td>
                <td className="py-3 px-5 text-sm"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && (data || []).length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada Stock In</div>}
    </Card>
  );
}

function DistributionReport() {
  const { data, loading } = useApi<any[]>("pre-finance/distributions");
  const saprodiOnly = (data || []).filter((r) => r.sapropdi_name);
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-slate-50 border-b border-slate-100">{["Tanggal", "Petani", "Saprodi", "Qty", "Nilai", "Kirim"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
          <tbody>
            {saprodiOnly.map((r) => (
              <tr key={r.id} className="border-b border-slate-50">
                <td className="py-3 px-5 text-sm text-slate-600">{r.date}</td>
                <td className="py-3 px-5 text-sm font-semibold text-slate-900">{r.farmer_name}</td>
                <td className="py-3 px-5 text-sm text-slate-700">{r.sapropdi_name}</td>
                <td className="py-3 px-5 text-right text-sm font-mono text-slate-700">{r.quantity != null ? num(r.quantity) : "—"}</td>
                <td className="py-3 px-5 text-right text-sm font-mono text-amber-700">{fmtRp(r.total_amount)}</td>
                <td className="py-3 px-5 text-sm">{r.shipped_at ? <span className="text-emerald-600 text-xs font-semibold">Terkirim</span> : <span className="text-slate-400 text-xs">Belum</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <div className="p-12 text-center text-slate-400 text-sm">Memuat…</div>}
      {!loading && saprodiOnly.length === 0 && <div className="p-12 text-center text-slate-400 text-sm">Belum ada distribusi saprodi</div>}
    </Card>
  );
}

export default function WarehouseReports() {
  const [tab, setTab] = useState<"inventory" | "in" | "out">("inventory");
  const tabs: { id: typeof tab; label: string }[] = [
    { id: "inventory", label: "Stok (Inventory)" },
    { id: "in", label: "Penerimaan (Stock In)" },
    { id: "out", label: "Pengeluaran (Distribusi)" },
  ];
  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><FileBarChart className="w-5 h-5 text-emerald-600" /></div>
        <div><h1 className="text-2xl text-slate-900">Laporan Gudang</h1><p className="text-sm text-slate-500">Stok, penerimaan, dan pengeluaran saprodi</p></div>
      </div>
      <div className="border-b border-slate-200">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t.label}</button>
          ))}
        </div>
      </div>
      {tab === "inventory" && <InventoryReport />}
      {tab === "in" && <StockInReport />}
      {tab === "out" && <DistributionReport />}
    </div>
  );
}
