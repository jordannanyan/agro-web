import { useEffect, useMemo, useState } from "react";
import { TrendingUp, Plus, Search, Trash2, Pencil, X, Save, FileText, Layers, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";
import { ShowUsedSources } from "../../components/ShowUsedSources";
import { useClientPage } from "../../components/Pagination";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
const num = (n: number) => Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });

interface ProcessingLite { id: number; processing_code: string; volume_output: number; commodity?: { commodities_name: string } | null; }
interface Offtaker { id: number; offtaker_name: string; }
interface Warehouse { id: number; warehouse_name: string; }
interface Grade { id: number; grade_name: string; }
interface PreFinanceType { id: number; type_name: string; }
/** A cost line. `id` is absent until it has been saved. */
interface CostRow { id?: number; pre_finance_type_id?: number | string | null; description?: string; amount: number | string; }
/** An invoice line as the API returns it. */
interface ItemRow { id: number; line_type: "product" | "fee"; grade_id: number | null; grade_name: string | null; description: string | null; quantity: number; price_per_unit: number; amount: number; }
interface SellingRow {
  id: number; date: string; delivered_volume: number; accepted_volume: number; rejected_volume: number;
  price_per_unit: number; total_revenue: number; total_cost?: number; profit_share_farmer_pct?: number | null;
  invoice_number?: string | null; do_number?: string | null; vehicle_number?: string | null;
  invoice_total?: number | null; grade_summary?: string | null; fee_total?: number;
  processing?: { id: number; processing_code: string } | null; offtaker?: { id: number; offtaker_name: string } | null;
  warehouse?: { id: number; warehouse_name: string } | null; commodity?: { commodities_name: string } | null;
  items?: ItemRow[];
}
/** What the batch was bought as, and what each grade last sold for (GET selling/grade-source). */
interface GradeSource {
  bought: { grade_id: number | null; grade_name: string | null; kg: number }[];
  last_prices: { grade_id: number; price_per_unit: number; date: string; same_buyer: number }[];
  last_fees: { description: string; price_per_unit: number; date: string }[];
  volume_output: number | null;
}

// Form lines. A fee line's kilos follow the fruit's total until someone types them.
interface ProductLine { key: number; grade_id: string; quantity: string; price: string; }
interface FeeLine { key: number; description: string; price: string; quantity: string; followKg: boolean; }
let seq = 1;
const nextKey = () => seq++;

// Grades the field team does not invoice under (the ledger's placeholder).
const isPlaceholderGrade = (name?: string | null) => !name || /not categorized/i.test(name);

function SellingModal({ onClose, onSaved, offtakers, warehouses, grades, costTypes, editRow }: {
  onClose: () => void; onSaved: () => void; offtakers: Offtaker[];
  warehouses: Warehouse[]; grades: Grade[]; costTypes: PreFinanceType[]; editRow?: SellingRow | null;
}) {
  const isEdit = !!editRow;
  const [processingId, setProcessingId] = useState(editRow?.processing?.id ? String(editRow.processing.id) : "");
  // The batch list is fetched here rather than by the page, because it depends on
  // the switch below: by default it offers only the batches nothing has been sold
  // out of, which is what keeps one batch from being invoiced twice. Splitting a
  // batch across two offtakers is real — production has four of them — so the
  // switch brings the rest back, and `include_id` keeps the batch of the sale
  // being edited in the list.
  const [showUsedBatch, setShowUsedBatch] = useState(false);
  const { data: processingList } = useApi<ProcessingLite[]>("processing", {
    unused_for: showUsedBatch ? "" : "selling",
    include_id: processingId || "",
  });
  const processings = processingList || [];
  const [offtakerId, setOfftakerId] = useState(editRow?.offtaker?.id ? String(editRow.offtaker.id) : "");
  const [warehouseId, setWarehouseId] = useState(editRow?.warehouse?.id ? String(editRow.warehouse.id) : "");
  const [date, setDate] = useState(editRow?.date ? String(editRow.date).slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState(editRow?.invoice_number ?? "");
  const [doNo, setDoNo] = useState(editRow?.do_number ?? "");
  const [vehicle, setVehicle] = useState(editRow?.vehicle_number ?? "");
  const [delivered, setDelivered] = useState(editRow?.delivered_volume != null ? String(editRow.delivered_volume) : "");
  const [pct, setPct] = useState(editRow?.profit_share_farmer_pct != null ? String(editRow.profit_share_farmer_pct) : "");
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [originalCosts, setOriginalCosts] = useState<CostRow[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Invoice lines ──
  // A sale saved before invoices had lines opens as one line holding its volume and
  // price; it is written back as lines only if someone changes them, so editing
  // the date of an old sale leaves its value exactly as it was.
  const [products, setProducts] = useState<ProductLine[]>(() => (editRow && Number(editRow.accepted_volume) > 0
    ? [{ key: nextKey(), grade_id: "", quantity: String(editRow.accepted_volume), price: String(editRow.price_per_unit) }]
    : [{ key: nextKey(), grade_id: "", quantity: "", price: "" }]));
  const [fees, setFees] = useState<FeeLine[]>([]);
  const [hadItems, setHadItems] = useState(false);
  const [linesDirty, setLinesDirty] = useState(!editRow);
  const [source, setSource] = useState<GradeSource | null>(null);
  const [prefilledFor, setPrefilledFor] = useState<string>(isEdit ? "edit" : "");

  // Cost lines and invoice lines hang off a saved sale: an edit loads them.
  useEffect(() => {
    if (!editRow) return;
    api.get<CostRow[]>("selling/costs", { selling_id: editRow.id })
      .then((r) => { setCosts(r || []); setOriginalCosts(r || []); })
      .catch(() => undefined);
    api.get<SellingRow>(`selling/${editRow.id}`).then((d) => {
      const items = d?.items || [];
      if (!items.length) return;
      setHadItems(true);
      const kg = items.filter((i) => i.line_type === "product").reduce((s, i) => s + Number(i.quantity), 0);
      setProducts(items.filter((i) => i.line_type === "product").map((i) => ({
        key: nextKey(), grade_id: i.grade_id ? String(i.grade_id) : "", quantity: String(Number(i.quantity)), price: String(Number(i.price_per_unit)),
      })));
      setFees(items.filter((i) => i.line_type === "fee").map((i) => ({
        key: nextKey(), description: i.description ?? "", price: String(Number(i.price_per_unit)), quantity: String(Number(i.quantity)),
        followKg: Math.abs(Number(i.quantity) - kg) < 0.001,
      })));
    }).catch(() => undefined);
  }, [editRow]);

  // The batch's grades as bought, and the last prices — to start the invoice from.
  useEffect(() => {
    if (!processingId) { setSource(null); return; }
    api.get<GradeSource>("selling/grade-source", { processing_id: processingId, offtaker_id: offtakerId || undefined })
      .then(setSource).catch(() => setSource(null));
  }, [processingId, offtakerId]);

  const gradeName = (id: string) => grades.find((g) => String(g.id) === id)?.grade_name ?? "Tanpa grade";
  const lastPrice = (gid: string) => source?.last_prices.find((p) => String(p.grade_id) === gid);

  /** Lines for every grade: the grades the farmers delivered, else the grades last invoiced. */
  function fillFromSource(s: GradeSource) {
    const realBought = s.bought.filter((b) => b.grade_id && !isPlaceholderGrade(b.grade_name));
    const gradeIds = realBought.length
      ? realBought.map((b) => String(b.grade_id))
      : s.last_prices.map((p) => String(p.grade_id)).sort((a, b) => Number(a) - Number(b));
    if (gradeIds.length) {
      setProducts(gradeIds.map((g) => ({ key: nextKey(), grade_id: g, quantity: "", price: lastPrice(g) ? String(Number(lastPrice(g)!.price_per_unit)) : "" })));
    }
    if (s.last_fees.length && !fees.length) {
      setFees(s.last_fees.map((f) => ({ key: nextKey(), description: f.description, price: String(Number(f.price_per_unit)), quantity: "", followKg: true })));
    }
    setLinesDirty(true);
  }
  // A new sale starts from the batch's grades the first time a batch is picked.
  useEffect(() => {
    if (!source || isEdit || prefilledFor === processingId) return;
    setPrefilledFor(processingId);
    const untouched = products.every((p) => !p.quantity && !p.price);
    if (untouched) fillFromSource(source);
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  const productKg = products.reduce((s, p) => s + (parseFloat(p.quantity) || 0), 0);
  const productTotal = products.reduce((s, p) => s + (parseFloat(p.quantity) || 0) * (parseFloat(p.price) || 0), 0);
  const feeQty = (f: FeeLine) => (f.followKg ? productKg : parseFloat(f.quantity) || 0);
  const feeTotal = fees.reduce((s, f) => s + feeQty(f) * (parseFloat(f.price) || 0), 0);
  const grandTotal = productTotal + feeTotal;
  const deliveredNum = delivered === "" ? productKg : parseFloat(delivered) || 0;
  const rejected = Math.max(deliveredNum - productKg, 0);
  const totalCost = costs.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const dupGrade = new Set(products.map((p) => p.grade_id)).size !== products.length;

  // Grades as bought vs as invoiced, side by side.
  const trace = useMemo(() => {
    if (!source?.bought.length) return [];
    const sold = new Map<string, number>();
    products.forEach((p) => sold.set(p.grade_id, (sold.get(p.grade_id) || 0) + (parseFloat(p.quantity) || 0)));
    const ids = new Set<string>([...source.bought.map((b) => String(b.grade_id ?? "")), ...products.map((p) => p.grade_id)]);
    return [...ids].map((id) => ({
      id, name: id ? gradeName(id) : "Tanpa grade",
      bought: Number(source.bought.find((b) => String(b.grade_id ?? "") === id)?.kg || 0),
      sold: sold.get(id) || 0,
    })).filter((r) => r.bought || r.sold);
  }, [source, products]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const setProduct = (i: number, patch: Partial<ProductLine>) => { setLinesDirty(true); setProducts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p))); };
  const setFee = (i: number, patch: Partial<FeeLine>) => { setLinesDirty(true); setFees((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f))); };
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
    if (dupGrade) { toast.error("Grade yang sama muncul dua kali — gabungkan kilonya"); return; }
    if (fees.some((f) => !f.description.trim() && (parseFloat(f.price) || 0) > 0)) { toast.error("Isi keterangan biaya (mis. Cleaning and Packing)"); return; }
    if (delivered !== "" && deliveredNum + 0.001 < productKg) { toast.error("Volume kirim lebih kecil dari total kg di invoice"); return; }
    setSaving(true);
    try {
      const body: any = {
        processing_id: Number(processingId), offtaker_id: offtakerId ? Number(offtakerId) : null,
        warehouse_id: warehouseId ? Number(warehouseId) : null, date,
        invoice_number: invoiceNo, do_number: doNo, vehicle_number: vehicle,
        delivered_volume: deliveredNum,
        profit_share_farmer_pct: pct === "" ? null : Number(pct),
      };
      if (linesDirty || hadItems) {
        body.items = [
          ...products.map((p) => ({ line_type: "product", grade_id: p.grade_id ? Number(p.grade_id) : null, quantity: parseFloat(p.quantity) || 0, price_per_unit: parseFloat(p.price) || 0 })),
          ...fees.map((f) => ({ line_type: "fee", description: f.description.trim(), quantity: feeQty(f), price_per_unit: parseFloat(f.price) || 0 })),
        ];
      } else {
        // An old sale whose lines were not touched keeps its own volume and price.
        body.accepted_volume = productKg;
        body.price_per_unit = parseFloat(products[0]?.price) || 0;
      }
      const saved = isEdit
        ? await api.put<SellingRow>(`selling/${editRow!.id}`, body)
        : await api.post<SellingRow>("selling", body);
      await syncCosts(isEdit ? editRow!.id : saved.id);
      toast.success(isEdit ? "Penjualan diperbarui" : "Penjualan tercatat"); onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  const th = "text-[11px] font-semibold text-slate-500 uppercase tracking-wide";
  const grid = "grid grid-cols-[1.3fr_1fr_1fr_1.2fr_32px] gap-2 items-start";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[94vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div><h2 className="text-slate-900 font-semibold">{isEdit ? "Edit Penjualan" : "Catat Penjualan"}</h2><p className="text-xs text-slate-400 mt-0.5">Isi sesuai invoice ke pembeli: satu baris per grade, lalu fee (Cleaning and Packing, dll.)</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Invoice header */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="col-span-2 md:col-span-1"><div className="flex items-baseline justify-between gap-2 mb-1.5"><Label className="text-xs text-slate-600">Batch Processing *</Label><ShowUsedSources checked={showUsedBatch} onChange={setShowUsedBatch} /></div><select value={processingId} onChange={(e) => setProcessingId(e.target.value)} className={selectCls}><option value="">Pilih batch…</option>{processings.map((p) => <option key={p.id} value={p.id}>{p.processing_code} · {p.commodity?.commodities_name}</option>)}</select>{!showUsedBatch && processings.length === 0 && <p className="text-[11px] text-slate-400 mt-1">Semua batch sudah terjual.</p>}</div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Bill To (Offtaker)</Label><select value={offtakerId} onChange={(e) => setOfftakerId(e.target.value)} className={selectCls}><option value="">—</option>{offtakers.map((o) => <option key={o.id} value={o.id}>{o.offtaker_name}</option>)}</select></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Invoice Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Invoice Number</Label><Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="mis. 0122/Banana/JNBS/11/2026" /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">DO Number</Label><Input value={doNo} onChange={(e) => setDoNo(e.target.value)} placeholder="mis. 0123/XI/SJ/JNBS/2026" /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Vehicle Number</Label><Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="mis. W 9876 PB" /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Gudang</Label><select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}><option value="">—</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}</select></div>
          </div>

          {/* Grade lines — the top table of the invoice */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <Label className="text-sm text-slate-700 font-semibold">Barang per Grade</Label>
              <div className="flex items-center gap-3">
                {source && (
                  <button type="button" onClick={() => fillFromSource(source)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700" title="Isi baris grade dari pembelian batch / invoice terakhir">
                    <Wand2 className="w-3.5 h-3.5" />Isi otomatis
                  </button>
                )}
                <button type="button" onClick={() => { setLinesDirty(true); setProducts((ps) => [...ps, { key: nextKey(), grade_id: "", quantity: "", price: "" }]); }} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                  <Plus className="w-3.5 h-3.5" />Tambah grade
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className={`${grid} px-3 py-2 bg-emerald-700`}>
                {["Grade", "Price / Kg", "Quantity (Kg)", "Total", ""].map((h, i) => <span key={i} className={`${th} !text-white ${i > 0 && i < 4 ? "text-right" : ""}`}>{h}</span>)}
              </div>
              {products.map((p, i) => {
                const lp = p.grade_id ? lastPrice(p.grade_id) : undefined;
                const dup = products.some((x, j) => j !== i && x.grade_id === p.grade_id);
                return (
                  <div key={p.key} className={`${grid} px-3 py-2 border-t border-slate-100`}>
                    <select value={p.grade_id} onChange={(e) => {
                      const g = e.target.value; const l = lastPrice(g);
                      setProduct(i, { grade_id: g, ...(!p.price && l ? { price: String(Number(l.price_per_unit)) } : {}) });
                    }} className={`${selectCls} ${dup ? "border-red-300 bg-red-50" : ""}`}>
                      <option value="">Tanpa grade</option>
                      {grades.map((g) => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
                    </select>
                    <div>
                      <Input type="number" value={p.price} onChange={(e) => setProduct(i, { price: e.target.value })} placeholder="0" className="text-right" />
                      {lp && Number(p.price) !== Number(lp.price_per_unit) && (
                        <button type="button" onClick={() => setProduct(i, { price: String(Number(lp.price_per_unit)) })} className="block ml-auto text-[10px] text-amber-700 hover:underline mt-0.5">
                          terakhir {fmtRp(lp.price_per_unit)}{Number(lp.same_buyer) ? " (pembeli ini)" : ""} — pakai
                        </button>
                      )}
                    </div>
                    <Input type="number" value={p.quantity} onChange={(e) => setProduct(i, { quantity: e.target.value })} placeholder="0" className="text-right" />
                    <span className="text-sm font-mono text-slate-800 text-right pt-2">{fmtRp((parseFloat(p.quantity) || 0) * (parseFloat(p.price) || 0))}</span>
                    {products.length > 1
                      ? <button type="button" onClick={() => { setLinesDirty(true); setProducts((ps) => ps.filter((_, j) => j !== i)); }} className="pt-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      : <span />}
                  </div>
                );
              })}
              <div className={`${grid} px-3 py-2 border-t border-slate-200 bg-emerald-50 text-sm font-semibold text-emerald-900`}>
                <span>Sub Total</span><span />
                <span className="text-right font-mono">{num(productKg)}</span>
                <span className="text-right font-mono">{fmtRp(productTotal)}</span><span />
              </div>
            </div>
            {dupGrade && <p className="text-xs text-red-600 mt-1">Grade yang sama muncul dua kali — gabungkan kilonya.</p>}
          </div>

          {/* Fee lines — the second table of the invoice */}
          <div>
            <div className="flex items-end justify-between mb-1.5">
              <div>
                <Label className="text-sm text-slate-700 font-semibold">Fee ke Pembeli</Label>
                <p className="text-xs text-slate-400">Ditagihkan per kg di invoice (mis. Cleaning and Packing) — ikut menambah nilai penjualan</p>
              </div>
              <button type="button" onClick={() => { setLinesDirty(true); setFees((fs) => [...fs, { key: nextKey(), description: fs.length ? "" : "Cleaning and Packing", price: "", quantity: "", followKg: true }]); }} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline">
                <Plus className="w-3.5 h-3.5" />Tambah fee
              </button>
            </div>
            {fees.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className={`${grid} px-3 py-2 bg-emerald-700`}>
                  {["Description", "Fee / Kg", "Quantity (Kg)", "Total", ""].map((h, i) => <span key={i} className={`${th} !text-white ${i > 0 && i < 4 ? "text-right" : ""}`}>{h}</span>)}
                </div>
                {fees.map((f, i) => (
                  <div key={f.key} className={`${grid} px-3 py-2 border-t border-slate-100`}>
                    <Input value={f.description} onChange={(e) => setFee(i, { description: e.target.value })} placeholder="Cleaning and Packing" />
                    <Input type="number" value={f.price} onChange={(e) => setFee(i, { price: e.target.value })} placeholder="0" className="text-right" />
                    <div>
                      <Input type="number" value={f.followKg ? String(productKg || "") : f.quantity} placeholder="0" className="text-right"
                        onChange={(e) => setFee(i, { quantity: e.target.value, followKg: false })} />
                      {!f.followKg && <button type="button" onClick={() => setFee(i, { followKg: true })} className="block ml-auto text-[10px] text-emerald-700 hover:underline mt-0.5">ikuti total kg</button>}
                    </div>
                    <span className="text-sm font-mono text-slate-800 text-right pt-2">{fmtRp(feeQty(f) * (parseFloat(f.price) || 0))}</span>
                    <button type="button" onClick={() => { setLinesDirty(true); setFees((fs) => fs.filter((_, j) => j !== i)); }} className="pt-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <div className={`${grid} px-3 py-2 border-t border-slate-200 bg-emerald-50 text-sm font-semibold text-emerald-900`}>
                  <span>Sub Total</span><span /><span />
                  <span className="text-right font-mono">{fmtRp(feeTotal)}</span><span />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-800 text-white">
            <span className="text-sm font-semibold">Grand Total (nilai penjualan)</span>
            <span className="text-lg font-bold font-mono">{fmtRp(grandTotal)}</span>
          </div>

          {/* Volume: what left the warehouse vs what the invoice bills */}
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Volume Kirim (Kg)</Label><Input type="number" value={delivered} onChange={(e) => setDelivered(e.target.value)} placeholder={productKg ? `${productKg} (= invoice)` : "0"} /></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Diterima / Ditagih (Kg)</Label><div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm text-slate-700">{num(productKg)}</div></div>
            <div><Label className="text-xs text-slate-600 mb-1.5 block">Ditolak (Kg)</Label><div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 font-mono text-sm text-red-600">{num(rejected)}</div></div>
          </div>

          {/* Grades from purchasing to selling */}
          {trace.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-1.5 mb-2"><Layers className="w-4 h-4 text-slate-500" /><span className="text-sm font-semibold text-slate-700">Grade: pembelian → penjualan</span></div>
              <table className="w-full text-sm">
                <thead><tr className="text-[11px] text-slate-500 uppercase tracking-wide"><th className="text-left font-semibold py-1">Grade</th><th className="text-right font-semibold">Dibeli dari petani (kg)</th><th className="text-right font-semibold">Dijual (kg)</th></tr></thead>
                <tbody>
                  {trace.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100"><td className="py-1 text-slate-700">{r.name}</td><td className="text-right font-mono text-slate-600">{r.bought ? num(r.bought) : "—"}</td><td className="text-right font-mono text-slate-800">{r.sold ? num(r.sold) : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
              {source?.bought.every((b) => isPlaceholderGrade(b.grade_name)) && (
                <p className="text-[11px] text-slate-400 mt-1.5">Pembelian batch ini belum dipisah per grade (Not Categorized) — grade baru ditentukan saat sortir.</p>
              )}
            </div>
          )}

          {/* Freight, sorting and loading are subtracted before a profit share is
              worked out, and they are shared per kg by everyone who fed the batch.
              Recorded here because they belong to this delivery, not to a plot. */}
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-sm text-slate-700 font-semibold">Biaya Penjualan (pengeluaran)</Label>
                <p className="text-xs text-slate-400">Angkut, sortir, bongkar muat — tidak tertulis di invoice, dikurangkan sebelum bagi hasil</p>
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
            <span className="text-sm font-medium">Nilai Penjualan − Biaya</span>
            <span className="text-lg font-bold font-mono">{fmtRp(grandTotal - totalCost)}</span>
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

/** The sale laid out the way the invoice reads, to check it against the paper. */
function InvoiceView({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: s, loading } = useApi<SellingRow>(`selling/${id}`);
  const items = s?.items || [];
  const prods = items.filter((i) => i.line_type === "product");
  const fees = items.filter((i) => i.line_type === "fee");
  const sum = (l: ItemRow[], k: "quantity" | "amount") => l.reduce((t, i) => t + Number(i[k] || 0), 0);
  const head = "bg-emerald-700 text-white text-xs font-semibold";
  const cell = "border border-emerald-800/20 px-2 py-1.5";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[94vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold">Invoice</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4 text-sm">
          {loading || !s ? <p className="text-slate-400">Memuat…</p> : (
            <>
              <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-slate-700">
                <dt className="font-semibold">Invoice Number</dt><dd>: {s.invoice_number || "—"}</dd>
                <dt className="font-semibold">Invoice Date</dt><dd>: {s.date}</dd>
                <dt className="font-semibold">DO Number</dt><dd>: {s.do_number || "—"}</dd>
                <dt className="font-semibold">Vehicle Number</dt><dd>: {s.vehicle_number || "—"}</dd>
                <dt className="font-semibold">Bill To</dt><dd>: {s.offtaker?.offtaker_name || "—"}</dd>
                <dt className="font-semibold">Batch</dt><dd>: {s.processing?.processing_code || "—"} · {s.commodity?.commodities_name || "—"}</dd>
              </dl>
              {!items.length ? (
                <p className="text-slate-500 bg-slate-50 rounded-lg p-3">Penjualan ini dicatat dengan satu harga: {num(s.accepted_volume)} kg × {fmtRp(s.price_per_unit)} = <b>{fmtRp(s.total_revenue)}</b>. Edit untuk mengisinya per grade sesuai invoice.</p>
              ) : (
                <>
                  <table className="w-full border-collapse">
                    <thead><tr>{["Nr", "Description", "Grade", "Price/Kg", "Quantity (Kg)", "Total"].map((h) => <th key={h} className={`${head} ${cell}`}>{h}</th>)}</tr></thead>
                    <tbody>
                      {prods.map((i, n) => (
                        <tr key={i.id}><td className={`${cell} text-center`}>{n + 1}</td><td className={cell}>{s.commodity?.commodities_name ?? ""}</td><td className={`${cell} text-center`}>{i.grade_name || i.description || "—"}</td><td className={`${cell} text-right font-mono`}>{fmtRp(i.price_per_unit)}</td><td className={`${cell} text-right font-mono`}>{num(i.quantity)}</td><td className={`${cell} text-right font-mono`}>{fmtRp(i.amount)}</td></tr>
                      ))}
                      <tr className="bg-emerald-50 font-semibold"><td colSpan={4} className={`${cell} text-center`}>Sub Total</td><td className={`${cell} text-right font-mono`}>{num(sum(prods, "quantity"))}</td><td className={`${cell} text-right font-mono`}>{fmtRp(sum(prods, "amount"))}</td></tr>
                    </tbody>
                  </table>
                  {fees.length > 0 && (
                    <table className="w-full border-collapse">
                      <thead><tr>{["Nr", "Description", "Fee", "Quantity (Kg)", "Total"].map((h) => <th key={h} className={`${head} ${cell}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {fees.map((i, n) => (
                          <tr key={i.id}><td className={`${cell} text-center`}>{n + 1}</td><td className={cell}>{i.description}</td><td className={`${cell} text-right font-mono`}>{fmtRp(i.price_per_unit)}</td><td className={`${cell} text-right font-mono`}>{num(i.quantity)}</td><td className={`${cell} text-right font-mono`}>{fmtRp(i.amount)}</td></tr>
                        ))}
                        <tr className="bg-emerald-50 font-semibold"><td colSpan={4} className={`${cell} text-center`}>Sub Total</td><td className={`${cell} text-right font-mono`}>{fmtRp(sum(fees, "amount"))}</td></tr>
                      </tbody>
                    </table>
                  )}
                  <div className="flex justify-between items-center bg-emerald-800 text-white rounded-lg px-4 py-2.5 font-semibold"><span>Grand total</span><span className="font-mono">{fmtRp(s.total_revenue)}</span></div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Selling() {
  const mayWrite = canWriteOperations(useAuth().user);
  const { data: rows, loading, error, refetch } = useApi<SellingRow[]>("selling");
  const { data: offtakers } = useApi<Offtaker[]>("offtakers");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");
  const { data: grades } = useApi<Grade[]>("grades");
  const { data: costTypes } = useApi<PreFinanceType[]>("pre-finance-types");
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<SellingRow | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const q = search.toLowerCase();
  const list = (rows || []).filter((r) => search === ""
    || (r.offtaker?.offtaker_name ?? "").toLowerCase().includes(q)
    || (r.processing?.processing_code ?? "").toLowerCase().includes(q)
    || (r.invoice_number ?? "").toLowerCase().includes(q));
  const pg = useClientPage(list);
  const totalRevenue = list.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const totalVol = list.reduce((s, r) => s + Number(r.accepted_volume || 0), 0);
  const totalFee = list.reduce((s, r) => s + Number(r.fee_total || 0), 0);

  async function remove(id: number) {
    if (!confirm("Hapus data penjualan ini?")) return;
    try { await api.del(`selling/${id}`); toast.success("Dihapus"); refetch(); } catch (e: any) { toast.error(e?.message || "Gagal"); }
  }

  return (
    <div className="space-y-6 pb-8">
      {showModal && <SellingModal onClose={() => { setShowModal(false); setEditRow(null); }} onSaved={refetch} offtakers={offtakers || []} warehouses={warehouses || []} grades={grades || []} costTypes={costTypes || []} editRow={editRow} />}
      {viewId != null && <InvoiceView id={viewId} onClose={() => setViewId(null)} />}
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl text-slate-900 mb-1">Selling</h1><p className="text-sm text-slate-500">Penjualan hasil olahan ke offtaker — dicatat sesuai invoice, per grade</p></div>
        {mayWrite && <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setEditRow(null); setShowModal(true); }}><Plus className="w-4 h-4 mr-2" />Catat Penjualan</Button>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Transaksi", value: String(list.length), color: "text-slate-900" }, { label: "Volume Diterima (Kg)", value: num(totalVol), color: "text-blue-700" }, { label: "Fee ke Pembeli", value: fmtRp(totalFee), color: "text-teal-700" }, { label: "Total Revenue (barang + fee)", value: fmtRp(totalRevenue), color: "text-emerald-700" }].map((s) => (
          <Card key={s.label} className="p-5"><p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{s.label}</p><p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p></Card>
        ))}
      </div>

      <Card className="p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Cari offtaker / batch / no. invoice…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50 border-b border-slate-100">
              {["Tanggal", "Invoice / Batch", "Komoditas", "Offtaker", "Grade (kg)", "Kirim", "Diterima", "Ditolak", "Harga/Kg", "Nilai Barang", "Fee", "Revenue", "Biaya", ""].map((h) => (
                <th key={h} className={`${["Kirim", "Diterima", "Ditolak", "Harga/Kg", "Nilai Barang", "Fee", "Revenue", "Biaya"].includes(h) ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {pg.pageRows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-4 text-sm">
                    {r.invoice_number && <div className="font-medium text-slate-800 whitespace-nowrap">{r.invoice_number}</div>}
                    <div className="font-mono text-xs text-slate-500">{r.processing?.processing_code || "—"}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.commodity?.commodities_name || "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.offtaker?.offtaker_name || "—"}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-[220px]">{r.grade_summary || <span className="text-slate-300">satu harga</span>}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{num(r.delivered_volume)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{num(r.accepted_volume)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-red-500">{num(r.rejected_volume)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600" title={r.grade_summary ? "Rata-rata semua grade" : ""}>{fmtRp(r.price_per_unit)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(Number(r.total_revenue || 0) - Number(r.fee_total || 0))}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-teal-700">{Number(r.fee_total || 0) ? fmtRp(r.fee_total!) : "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-emerald-700">{fmtRp(r.total_revenue)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-amber-700">{Number(r.total_cost || 0) ? fmtRp(r.total_cost!) : "—"}</td>
                  <td className="py-3 px-4"><div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" title="Lihat invoice" onClick={() => setViewId(r.id)}><FileText className="w-4 h-4" /></Button>
                    {mayWrite && <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setShowModal(true); }}><Pencil className="w-4 h-4" /></Button>}
                    {mayWrite && <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>{pg.pager}
        </div>
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && list.length === 0 && <div className="p-16 text-center"><TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" /><p className="text-slate-500 font-medium">Belum ada penjualan</p></div>}
      </Card>
    </div>
  );
}
