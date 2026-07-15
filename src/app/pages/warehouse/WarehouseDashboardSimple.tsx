import { useNavigate } from "react-router";
import { Boxes, PackagePlus, AlertTriangle, Warehouse, ArrowRight, TrendingDown } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

export default function WarehouseDashboardSimple() {
  const navigate = useNavigate();
  const { data: inv } = useApi<any[]>("warehouse-stock/inventory");
  const { data: reorder } = useApi<any[]>("warehouse-stock/reorder");
  const { data: stockIns } = useApi<any[]>("stock-in");
  const { data: warehouses } = useApi<any[]>("warehouses");

  const invRows = inv || [];
  const lowRows = (reorder || []).filter((r) => r.status === "Low" || r.status === "Critical");
  const criticalCount = (reorder || []).filter((r) => r.status === "Critical").length;
  const totalRemaining = invRows.reduce((s, r) => s + Number(r.remaining || 0), 0);

  const kpis = [
    { label: "Total Gudang", value: (warehouses || []).length, icon: Warehouse, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Item Saprodi Terpantau", value: invRows.length, icon: Boxes, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Stok Perlu Reorder", value: lowRows.length, icon: AlertTriangle, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Dokumen Stock In", value: (stockIns || []).length, icon: PackagePlus, color: "text-violet-700", bg: "bg-violet-50" },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Dashboard Gudang</h1><p className="text-sm text-slate-500">Ringkasan stok saprodi terhitung & aktivitas gudang</p></div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/warehouse/stockin/create")}><PackagePlus className="w-4 h-4 mr-2" />Stock In Baru</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center mb-3`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{num(k.value)}</p>
            <p className="text-sm text-slate-500">{k.label}</p>
            {k.label === "Stok Perlu Reorder" && criticalCount > 0 && <p className="text-xs text-red-600 mt-1 font-medium">{criticalCount} kritis</p>}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-slate-900 font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Perlu Reorder</h2>
            <button onClick={() => navigate("/warehouse/reorder")} className="text-xs text-emerald-600 font-semibold flex items-center gap-1">Lihat semua <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-slate-50">
            {lowRows.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-2 h-2 rounded-full ${r.status === "Critical" ? "bg-red-500" : "bg-amber-500"}`} />
                <div className="flex-1"><p className="text-sm font-medium text-slate-800">{r.sapropdi_name}</p><p className="text-xs text-slate-400">{r.warehouse_name}</p></div>
                <div className="text-right"><p className="text-sm font-mono text-slate-700">{num(r.current_stock)} / {num(r.min_stock)}</p><p className="text-xs text-slate-400">stok / min</p></div>
              </div>
            ))}
            {lowRows.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Semua stok aman 🎉</div>}
          </div>
        </Card>

        <Card className="p-0">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-slate-900 font-semibold flex items-center gap-2"><TrendingDown className="w-4 h-4 text-emerald-500" />Stok Terkini</h2>
            <button onClick={() => navigate("/warehouse/stock-list")} className="text-xs text-emerald-600 font-semibold flex items-center gap-1">Inventory <ArrowRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-slate-50 max-h-[320px] overflow-y-auto">
            {invRows.slice(0, 8).map((r) => (
              <div key={`${r.warehouse_id}-${r.sapropdi_id}`} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1"><p className="text-sm font-medium text-slate-800">{r.sapropdi_name}</p><p className="text-xs text-slate-400">{r.warehouse_name}</p></div>
                <p className="text-sm font-mono font-semibold text-slate-900">{num(r.remaining)}</p>
              </div>
            ))}
            {invRows.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Belum ada stok. Total sisa: {num(totalRemaining)}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
