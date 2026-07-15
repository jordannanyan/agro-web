import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, PackageOpen, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface PFType { id: number; type_name: string; }
interface Farmer { id: number; farmer_name: string; }
interface Plot { id: number; plot_name: string; farmer_id: number; }
interface Sapropdi { id: number; sapropdi_name: string; }
interface Unit { id: number; unit_name: string; }
interface Commodity { id: number; commodities_name: string; }

export default function DistributionCreate() {
  const navigate = useNavigate();
  const { data: types } = useApi<PFType[]>("pre-finance-types");
  const { data: farmers } = useApi<Farmer[]>("farmers");
  const { data: plots } = useApi<Plot[]>("plots");
  const { data: sapropdi } = useApi<Sapropdi[]>("sapropdi");
  const { data: units } = useApi<Unit[]>("units");
  const { data: commodities } = useApi<Commodity[]>("commodities");

  const [typeId, setTypeId] = useState("");
  const [farmerId, setFarmerId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [sapropdiId, setSapropdiId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [directAmount, setDirectAmount] = useState("");
  const [description, setDescription] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const typeName = (types || []).find((t) => String(t.id) === typeId)?.type_name || "";
  const isSaprodi = typeName === "Saprodi";
  const farmerPlots = useMemo(() => (plots || []).filter((p) => String(p.farmer_id) === farmerId), [plots, farmerId]);
  const total = isSaprodi ? (parseFloat(qty) || 0) * (parseFloat(price) || 0) : (parseFloat(directAmount) || 0);
  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const label = "text-xs text-slate-500 font-medium mb-1.5 block";

  async function save() {
    if (!typeId || !farmerId || !date) { toast.error("Tipe, petani, tanggal wajib"); return; }
    if (isSaprodi && (!sapropdiId || !(parseFloat(qty) > 0))) { toast.error("Saprodi & qty wajib untuk tipe Saprodi"); return; }
    if (!isSaprodi && !(parseFloat(directAmount) > 0)) { toast.error("Nominal wajib > 0"); return; }
    const form = new FormData();
    form.append("pre_finance_type_id", typeId);
    form.append("farmer_id", farmerId);
    if (plotId) form.append("plot_id", plotId);
    if (commodityId) form.append("commodities_id", commodityId);
    form.append("date", date);
    if (isSaprodi) {
      form.append("sapropdi_id", sapropdiId);
      if (unitId) form.append("unit_id", unitId);
      form.append("quantity", qty);
      form.append("price_per_unit", price || "0");
    } else {
      form.append("total_amount", directAmount);
    }
    if (description) form.append("description", description);
    if (proof) form.append("upload_proof", proof);
    setSaving(true);
    try { await api.upload("pre-finance/distributions", form); toast.success("Distribusi tercatat"); navigate("/prefinance/distribution"); }
    catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/prefinance/distribution")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><PackageOpen className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg">Tambah Distribusi</h1><p className="text-slate-500 text-sm">Pre-Finance → Distribusi</p></div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi Utama</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={label}>Tipe <span className="text-red-500">*</span></label><select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={selectCls}><option value="">Pilih tipe…</option>{(types || []).map((t) => <option key={t.id} value={t.id}>{t.type_name}</option>)}</select></div>
            <div><label className={label}>Tanggal <span className="text-red-500">*</span></label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className={label}>Petani <span className="text-red-500">*</span></label><select value={farmerId} onChange={(e) => { setFarmerId(e.target.value); setPlotId(""); }} className={selectCls}><option value="">Pilih petani…</option>{(farmers || []).map((f) => <option key={f.id} value={f.id}>{f.farmer_name}</option>)}</select></div>
            <div><label className={label}>Plot</label><select value={plotId} onChange={(e) => setPlotId(e.target.value)} disabled={!farmerId} className={selectCls}><option value="">—</option>{farmerPlots.map((p) => <option key={p.id} value={p.id}>{p.plot_name}</option>)}</select></div>
            <div><label className={label}>Komoditas</label><select value={commodityId} onChange={(e) => setCommodityId(e.target.value)} className={selectCls}><option value="">—</option>{(commodities || []).map((c) => <option key={c.id} value={c.id}>{c.commodities_name}</option>)}</select></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">{isSaprodi ? "Detail Saprodi (qty × harga)" : "Nominal"}</h2>
          {isSaprodi ? (
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Saprodi <span className="text-red-500">*</span></label><select value={sapropdiId} onChange={(e) => setSapropdiId(e.target.value)} className={selectCls}><option value="">Pilih…</option>{(sapropdi || []).map((s) => <option key={s.id} value={s.id}>{s.sapropdi_name}</option>)}</select></div>
              <div><label className={label}>Satuan</label><select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={selectCls}><option value="">—</option>{(units || []).map((u) => <option key={u.id} value={u.id}>{u.unit_name}</option>)}</select></div>
              <div><label className={label}>Kuantitas <span className="text-red-500">*</span></label><Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" /></div>
              <div><label className={label}>Harga / Satuan</label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" /></div>
            </div>
          ) : (
            <div><label className={label}>Nominal (Rp) <span className="text-red-500">*</span></label><Input type="number" value={directAmount} onChange={(e) => setDirectAmount(e.target.value)} placeholder="0" /></div>
          )}
          <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-sm text-amber-700 font-medium">Total Utang Petani</span>
            <span className="text-lg font-bold font-mono text-amber-700">{fmtRp(total)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div><label className={label}>Keterangan</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Opsional…" /></div>
          <div><label className={label}>Bukti Distribusi</label>
            <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-pointer hover:border-emerald-400">
              <Upload className="w-4 h-4" /><span className="truncate">{proof ? proof.name : "Upload bukti…"}</span>
              <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/prefinance/distribution")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan Distribusi"}</Button>
        </div>
      </div>
    </div>
  );
}
