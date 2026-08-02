import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, PackageMinus, Plus, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

// The one place goods leave a warehouse. It replaces "Distribusi" under Pre-Finance
// and "Operational Investment" under Profit Sharing: the scheme is read off the plot
// rather than picked, so the keeper issues stock without having to know which of the
// two programmes a given farmer sits in.

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID");
const rid = () => Math.random().toString(36).slice(2);

interface Warehouse { id: number; warehouse_name: string; }
interface Farmer { id: number; farmer_name: string; }
interface Plot { id: number; plot_name: string; farmer_id: number; scheme?: string | null; }
interface Sapropdi { id: number; sapropdi_name: string; }
interface Unit { id: number; unit_name: string; }
interface InvRow { warehouse_id: number; sapropdi_id: number; remaining: number; }

interface Line {
  key: string; farmer_id: string; plot_id: string; sapropdi_id: string;
  unit_id: string; quantity: string; price_per_unit: string;
}

const SCHEME_META: Record<string, { label: string; cls: string }> = {
  PreFinance:    { label: "Pre-Finance",    cls: "bg-sky-50 text-sky-700 border-sky-200" },
  ProfitSharing: { label: "Profit Sharing", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  BeliPutus:     { label: "Beli Putus",     cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

const emptyLine = (): Line => ({
  key: rid(), farmer_id: "", plot_id: "", sapropdi_id: "",
  unit_id: "", quantity: "", price_per_unit: "",
});

export default function StockOutCreate() {
  const navigate = useNavigate();
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const { data: farmers } = useApi<Farmer[]>("farmers");
  const { data: plots } = useApi<Plot[]>("plots");
  const { data: sapropdi } = useApi<Sapropdi[]>("sapropdi");
  const { data: units } = useApi<Unit[]>("units");

  const [warehouseId, setWarehouseId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  // Stock is held per warehouse, so balances only mean anything once one is chosen.
  const { data: inventory } = useApi<InvRow[]>(
    warehouseId ? "warehouse-stock/inventory" : null,
    warehouseId ? { warehouse_id: warehouseId } : undefined, [warehouseId]);

  const stockOf = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of inventory || []) m.set(Number(r.sapropdi_id), Number(r.remaining));
    return m;
  }, [inventory]);

  // Two lines drawing the same item share one balance. The server checks it the same
  // way, so what is flagged here is exactly what would come back as an error.
  const claimed = useMemo(() => {
    const m = new Map<number, number>();
    for (const l of lines) {
      if (!l.sapropdi_id) continue;
      const id = Number(l.sapropdi_id);
      m.set(id, (m.get(id) ?? 0) + (parseFloat(l.quantity) || 0));
    }
    return m;
  }, [lines]);

  const shortages = useMemo(() => {
    const out: { name: string; have: number; want: number }[] = [];
    for (const [id, want] of claimed) {
      const have = stockOf.get(id) ?? 0;
      if (want > have) out.push({ name: (sapropdi || []).find((s) => s.id === id)?.sapropdi_name ?? `#${id}`, have, want });
    }
    return out;
  }, [claimed, stockOf, sapropdi]);

  const grandTotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.price_per_unit) || 0), 0);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((p) => p.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    if (!warehouseId) { toast.error("Gudang wajib dipilih"); return; }
    if (!date) { toast.error("Tanggal wajib diisi"); return; }
    const filled = lines.filter((l) => l.sapropdi_id || l.farmer_id || l.quantity);
    if (!filled.length) { toast.error("Minimal satu baris"); return; }
    for (const [i, l] of filled.entries()) {
      const at = `Baris ${i + 1}`;
      if (!l.farmer_id) { toast.error(`${at}: petani wajib dipilih`); return; }
      if (!l.plot_id) { toast.error(`${at}: plot wajib dipilih — skema dibaca dari plot`); return; }
      if (!l.sapropdi_id) { toast.error(`${at}: barang wajib dipilih`); return; }
      if (!(parseFloat(l.quantity) > 0)) { toast.error(`${at}: kuantitas harus > 0`); return; }
    }
    if (shortages.length) { toast.error(`Stok tidak cukup: ${shortages[0].name}`); return; }

    setSaving(true);
    try {
      await api.post("stock-out", {
        warehouse_id: Number(warehouseId),
        stock_out_date: date,
        notes: notes || null,
        lines: filled.map((l) => ({
          farmer_id: Number(l.farmer_id), plot_id: Number(l.plot_id),
          sapropdi_id: Number(l.sapropdi_id),
          unit_id: l.unit_id ? Number(l.unit_id) : null,
          quantity: Number(l.quantity),
          price_per_unit: l.price_per_unit ? Number(l.price_per_unit) : null,
        })),
      });
      toast.success("Stock out tercatat");
      navigate("/warehouse/stock-out");
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  const selectCls = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const label = "text-xs text-slate-500 font-medium mb-1.5 block";

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/warehouse/stock-out")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center"><PackageMinus className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-slate-900 font-semibold text-lg">Stock Out</h1>
              <p className="text-slate-500 text-sm">Gudang → barang keluar ke petani (Pre-Finance &amp; Profit Sharing)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Dokumen</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={label}>Gudang Asal <span className="text-red-500">*</span></label>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
                <option value="">Pilih gudang…</option>
                {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
              </select>
            </div>
            <div><label className={label}>Tanggal <span className="text-red-500">*</span></label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label className={label}>Catatan</label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional…" /></div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Barang Keluar</h2>
            <Button size="sm" variant="outline" onClick={() => setLines((p) => [...p, emptyLine()])}><Plus className="w-4 h-4 mr-1" />Baris</Button>
          </div>

          {!warehouseId && (
            <p className="text-sm text-slate-400 mb-3">Pilih gudang dulu agar sisa stok tiap barang bisa ditampilkan.</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Petani", "Plot / Skema", "Barang", "Sisa Stok", "Qty", "Satuan", "Harga", "Subtotal", ""].map((h) => (
                    <th key={h} className="text-left py-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const farmerPlots = (plots || []).filter((p) => String(p.farmer_id) === l.farmer_id);
                  const scheme = farmerPlots.find((p) => String(p.id) === l.plot_id)?.scheme || null;
                  const meta = scheme ? SCHEME_META[scheme] : null;
                  const have = l.sapropdi_id ? (stockOf.get(Number(l.sapropdi_id)) ?? 0) : null;
                  const qty = parseFloat(l.quantity) || 0;
                  const over = have != null && (claimed.get(Number(l.sapropdi_id)) ?? 0) > have;
                  return (
                    <tr key={l.key} className="border-b border-slate-50 align-top">
                      <td className="py-2 px-2 min-w-[10rem]">
                        <select value={l.farmer_id} onChange={(e) => setLine(l.key, { farmer_id: e.target.value, plot_id: "" })} className={selectCls}>
                          <option value="">Pilih…</option>
                          {(farmers || []).map((f) => <option key={f.id} value={f.id}>{f.farmer_name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2 min-w-[11rem]">
                        <select value={l.plot_id} onChange={(e) => setLine(l.key, { plot_id: e.target.value })} disabled={!l.farmer_id} className={selectCls}>
                          <option value="">Pilih plot…</option>
                          {farmerPlots.map((p) => <option key={p.id} value={p.id}>{p.plot_name}</option>)}
                        </select>
                        {meta && <span className={`mt-1 inline-flex px-1.5 py-0.5 rounded text-xs font-semibold border ${meta.cls}`}>{meta.label}</span>}
                      </td>
                      <td className="py-2 px-2 min-w-[11rem]">
                        <select value={l.sapropdi_id} onChange={(e) => setLine(l.key, { sapropdi_id: e.target.value })} className={selectCls}>
                          <option value="">Pilih…</option>
                          {(sapropdi || []).map((s) => <option key={s.id} value={s.id}>{s.sapropdi_name}</option>)}
                        </select>
                      </td>
                      <td className={`py-2 px-2 text-sm font-mono whitespace-nowrap ${over ? "text-red-600 font-bold" : "text-slate-600"}`}>
                        {have == null ? "—" : num(have)}
                      </td>
                      <td className="py-2 px-2 w-24"><Input type="number" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value })} placeholder="0" /></td>
                      <td className="py-2 px-2 min-w-[7rem]">
                        <select value={l.unit_id} onChange={(e) => setLine(l.key, { unit_id: e.target.value })} className={selectCls}>
                          <option value="">—</option>
                          {(units || []).map((u) => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-2 w-28"><Input type="number" value={l.price_per_unit} onChange={(e) => setLine(l.key, { price_per_unit: e.target.value })} placeholder="0" /></td>
                      <td className="py-2 px-2 text-sm font-mono text-slate-700 whitespace-nowrap">{fmtRp(qty * (parseFloat(l.price_per_unit) || 0))}</td>
                      <td className="py-2 px-2">
                        {lines.length > 1 && (
                          <button onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {shortages.length > 0 && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-red-700"><AlertTriangle className="w-4 h-4" />Stok tidak mencukupi</p>
              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                {shortages.map((s) => <li key={s.name}>{s.name}: tersedia {num(s.have)}, diminta {num(s.want)}</li>)}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-sm text-amber-700 font-medium">Total Nilai (menjadi utang petani)</span>
            <span className="text-lg font-bold font-mono text-amber-700">{fmtRp(grandTotal)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/warehouse/stock-out")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={save} disabled={saving || shortages.length > 0}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan Stock Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
