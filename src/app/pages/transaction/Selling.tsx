import { useState } from "react";
import { TrendingUp, Plus, Search, Trash2, Pencil, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");

interface ProcessingLite { id: number; processing_code: string; volume_output: number; commodity?: { commodities_name: string } | null; }
interface Offtaker { id: number; offtaker_name: string; }
interface Warehouse { id: number; warehouse_name: string; }
interface SellingRow {
  id: number; date: string; delivered_volume: number; accepted_volume: number; rejected_volume: number;
  price_per_unit: number; total_revenue: number;
  processing?: { id: number; processing_code: string } | null; offtaker?: { id: number; offtaker_name: string } | null;
  warehouse?: { id: number; warehouse_name: string } | null; commodity?: { commodities_name: string } | null;
}

function SellingModal({ onClose, onSaved, processings, offtakers, warehouses, editRow }: {
  onClose: () => void; onSaved: () => void; processings: ProcessingLite[]; offtakers: Offtaker[]; warehouses: Warehouse[]; editRow?: SellingRow | null;
}) {
  const isEdit = !!editRow;
  const [processingId, setProcessingId] = useState(editRow?.processing?.id ? String(editRow.processing.id) : "");
  const [offtakerId, setOfftakerId] = useState(editRow?.offtaker?.id ? String(editRow.offtaker.id) : "");
  const [warehouseId, setWarehouseId] = useState(editRow?.warehouse?.id ? String(editRow.warehouse.id) : "");
  const [date, setDate] = useState(editRow?.date ? String(editRow.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [delivered, setDelivered] = useState(editRow?.delivered_volume != null ? String(editRow.delivered_volume) : "");
  const [accepted, setAccepted] = useState(editRow?.accepted_volume != null ? String(editRow.accepted_volume) : "");
  const [price, setPrice] = useState(editRow?.price_per_unit != null ? String(editRow.price_per_unit) : "");
  const [saving, setSaving] = useState(false);

  const rejected = Math.max((parseFloat(delivered) || 0) - (parseFloat(accepted) || 0), 0);
  const revenue = (parseFloat(accepted) || 0) * (parseFloat(price) || 0);
  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  async function save() {
    if (!processingId || !date) { toast.error("Batch processing & tanggal wajib"); return; }
    setSaving(true);
    try {
      const body = {
        processing_id: Number(processingId), offtaker_id: offtakerId ? Number(offtakerId) : null,
        warehouse_id: warehouseId ? Number(warehouseId) : null, date,
        delivered_volume: Number(delivered) || 0, accepted_volume: Number(accepted) || 0, price_per_unit: Number(price) || 0,
      };
      if (isEdit) await api.put(`selling/${editRow!.id}`, body);
      else await api.post("selling", body);
      toast.success(isEdit ? "Penjualan diperbarui" : "Penjualan tercatat"); onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div><h2 className="text-slate-900 font-semibold">{isEdit ? "Edit Penjualan" : "Catat Penjualan"}</h2><p className="text-xs text-slate-400 mt-0.5">Output batch → offtaker</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Batch Processing *</Label><select value={processingId} onChange={(e) => setProcessingId(e.target.value)} className={selectCls}><option value="">Pilih batch…</option>{processings.map((p) => <option key={p.id} value={p.id}>{p.processing_code} · {p.commodity?.commodities_name}</option>)}</select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Offtaker</Label><select value={offtakerId} onChange={(e) => setOfftakerId(e.target.value)} className={selectCls}><option value="">—</option>{offtakers.map((o) => <option key={o.id} value={o.id}>{o.offtaker_name}</option>)}</select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Tanggal *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Gudang</Label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}><option value="">—</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Volume Kirim (Kg)</Label><Input type="number" value={delivered} onChange={(e) => setDelivered(e.target.value)} placeholder="0" /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Volume Diterima (Kg)</Label><Input type="number" value={accepted} onChange={(e) => setAccepted(e.target.value)} placeholder="0" /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Harga / Kg</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
            <div className="flex items-end"><div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-100"><span className="text-xs text-red-600">Ditolak</span><span className="font-mono text-sm text-red-600">{num(rejected)} Kg</span></div></div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white"><span className="text-sm font-medium">Total Revenue</span><span className="text-lg font-bold font-mono">{fmtRp(revenue)}</span></div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function Selling() {
  const mayWrite = canWriteOperations(useAuth().user);
  const { data: rows, loading, error, refetch } = useApi<SellingRow[]>("selling");
  const { data: processings } = useApi<ProcessingLite[]>("processing");
  const { data: offtakers } = useApi<Offtaker[]>("offtakers");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<SellingRow | null>(null);
  const [search, setSearch] = useState("");

  const list = (rows || []).filter((r) => search === "" || (r.offtaker?.offtaker_name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.processing?.processing_code ?? "").toLowerCase().includes(search.toLowerCase()));
  const totalRevenue = list.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const totalVol = list.reduce((s, r) => s + Number(r.accepted_volume || 0), 0);

  async function remove(id: number) {
    if (!confirm("Hapus data penjualan ini?")) return;
    try { await api.del(`selling/${id}`); toast.success("Dihapus"); refetch(); } catch (e: any) { toast.error(e?.message || "Gagal"); }
  }

  return (
    <div className="space-y-6 pb-8">
      {showModal && <SellingModal onClose={() => { setShowModal(false); setEditRow(null); }} onSaved={refetch} processings={processings || []} offtakers={offtakers || []} warehouses={warehouses || []} editRow={editRow} />}
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Selling</h1><p className="text-sm text-slate-500">Penjualan hasil olahan ke offtaker</p></div>
        {mayWrite && <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setEditRow(null); setShowModal(true); }}><Plus className="w-4 h-4 mr-2" />Catat Penjualan</Button>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Transaksi", value: String(list.length), color: "text-slate-900" }, { label: "Volume Diterima (Kg)", value: num(totalVol), color: "text-blue-700" }, { label: "Total Revenue", value: fmtRp(totalRevenue), color: "text-emerald-700" }].map((s) => (
          <Card key={s.label} className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{s.label}</p><p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p></Card>
        ))}
      </div>

      <Card className="p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari offtaker / batch…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Tanggal", "Batch", "Komoditas", "Offtaker", "Kirim", "Diterima", "Ditolak", "Harga/Kg", "Revenue", ""].map((h) => (
                <th key={h} className={`${["Kirim", "Diterima", "Ditolak", "Harga/Kg", "Revenue"].includes(h) ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-700">{r.processing?.processing_code || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.commodity?.commodities_name || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.offtaker?.offtaker_name || "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{num(r.delivered_volume)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{num(r.accepted_volume)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-red-500">{num(r.rejected_volume)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(r.price_per_unit)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-emerald-700">{fmtRp(r.total_revenue)}</td>
                  <td className="py-3 px-4"><div className="flex items-center justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setShowModal(true); }}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && list.length === 0 && <div className="p-16 text-center"><TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada penjualan</p></div>}
      </Card>
    </div>
  );
}
