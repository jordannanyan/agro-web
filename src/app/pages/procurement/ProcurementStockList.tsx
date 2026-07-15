import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Package, Search, AlertTriangle, Plus } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

export default function ProcurementStockList() {
  const navigate = useNavigate();
  const { data: inv, loading } = useApi<any[]>("warehouse-stock/inventory");
  const { data: reorder } = useApi<any[]>("warehouse-stock/reorder");
  const [search, setSearch] = useState("");

  // Map min stock per warehouse+sapropdi for status badge.
  const minMap = useMemo(() => {
    const m: Record<string, number> = {};
    (reorder || []).forEach((r) => { m[`${r.warehouse_id}-${r.sapropdi_id}`] = Number(r.min_stock || 0); });
    return m;
  }, [reorder]);

  const rows = (inv || []).filter((r) => search === "" || r.sapropdi_name?.toLowerCase().includes(search.toLowerCase()));
  const lowCount = rows.filter((r) => { const min = minMap[`${r.warehouse_id}-${r.sapropdi_id}`]; return min && Number(r.remaining) < min; }).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Stok Saprodi (Procurement)</h1><p className="text-sm text-slate-500">Posisi stok saprodi sebagai acuan pengajuan pembelian</p></div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/procurement/pr/create")}><Plus className="w-4 h-4 mr-2" />Buat PR</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Item Terpantau</p><p className="text-2xl font-bold text-slate-900">{rows.length}</p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">Di Bawah Minimum</p><p className="text-2xl font-bold text-amber-700">{lowCount}</p></Card>
      </div>

      <Card className="p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari saprodi…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">{["Saprodi", "Gudang", "Masuk", "Keluar", "Sisa", "Status"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => {
                const min = minMap[`${r.warehouse_id}-${r.sapropdi_id}`];
                const low = min && Number(r.remaining) < min;
                return (
                  <tr key={`${r.warehouse_id}-${r.sapropdi_id}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-5 text-sm font-semibold text-slate-900">{r.sapropdi_name}</td>
                    <td className="py-3 px-5 text-sm text-slate-600">{r.warehouse_name}</td>
                    <td className="py-3 px-5 text-right text-sm font-mono text-emerald-700">{num(r.total_in)}</td>
                    <td className="py-3 px-5 text-right text-sm font-mono text-amber-700">{num(r.total_out)}</td>
                    <td className="py-3 px-5 text-right text-sm font-mono font-bold text-slate-900">{num(r.remaining)}</td>
                    <td className="py-3 px-5">
                      {low ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3 h-3" />Di bawah min</span>
                        : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Aman</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {!loading && rows.length === 0 && <div className="p-16 text-center"><Package className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada stok saprodi</p></div>}
      </Card>
    </div>
  );
}
