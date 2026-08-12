import { useState } from "react";
import { useNavigate } from "react-router";
import { PackageMinus, Plus, Search } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { EntityScopeBar, EntityTag, useEntityBound } from "../../components/EntityScope";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface Warehouse { id: number; warehouse_name: string; }
interface Row {
  id: number; stock_out_number: string; stock_out_date: string;
  warehouse_name: string | null; issued_by_name: string | null;
  entity_id: number | null; entity_name: string | null;
  line_count: number; total_qty: number; total_amount: number; notes: string | null;
}

export default function StockOutList() {
  const navigate = useNavigate();
  const [warehouseId, setWarehouseId] = useState("");
  const [search, setSearch] = useState("");
  const bound = useEntityBound();
  const [entityFilter, setEntityFilter] = useState("");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses", entityFilter ? { entity_id: entityFilter } : undefined, [entityFilter]);
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const {
    rows: list, meta, page, setPage, perPage, setPerPage, loading, error,
  } = usePagedApi<Row>("stock-out", {
    warehouse_id: warehouseId || undefined,
    entity_id: entityFilter || undefined,
    search: search || undefined,
  }, [warehouseId, entityFilter, search]);

  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Stock Out</h1>
          <p className="text-sm text-slate-500">
            Barang keluar dari gudang ke petani — menggantikan Distribusi (Pre-Finance) dan Operational Investment (Profit Sharing).
          </p>
          <EntityScopeBar className="mt-2" value={entityFilter} onChange={setEntityFilter} />
        </div>
        {mayWrite && (
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => navigate("/warehouse/stock-out/create")}>
            <Plus className="w-4 h-4 mr-2" />Buat Stock Out
          </Button>
        )}
      </div>

      <Card>
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Semua gudang</option>
            {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari nomor…" className="pl-9 w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {loading && <p className="p-6 text-sm text-slate-400">Memuat…</p>}
        {error && <p className="p-6 text-sm text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-100">
                {["Nomor", "Tanggal", ...(bound ? [] : ["Entitas"]), "Gudang", "Baris", "Total Qty", "Nilai", "Petugas"].map((h) => <th key={h} className={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onClick={() => navigate(`/warehouse/stock-out/${r.id}`)}>
                    <td className="py-3 px-4 text-sm font-mono font-semibold text-orange-700 whitespace-nowrap">
                      {r.stock_out_number}
                      {/* SOH- numbers were rebuilt from distributions that predate this
                          screen: nobody issued or signed them, and the grouping is
                          inferred from warehouse + date. Say so rather than let them
                          pass as real documents. */}
                      {r.stock_out_number?.startsWith("SOH-") && (
                        <span title="Dibentuk otomatis dari distribusi lama — dikelompokkan per gudang & tanggal, bukan dokumen asli"
                          className="ml-2 px-1.5 py-0.5 rounded text-xs font-semibold border bg-slate-100 text-slate-500 border-slate-200">
                          rekonstruksi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.stock_out_date}</td>
                    {!bound && <td className="py-3 px-4"><EntityTag name={r.entity_name} /></td>}
                    <td className="py-3 px-4 text-sm text-slate-600">{r.warehouse_name || "—"}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{r.line_count}</td>
                    <td className="py-3 px-4 text-sm font-mono text-slate-700">{num(r.total_qty)}</td>
                    <td className="py-3 px-4 text-sm font-mono font-semibold text-amber-700">{fmtRp(r.total_amount)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{r.issued_by_name || "—"}</td>
                  </tr>
                ))}
                {!list.length && (
                  <tr><td colSpan={bound ? 7 : 8} className="py-10 text-center">
                    <PackageMinus className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Belum ada stock out.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} page={page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} />
      </Card>
    </div>
  );
}
