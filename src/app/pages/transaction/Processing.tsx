import { useEffect, useMemo, useState } from "react";
import { Factory, Plus, Search, Trash2, Pencil, X, Save } from "lucide-react";
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

interface Commodity { id: number; commodities_name: string; }
interface Warehouse { id: number; warehouse_name: string; }
interface PurchasingLite { id: number; date: string; quantity: number; receipt_invoice: string | null; scheme: string; commodity?: { commodities_name: string } | null; farmer?: { farmer_name: string } | null; collector?: { collector_name: string } | null; }
interface ProcessingRow {
  id: number; processing_code: string; date: string; status: string; volume_input: number; volume_output: number;
  total_processing_cost: number; loss: number; commodity?: { id: number; commodities_name: string } | null; warehouse?: { id: number; warehouse_name: string } | null;
}

function statusBadge(s: string) {
  const m: Record<string, string> = { open: "bg-slate-100 text-slate-600 border-slate-200", processing: "bg-amber-50 text-amber-700 border-amber-200", closed: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return m[s] || m.open;
}

function ProcessingModal({ onClose, onSaved, commodities, warehouses, purchasings, editRow }: {
  onClose: () => void; onSaved: () => void; commodities: Commodity[]; warehouses: Warehouse[]; purchasings: PurchasingLite[]; editRow?: ProcessingRow | null;
}) {
  const isEdit = !!editRow;
  const [code, setCode] = useState(editRow?.processing_code ?? "");
  const [date, setDate] = useState(editRow?.date ? String(editRow.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [commodityId, setCommodityId] = useState(editRow?.commodity?.id ? String(editRow.commodity.id) : "");
  const [warehouseId, setWarehouseId] = useState(editRow?.warehouse?.id ? String(editRow.warehouse.id) : "");
  const [volOutput, setVolOutput] = useState(editRow?.volume_output != null ? String(editRow.volume_output) : "");
  const [cost, setCost] = useState(editRow?.total_processing_cost != null ? String(editRow.total_processing_cost) : "");
  const [status, setStatus] = useState(editRow?.status ?? "open");
  const [picked, setPicked] = useState<Record<number, string>>({}); // purchasing_id -> volume
  const [saving, setSaving] = useState(false);

  // In edit mode, load existing contributing purchasings.
  useEffect(() => {
    if (!editRow) return;
    (async () => {
      try {
        const detail = await api.get<any>(`processing/${editRow.id}`);
        const map: Record<number, string> = {};
        (detail.purchasings || []).forEach((pp: any) => { map[pp.purchasing_id] = String(pp.volume_contributed ?? ""); });
        setPicked(map);
      } catch { /* ignore */ }
    })();
  }, [editRow]);

  const volInput = useMemo(() => Object.values(picked).reduce((s, v) => s + (parseFloat(v) || 0), 0), [picked]);
  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  function toggle(p: PurchasingLite) {
    setPicked((prev) => {
      const next = { ...prev };
      if (p.id in next) delete next[p.id];
      else next[p.id] = String(p.quantity ?? "");
      return next;
    });
  }

  async function save() {
    if (!code || !commodityId || !date) { toast.error("Kode, komoditas, tanggal wajib"); return; }
    const purchasingsPayload = Object.entries(picked).map(([id, vol]) => ({ purchasing_id: Number(id), volume_contributed: Number(vol) || 0 }));
    setSaving(true);
    try {
      const body = {
        processing_code: code, date, commodities_id: Number(commodityId),
        warehouse_id: warehouseId ? Number(warehouseId) : null,
        volume_input: volInput, volume_output: Number(volOutput) || 0,
        total_processing_cost: Number(cost) || 0, status, purchasings: purchasingsPayload,
      };
      if (isEdit) await api.put(`processing/${editRow!.id}`, body);
      else await api.post("processing", body);
      toast.success(isEdit ? "Batch diperbarui" : "Batch processing dibuat"); onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div><h2 className="text-slate-900 font-semibold">{isEdit ? "Edit Batch" : "Batch Processing Baru"}</h2><p className="text-xs text-slate-400 mt-0.5">Gabungkan pembelian → olah → output</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Kode Batch *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Cocoa-001" /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Tanggal *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Komoditas *</Label><select value={commodityId} onChange={(e) => setCommodityId(e.target.value)} className={selectCls}><option value="">—</option>{commodities.map((c) => <option key={c.id} value={c.id}>{c.commodities_name}</option>)}</select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Gudang</Label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}><option value="">—</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Status</Label><select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}><option value="open">Open</option><option value="processing">Processing</option><option value="closed">Closed</option></select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Biaya Olah (Rp)</Label><Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" /></div>
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-2 block">Pilih Pembelian (kontributor volume input)</Label>
            <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-slate-50">
              {purchasings.length === 0 && <p className="p-4 text-sm text-slate-400">Tidak ada data pembelian</p>}
              {purchasings.map((p) => {
                const sel = p.id in picked;
                const supplier = p.farmer?.farmer_name || p.collector?.collector_name || "—";
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-3 py-2 ${sel ? "bg-emerald-50/50" : ""}`}>
                    <input type="checkbox" checked={sel} onChange={() => toggle(p)} className="accent-emerald-500 w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{p.receipt_invoice || `#${p.id}`} · {supplier}</p>
                      <p className="text-xs text-slate-400">{p.date} · {p.commodity?.commodities_name} · {num(p.quantity)} Kg</p>
                    </div>
                    {sel && <Input type="number" value={picked[p.id]} onChange={(e) => setPicked((prev) => ({ ...prev, [p.id]: e.target.value }))} className="w-24 text-right" placeholder="Vol" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200"><span className="text-sm text-slate-600">Total Vol Input</span><span className="font-mono font-semibold text-slate-800">{num(volInput)} Kg</span></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Volume Output (Kg)</Label><Input type="number" value={volOutput} onChange={(e) => setVolOutput(e.target.value)} placeholder="0" /></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan Batch"}</Button>
        </div>
      </div>
    </div>
  );
}

export default function Processing() {
  const mayWrite = canWriteOperations(useAuth().user);
  const { data: rows, loading, error, refetch } = useApi<ProcessingRow[]>("processing");
  const { data: commodities } = useApi<Commodity[]>("commodities");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const { data: purchasings } = useApi<PurchasingLite[]>("purchasing");
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<ProcessingRow | null>(null);
  const [search, setSearch] = useState("");

  const list = (rows || []).filter((r) => search === "" || r.processing_code?.toLowerCase().includes(search.toLowerCase()));

  async function remove(id: number) {
    if (!confirm("Hapus batch ini?")) return;
    try { await api.del(`processing/${id}`); toast.success("Dihapus"); refetch(); } catch (e: any) { toast.error(e?.message || "Gagal"); }
  }

  return (
    <div className="space-y-6 pb-8">
      {showModal && <ProcessingModal onClose={() => { setShowModal(false); setEditRow(null); }} onSaved={refetch} commodities={commodities || []} warehouses={warehouses || []} purchasings={purchasings || []} editRow={editRow} />}
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Processing</h1><p className="text-sm text-slate-500">Pengolahan komoditas per batch — input dari Purchasing, output ke Selling</p></div>
        {mayWrite && <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setEditRow(null); setShowModal(true); }}><Plus className="w-4 h-4 mr-2" />Batch Baru</Button>}
      </div>

      <Card className="p-4">
        <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari kode batch…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Kode", "Tanggal", "Komoditas", "Gudang", "Vol Input", "Vol Output", "Loss", "Biaya", "Status", ""].map((h) => (
                <th key={h} className={`${["Vol Input", "Vol Output", "Loss", "Biaya"].includes(h) ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm font-mono font-semibold text-slate-700">{r.processing_code}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.commodity?.commodities_name || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.warehouse?.warehouse_name || "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{num(r.volume_input)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{num(r.volume_output)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-red-500">{r.status === "open" ? "—" : num(r.loss)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(r.total_processing_cost)}</td>
                  <td className="py-3 px-4"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusBadge(r.status)}`}>{r.status}</span></td>
                  <td className="py-3 px-4"><div className="flex items-center justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setShowModal(true); }}><Pencil className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && list.length === 0 && <div className="p-16 text-center"><Factory className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada batch processing</p></div>}
      </Card>
    </div>
  );
}
