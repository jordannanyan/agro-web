import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Boxes, Plus, Search, PackagePlus, AlertTriangle } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface InvRow { warehouse_id: number; warehouse_name: string; sapropdi_id: number; sapropdi_name: string; total_in: number; total_out: number; remaining: number; entity_name: string | null; }
interface StockInRow { id: number; stock_in_number: string; stock_in_date: string; warehouse_name: string; po_number: string | null; status: string; entity_name: string | null; }
interface Warehouse { id: number; warehouse_name: string; }

export default function StockManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const isStockIn = location.pathname.includes("/stock-in");

  const bound = useEntityBound();
  const [entityFilter, setEntityFilter] = useState("");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");

  const scoped = entityFilter ? { entity_id: entityFilter } : {};
  const { data: inv, loading: invLoading } = useApi<InvRow[]>(!isStockIn ? "warehouse-stock/inventory" : null,
    { ...(warehouseId ? { warehouse_id: warehouseId } : {}), ...scoped }, [warehouseId, isStockIn, entityFilter]);
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const {
    rows: siList, meta: siMeta, page: siPage, setPage: setSiPage,
    perPage: siPerPage, setPerPage: setSiPerPage, loading: siLoading,
  } = usePagedApi<StockInRow>(isStockIn ? "stock-in" : null, {
    ...scoped, search: search || undefined,
  }, [isStockIn, entityFilter, search]);

  const invList = (inv || []).filter((r) => search === "" || r.sapropdi_name?.toLowerCase().includes(search.toLowerCase()));


  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">{isStockIn ? "Stock In" : "Inventory Saprodi"}</h1>
          <p className="text-sm text-slate-500">{isStockIn ? "Penerimaan barang dari Purchase Order" : "Stok saprodi terhitung (Stock In − Distribusi)"}</p>
          <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
        </div>
        {mayWrite && (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate("/warehouse/stockin/create")}>
            <PackagePlus className="w-4 h-4 mr-2" />Stock In Baru
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {!isStockIn && (
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Semua Gudang</option>
              {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
            </select>
          )}
          <div className="flex-1 relative min-w-40"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder={isStockIn ? "Cari nomor SI…" : "Cari saprodi…"} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        </div>
      </Card>

      <Card>
        {!isStockIn ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {[...(bound ? [] : ["Entitas"]), "Gudang", "Saprodi", "Total Masuk", "Total Keluar", "Sisa Stok"].map((h) => <th key={h} className={`${["Total Masuk", "Total Keluar", "Sisa Stok"].includes(h) ? "text-right" : "text-left"} py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide`}>{h}</th>)}
              </tr></thead>
              <tbody>
                {invList.map((r) => (
                  <tr key={`${r.warehouse_id}-${r.sapropdi_id}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                    {!bound && <td className="py-3 px-5"><EntityTag name={r.entity_name} /></td>}
                    <td className="py-3 px-5 text-sm text-slate-600">{r.warehouse_name}</td>
                    <td className="py-3 px-5 text-sm font-semibold text-slate-900">{r.sapropdi_name}</td>
                    <td className="py-3 px-5 text-right text-sm font-mono text-emerald-700">{num(r.total_in)}</td>
                    <td className="py-3 px-5 text-right text-sm font-mono text-amber-700">{num(r.total_out)}</td>
                    <td className="py-3 px-5 text-right text-sm font-mono font-bold text-slate-900">{num(r.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invLoading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
            {!invLoading && invList.length === 0 && <div className="p-16 text-center"><Boxes className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada stok</p><p className="text-sm text-slate-400 mt-1">Stok muncul setelah ada Stock In</p></div>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Nomor SI", "Tanggal", ...(bound ? [] : ["Entitas"]), "Gudang", "PO", "Status"].map((h) => <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody>
                {siList.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-5 text-sm font-mono font-semibold text-emerald-700">{r.stock_in_number}</td>
                    <td className="py-3 px-5 text-sm text-slate-600">{r.stock_in_date}</td>
                    {!bound && <td className="py-3 px-5"><EntityTag name={r.entity_name} /></td>}
                    <td className="py-3 px-5 text-sm text-slate-700">{r.warehouse_name}</td>
                    <td className="py-3 px-5 text-sm font-mono text-blue-600">{r.po_number || "—"}</td>
                    <td className="py-3 px-5"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={siMeta} page={siPage} onPage={setSiPage} perPage={siPerPage} onPerPage={setSiPerPage} />
            {siLoading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
            {!siLoading && siList.length === 0 && <div className="p-16 text-center"><AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada Stock In</p></div>}
          </div>
        )}
      </Card>
    </div>
  );
}
