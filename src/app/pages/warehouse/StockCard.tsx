import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, ClipboardList, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Card } from "../../components/ui/card";
import { useApi } from "../../lib/hooks";

const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface Sapropdi { id: number; sapropdi_name: string; }
interface Warehouse { id: number; warehouse_name: string; }
interface CardRow { date: string; type: string; ref: string; qty_in: number; qty_out: number; balance: number; }

export default function StockCard() {
  const navigate = useNavigate();
  const { data: sapropdi } = useApi<Sapropdi[]>("sapropdi");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const [sapropdiId, setSapropdiId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const { data: card, loading } = useApi<CardRow[]>(
    sapropdiId ? "warehouse-stock/stock-card" : null,
    sapropdiId ? { sapropdi_id: sapropdiId, warehouse_id: warehouseId || undefined } : undefined,
    [sapropdiId, warehouseId]
  );

  const selectCls = "px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/warehouse/stock-list")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div><h1 className="text-2xl text-slate-900 mb-0.5">Kartu Stok</h1><p className="text-sm text-slate-500">Riwayat masuk/keluar & saldo berjalan per saprodi</p></div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={sapropdiId} onChange={(e) => setSapropdiId(e.target.value)} className={selectCls}>
            <option value="">Pilih Saprodi…</option>
            {(sapropdi || []).map((s) => <option key={s.id} value={s.id}>{s.sapropdi_name}</option>)}
          </select>
          <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
            <option value="">Semua Gudang (masuk)</option>
            {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
          </select>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Tanggal", "Tipe", "Referensi", "Masuk", "Keluar", "Saldo"].map((h) => <th key={h} className={`${["Masuk", "Keluar", "Saldo"].includes(h) ? "text-right" : "text-left"} py-3 px-5 text-xs font-semibold text-slate-600 uppercase tracking-wide`}>{h}</th>)}
            </tr></thead>
            <tbody>
              {(card || []).map((r, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-5 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${r.type === "Stock In" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {r.type === "Stock In" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}{r.type}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-sm font-mono text-slate-600">{r.ref}</td>
                  <td className="py-3 px-5 text-right text-sm font-mono text-emerald-700">{r.qty_in ? num(r.qty_in) : "—"}</td>
                  <td className="py-3 px-5 text-right text-sm font-mono text-amber-700">{r.qty_out ? num(r.qty_out) : "—"}</td>
                  <td className="py-3 px-5 text-right text-sm font-mono font-bold text-slate-900">{num(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!sapropdiId && <div className="p-16 text-center text-slate-400 text-sm">Pilih saprodi untuk melihat kartu stok</div>}
        {sapropdiId && loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {sapropdiId && !loading && (card || []).length === 0 && <div className="p-16 text-center"><ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada pergerakan stok</p></div>}
      </Card>
    </div>
  );
}
