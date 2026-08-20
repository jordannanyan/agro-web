import { useEffect, useState } from "react";
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
interface PreFinanceType { id: number; type_name: string; }
/** A cost line. `id` is absent until it has been saved. */
interface CostRow { id?: number; pre_finance_type_id?: number | string | null; description?: string; amount: number | string; }
interface SellingRow {
  id: number; date: string; delivered_volume: number; accepted_volume: number; rejected_volume: number;
  price_per_unit: number; total_revenue: number; total_cost?: number; profit_share_farmer_pct?: number | null;
  processing?: { id: number; processing_code: string } | null; offtaker?: { id: number; offtaker_name: string } | null;
  warehouse?: { id: number; warehouse_name: string } | null; commodity?: { commodities_name: string } | null;
}

function SellingModal({ onClose, onSaved, processings, offtakers, warehouses, costTypes, editRow }: {
  onClose: () => void; onSaved: () => void; processings: ProcessingLite[]; offtakers: Offtaker[];
  warehouses: Warehouse[]; costTypes: PreFinanceType[]; editRow?: SellingRow | null;
}) {
  const isEdit = !!editRow;
  const [processingId, setProcessingId] = useState(editRow?.processing?.id ? String(editRow.processing.id) : "");
  const [offtakerId, setOfftakerId] = useState(editRow?.offtaker?.id ? String(editRow.offtaker.id) : "");
  const [warehouseId, setWarehouseId] = useState(editRow?.warehouse?.id ? String(editRow.warehouse.id) : "");
  const [date, setDate] = useState(editRow?.date ? String(editRow.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [delivered, setDelivered] = useState(editRow?.delivered_volume != null ? String(editRow.delivered_volume) : "");
  const [accepted, setAccepted] = useState(editRow?.accepted_volume != null ? String(editRow.accepted_volume) : "");
  const [price, setPrice] = useState(editRow?.price_per_unit != null ? String(editRow.price_per_unit) : "");
  const [pct, setPct] = useState(editRow?.profit_share_farmer_pct != null ? String(editRow.profit_share_farmer_pct) : "");
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [originalCosts, setOriginalCosts] = useState<CostRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Cost lines hang off a saved sale, so an edit loads them and a new sale
  // starts with none; both are written in save() once the id exists.
  useEffect(() => {
    if (!editRow) return;
    api.get<CostRow[]>("selling/costs", { selling_id: editRow.id })
      .then((r) => { setCosts(r || []); setOriginalCosts(r || []); })
      .catch(() => undefined);
  }, [editRow]);

  const rejected = Math.max((parseFloat(delivered) || 0) - (parseFloat(accepted) || 0), 0);
  const revenue = (parseFloat(accepted) || 0) * (parseFloat(price) || 0);
  const totalCost = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  const setCost = (i: number, patch: Partial<CostRow>) =>
    setCosts((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  /** Write the cost lines back: update what changed, add what is new, drop what was removed. */
  async function syncCosts(sellingId: number) {
    const kept = new Set(costs.filter((c) => c.id).map((c) => c.id));
    for (const o of originalCosts) {
      if (o.id && !kept.has(o.id)) await api.del(`selling/costs/${o.id}`);
    }
    for (const c of costs) {
      const body = {
        selling_id: sellingId,
        pre_finance_type_id: c.pre_finance_type_id ? Number(c.pre_finance_type_id) : null,
        description: c.description || null,
        amount: Number(c.amount) || 0,
      };
      if (c.id) await api.put(`selling/costs/${c.id}`, body);
      else await api.post("selling/costs", body);
    }
  }

  async function save() {
    if (!processingId || !date) { toast.error("Batch processing & tanggal wajib"); return; }
    if (pct !== "" && (Number(pct) < 0 || Number(pct) > 100)) { toast.error("% Petani harus 0–100"); return; }
    setSaving(true);
    try {
      const body = {
        processing_id: Number(processingId), offtaker_id: offtakerId ? Number(offtakerId) : null,
        warehouse_id: warehouseId ? Number(warehouseId) : null, date,
        delivered_volume: Number(delivered) || 0, accepted_volume: Number(accepted) || 0, price_per_unit: Number(price) || 0,
        profit_share_farmer_pct: pct === "" ? null : Number(pct),
      };
      const saved = isEdit
        ? await api.put<SellingRow>(`selling/${editRow!.id}`, body)
        : await api.post<SellingRow>("selling", body);
      await syncCosts(isEdit ? editRow!.id : saved.id);
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

          {/* Freight, sorting and loading are subtracted before a profit share is
              worked out, and they are shared per kg by everyone who fed the batch.
              Recorded here because they belong to this delivery, not to a plot. */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm text-slate-700 font-semibold">Biaya Penjualan</Label>
                <p className="text-xs text-slate-400">Angkut, sortir, bongkar muat — dikurangkan sebelum bagi hasil</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setCosts((c) => [...c, { amount: "" }])}>
                <Plus className="w-3.5 h-3.5 mr-1" />Tambah
              </Button>
            </div>
            {costs.length === 0 && <p className="text-xs text-slate-400 py-2">Belum ada biaya dicatat.</p>}
            {costs.map((c, i) => (
              <div key={c.id ?? `new-${i}`} className="flex items-center gap-2 mb-2">
                <select value={c.pre_finance_type_id ?? ""} onChange={(e) => setCost(i, { pre_finance_type_id: e.target.value })} className={`${selectCls} w-36`}>
                  <option value="">Jenis…</option>
                  {costTypes.map((t) => <option key={t.id} value={t.id}>{t.type_name}</option>)}
                </select>
                <Input className="flex-1" placeholder="Keterangan" value={c.description ?? ""} onChange={(e) => setCost(i, { description: e.target.value })} />
                <Input className="w-36" type="number" placeholder="0" value={c.amount} onChange={(e) => setCost(i, { amount: e.target.value })} />
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => setCosts((cs) => cs.filter((_, j) => j !== i))}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {costs.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 mt-1">
                <span className="text-xs text-amber-700">Total Biaya</span>
                <span className="font-mono text-sm text-amber-700">{fmtRp(totalCost)}</span>
              </div>
            )}
          </div>

          {/* Only meaningful when the batch holds Profit Sharing plots. Left empty
              it falls back to the PT's default, which is where it normally lives. */}
          <div className="border-t border-slate-100 pt-4">
            <Label className="text-xs text-slate-600 mb-1.5 block">% Petani (Profit Sharing)</Label>
            <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} placeholder="ikuti default entitas" className="max-w-[220px]" />
            <p className="text-xs text-slate-400 mt-1">Kosongkan untuk memakai persentase bawaan entitas. Porsi perusahaan = 100 − nilai ini.</p>
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white">
            <span className="text-sm font-medium">Revenue − Biaya</span>
            <span className="text-lg font-bold font-mono">{fmtRp(revenue - totalCost)}</span>
          </div>
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
  const { data: costTypes } = useApi<PreFinanceType[]>("pre-finance-types");
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
      {showModal && <SellingModal onClose={() => { setShowModal(false); setEditRow(null); }} onSaved={refetch} processings={processings || []} offtakers={offtakers || []} warehouses={warehouses || []} costTypes={costTypes || []} editRow={editRow} />}
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
              {["Tanggal", "Batch", "Komoditas", "Offtaker", "Kirim", "Diterima", "Ditolak", "Harga/Kg", "Revenue", "Biaya", ""].map((h) => (
                <th key={h} className={`${["Kirim", "Diterima", "Ditolak", "Harga/Kg", "Revenue", "Biaya"].includes(h) ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
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
                  <td className="py-3 px-4 text-right text-sm font-mono text-amber-700">{Number(r.total_cost || 0) ? fmtRp(r.total_cost!) : "—"}</td>
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
