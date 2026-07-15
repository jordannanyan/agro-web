import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, PackagePlus, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

interface Warehouse { id: number; warehouse_name: string; }
interface Sapropdi { id: number; sapropdi_name: string; }
interface POOption { id: number; po_number: string; }
interface Item { key: string; sapropdi_id: string; received_qty: string; item_condition: string; remarks: string; }

const rid = () => Math.random().toString(36).slice(2);
const newItem = (): Item => ({ key: rid(), sapropdi_id: "", received_qty: "", item_condition: "Good", remarks: "" });

export default function StockInCreate() {
  const navigate = useNavigate();
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const { data: sapropdi } = useApi<Sapropdi[]>("sapropdi");
  const { data: pos } = useApi<POOption[]>("purchase-orders");

  const [poId, setPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryNote, setDeliveryNote] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState("Posted");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [saving, setSaving] = useState(false);

  const upd = (key: string, f: keyof Item, v: string) => setItems((p) => p.map((it) => (it.key === key ? { ...it, [f]: v } : it)));
  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  async function save() {
    if (!warehouseId || !date) { toast.error("Gudang & tanggal wajib"); return; }
    const valid = items.filter((it) => it.sapropdi_id && parseFloat(it.received_qty) > 0);
    if (!valid.length) { toast.error("Tambahkan minimal 1 item saprodi dengan qty"); return; }
    setSaving(true);
    try {
      await api.post("stock-in", {
        purchase_order_id: poId ? Number(poId) : null,
        warehouse_id: Number(warehouseId), stock_in_date: date,
        delivery_note_no: deliveryNote || null, vehicle_number: vehicle || null, status, notes: notes || null,
        items: valid.map((it) => ({ sapropdi_id: Number(it.sapropdi_id), received_qty: Number(it.received_qty), item_condition: it.item_condition, remarks: it.remarks || null })),
      });
      toast.success("Stock In tercatat"); navigate("/warehouse/stock-in");
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/warehouse/stock-in")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><PackagePlus className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg">Stock In Baru</h1><p className="text-slate-500 text-sm">Gudang → Penerimaan Barang</p></div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi Penerimaan</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">Sumber PO (opsional)</label><select value={poId} onChange={(e) => setPoId(e.target.value)} className={selectCls}><option value="">— tanpa PO —</option>{(pos || []).map((p) => <option key={p.id} value={p.id}>{p.po_number}</option>)}</select></div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">Gudang <span className="text-red-500">*</span></label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}><option value="">Pilih…</option>{(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">Tanggal <span className="text-red-500">*</span></label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">No. Surat Jalan</label><Input value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} placeholder="DO-xxxx" /></div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">No. Kendaraan</label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="B 1234 XX" /></div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}><option value="Draft">Draft</option><option value="Posted">Posted</option></select></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Item Diterima</h2>
            <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, newItem()])}><Plus className="w-4 h-4 mr-1" />Item</Button>
          </div>
          <table className="w-full">
            <thead><tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="py-2 pr-3 font-semibold">Saprodi</th><th className="py-2 px-3 font-semibold text-right">Qty Diterima</th><th className="py-2 px-3 font-semibold">Kondisi</th><th className="py-2 px-3 font-semibold">Keterangan</th><th />
            </tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.key} className="border-b border-slate-50">
                  <td className="py-2 pr-3"><select value={it.sapropdi_id} onChange={(e) => upd(it.key, "sapropdi_id", e.target.value)} className={selectCls}><option value="">—</option>{(sapropdi || []).map((s) => <option key={s.id} value={s.id}>{s.sapropdi_name}</option>)}</select></td>
                  <td className="py-2 px-3 w-32"><Input type="number" className="text-right" value={it.received_qty} onChange={(e) => upd(it.key, "received_qty", e.target.value)} placeholder="0" /></td>
                  <td className="py-2 px-3 w-32"><select value={it.item_condition} onChange={(e) => upd(it.key, "item_condition", e.target.value)} className={selectCls}><option>Good</option><option>Damaged</option><option>Shortage</option></select></td>
                  <td className="py-2 px-3"><Input value={it.remarks} onChange={(e) => upd(it.key, "remarks", e.target.value)} placeholder="Opsional" /></td>
                  <td className="py-2 pl-3">{items.length > 1 && <button onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/warehouse/stock-in")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan Stock In"}</Button>
        </div>
      </div>
    </div>
  );
}
