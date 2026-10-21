import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, X, Save, Leaf, Info, AlertTriangle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";

// ── Types (API-shaped) ────────────────────────────────────────────────────────
type Scheme = "BeliPutus" | "PreFinance" | "ProfitSharing";

interface Plot { id: number; plot_name: string; scheme: Scheme; farmer_id: number; farmer?: { id: number; farmer_name: string } | null; }
interface Commodity { id: number; commodities_name: string; }
interface Grade { id: number; grade_name: string; }
interface Collector { id: number; collector_name: string; }
interface Warehouse { id: number; warehouse_name: string; }

interface PurchasingRow {
  id: number;
  date: string;
  receipt_invoice: string | null;
  supplier_type: "farmer" | "collector";
  scheme: Scheme;
  quantity: number;
  price_per_unit: number;
  total_value: number;
  // Loan repayment deducted from this delivery (pre-finance) and what was left
  // for the farmer — computed by the API.
  repayment_total: number;
  net_payment: number;
  payment_status: "paid" | "unpaid";
  plot?: { id: number; plot_name: string } | null;
  farmer?: { id: number; farmer_name: string } | null;
  collector?: { id: number; collector_name: string } | null;
  commodity?: { id: number; commodities_name: string } | null;
  grade?: { id: number; grade_name: string } | null;
  // The API has always sent this and the edit form has always read it; the type
  // just never said so, and nothing type-checks this project at build time.
  warehouse?: { id: number; warehouse_name: string } | null;
}

const SCHEME_META: Record<Scheme, { label: string; cls: string }> = {
  BeliPutus:     { label: "Beli Putus",     cls: "bg-blue-50 text-blue-700 border-blue-200" },
  PreFinance:    { label: "Pre-Finance",    cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ProfitSharing: { label: "Profit Sharing", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function SchemeBadge({ scheme }: { scheme: Scheme }) {
  const m = SCHEME_META[scheme] ?? SCHEME_META.BeliPutus;
  return <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.cls}`}>{m.label}</span>;
}

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

// What the API would deduct for a delivery (GET pre-finance/payback-rates/preview).
interface RepayLine { pre_finance_type_id: number; type_name: string; per_kg: number; computed: number; outstanding: number; amount: number; }
interface RepayPreview {
  applies: boolean;
  rate: { effective_date: string; full_price: number | null; saprodi_per_kg: number; labor_per_kg: number; grade_name: string | null } | null;
  lines: RepayLine[];
  total: number;
  capped: boolean;
}

// ── Create Modal ──────────────────────────────────────────────────────────────
function PurchasingModal({ onClose, onSaved, plots, commodities, grades, collectors, warehouses, editRow }: {
  onClose: () => void; onSaved: () => void;
  plots: Plot[]; commodities: Commodity[]; grades: Grade[]; collectors: Collector[]; warehouses: Warehouse[];
  editRow?: PurchasingRow | null;
}) {
  const isEdit = !!editRow;
  const [supplierType, setSupplierType] = useState<"farmer" | "collector">(editRow?.supplier_type ?? "farmer");
  const [farmerId, setFarmerId] = useState(editRow?.farmer?.id ? String(editRow.farmer.id) : "");
  const [plotId, setPlotId] = useState(editRow?.plot?.id ? String(editRow.plot.id) : "");
  const [collectorId, setCollectorId] = useState(editRow?.collector?.id ? String(editRow.collector.id) : "");
  const [commodityId, setCommodityId] = useState(editRow?.commodity?.id ? String(editRow.commodity.id) : "");
  const [gradeId, setGradeId] = useState(editRow?.grade?.id ? String(editRow.grade.id) : "");
  const [warehouseId, setWarehouseId] = useState(editRow?.warehouse?.id ? String(editRow.warehouse.id) : "");
  const [date, setDate] = useState(editRow?.date ? String(editRow.date).slice(0, 10) : "");
  const [quantity, setQuantity] = useState(editRow?.quantity != null ? String(editRow.quantity) : "");
  const [price, setPrice] = useState(editRow?.price_per_unit != null ? String(editRow.price_per_unit) : "");
  const [invoice, setInvoice] = useState(editRow?.receipt_invoice ?? "");
  const [paid, setPaid] = useState<"paid" | "unpaid">(editRow?.payment_status ?? "unpaid");
  const [saving, setSaving] = useState(false);

  // ── Loan repayment (pre-finance) ──
  // Left alone, the server deducts kilos × the plot's payback rate. The amounts
  // are sent only when someone typed them, so an untouched form and the mobile
  // app book exactly the same thing.
  const [preview, setPreview] = useState<RepayPreview | null>(null);
  const [manual, setManual] = useState<Record<number, number> | null>(null);
  const [existing, setExisting] = useState<Record<number, number> | null>(null);
  const [forceAuto, setForceAuto] = useState(false);
  const driversKey = `${plotId}|${gradeId}|${date}|${Number(quantity) || 0}`;
  const [initialKey] = useState(driversKey);

  useEffect(() => {
    if (!isEdit) return;
    api.get<any>(`purchasing/${editRow!.id}`).then((d) => {
      const m: Record<number, number> = {};
      (d?.repayment || []).forEach((l: any) => { m[l.pre_finance_type_id] = Number(l.amount); });
      setExisting(m);
    }).catch(() => setExisting({}));
  }, [isEdit, editRow]);

  // farmers derived from plots
  const farmers = useMemo(() => {
    const m = new Map<number, string>();
    plots.forEach((p) => { if (p.farmer) m.set(p.farmer.id, p.farmer.farmer_name); });
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [plots]);
  const farmerPlots = useMemo(() => plots.filter((p) => String(p.farmer_id) === farmerId), [plots, farmerId]);
  const selectedPlot = useMemo(() => plots.find((p) => String(p.id) === plotId), [plots, plotId]);
  const scheme: Scheme = supplierType === "collector" ? "BeliPutus" : (selectedPlot?.scheme ?? "BeliPutus");
  const isPS = scheme === "ProfitSharing";
  const priceNum = isPS ? 0 : (parseFloat(price) || 0);
  const total = (parseFloat(quantity) || 0) * priceNum;
  const isPF = scheme === "PreFinance";

  useEffect(() => {
    if (!isPF || !plotId || !date || !(Number(quantity) > 0)) { setPreview(null); return; }
    const t = setTimeout(() => {
      api.get<RepayPreview>("pre-finance/payback-rates/preview", {
        plot_id: plotId, grade_id: gradeId || undefined, date, quantity,
        purchasing_id: isEdit ? editRow!.id : undefined,
      }).then(setPreview).catch(() => setPreview(null));
    }, 300);
    return () => clearTimeout(t);
  }, [isPF, plotId, gradeId, date, quantity, isEdit, editRow]);

  // An edit that leaves plot, grade, date and kilos alone keeps the deduction it
  // has; change any of them and the server recomputes it from the rate.
  const keepsExisting = isEdit && !forceAuto && driversKey === initialKey && existing !== null;
  const repayAmount = (l: RepayLine) =>
    manual ? (manual[l.pre_finance_type_id] ?? 0) : keepsExisting ? (existing![l.pre_finance_type_id] ?? 0) : l.amount;
  const repayLines = (preview?.applies ? preview.lines : []).filter(
    (l) => l.per_kg > 0 || l.outstanding > 0 || repayAmount(l) > 0);
  const repayTotal = repayLines.reduce((sum, l) => sum + repayAmount(l), 0);
  const repayOver = repayLines.some((l) => repayAmount(l) > Math.max(0, l.outstanding) + 0.5);
  const ratePerKg = preview?.rate ? Number(preview.rate.saprodi_per_kg) + Number(preview.rate.labor_per_kg) : 0;
  const rateFinal = preview?.rate?.full_price != null ? Number(preview.rate.full_price) - ratePerKg : null;

  function setRepay(typeId: number, v: number) {
    const base: Record<number, number> = {};
    repayLines.forEach((l) => { base[l.pre_finance_type_id] = repayAmount(l); });
    setManual({ ...base, ...(manual || {}), [typeId]: v });
  }

  const selectCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-50";

  async function save() {
    if (!commodityId || !date || !quantity) { toast.error("Komoditas, tanggal, dan qty wajib diisi"); return; }
    if (supplierType === "farmer" && !plotId) { toast.error("Pilih plot petani"); return; }
    if (supplierType === "collector" && !collectorId) { toast.error("Pilih collector"); return; }
    if (isPF && repayOver) { toast.error("Potongan cicilan melebihi sisa utang petani"); return; }
    const payload: any = {
      supplier_type: supplierType,
      commodities_id: Number(commodityId),
      grade_id: gradeId ? Number(gradeId) : null,
      warehouse_id: warehouseId ? Number(warehouseId) : null,
      date,
      quantity: Number(quantity),
      price_per_unit: isPS ? 0 : (Number(price) || 0),
      receipt_invoice: invoice || null,
      payment_status: paid,
    };
    if (supplierType === "farmer") payload.plot_id = Number(plotId);
    else payload.collector_id = Number(collectorId);
    if (isPF && manual) {
      payload.repayment = repayLines.map((l) => ({ pre_finance_type_id: l.pre_finance_type_id, amount: repayAmount(l) }));
    } else if (isPF && forceAuto) {
      payload.repayment = "auto";
    }
    setSaving(true);
    try {
      if (isEdit) await api.put(`purchasing/${editRow!.id}`, payload);
      else await api.post("purchasing", payload);
      toast.success(isEdit ? "Pembelian diperbarui" : "Pembelian tercatat");
      if (isPF && !manual && preview?.applies && !preview.rate && !keepsExisting && repayLines.length > 0) {
        toast.warning("Plot ini belum punya tarif potongan — tidak ada cicilan yang dipotong.");
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-semibold">{isEdit ? "Edit" : "Tambah"} Pembelian</h2>
            <p className="text-xs text-slate-400 mt-0.5">Skema mengikuti plot yang dipilih</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Supplier type */}
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Tipe Supplier</Label>
            <div className="flex gap-2">
              {(["farmer", "collector"] as const).map((t) => (
                <label key={t} className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${supplierType === t ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="supplierType" checked={supplierType === t} onChange={() => { setSupplierType(t); setPlotId(""); setFarmerId(""); setCollectorId(""); }} className="accent-emerald-500" />
                  <span className="text-sm font-medium capitalize">{t === "farmer" ? "Petani (Farmer)" : "Collector"}</span>
                </label>
              ))}
            </div>
          </div>

          {supplierType === "farmer" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Petani *</Label>
                <select value={farmerId} onChange={(e) => { setFarmerId(e.target.value); setPlotId(""); }} className={selectCls}>
                  <option value="">Pilih petani…</option>
                  {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-slate-600 mb-1.5 block">Plot *</Label>
                <select value={plotId} onChange={(e) => setPlotId(e.target.value)} disabled={!farmerId} className={selectCls}>
                  <option value="">Pilih plot…</option>
                  {farmerPlots.map((p) => <option key={p.id} value={p.id}>{p.plot_name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Collector *</Label>
              <select value={collectorId} onChange={(e) => setCollectorId(e.target.value)} className={selectCls}>
                <option value="">Pilih collector…</option>
                {collectors.map((c) => <option key={c.id} value={c.id}>{c.collector_name}</option>)}
              </select>
            </div>
          )}

          {/* Scheme (auto, read-only) */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Skema (otomatis dari plot)</span>
            </div>
            <SchemeBadge scheme={scheme} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Komoditas *</Label>
              <select value={commodityId} onChange={(e) => setCommodityId(e.target.value)} className={selectCls}>
                <option value="">Pilih…</option>
                {commodities.map((c) => <option key={c.id} value={c.id}>{c.commodities_name}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Grade</Label>
              <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} className={selectCls}>
                <option value="">—</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Tanggal *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Gudang</Label>
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={selectCls}>
                <option value="">—</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Kuantitas (Kg) *</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Harga / Kg{isPF ? " (harga final)" : ""}</Label>
              <Input type="number" value={isPS ? "0" : price} onChange={(e) => setPrice(e.target.value)} disabled={isPS} placeholder="0" />
              {isPF && rateFinal != null && Number(price) !== rateFinal && (
                <button type="button" onClick={() => setPrice(String(rateFinal))} className="mt-1 text-xs text-amber-700 hover:underline">
                  Harga final menurut tarif: {fmtRp(rateFinal)} — pakai
                </button>
              )}
            </div>
          </div>

          {isPF && plotId && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Potongan Cicilan Utang</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {preview?.rate
                      ? <>Tarif sejak {String(preview.rate.effective_date).slice(0, 10)}{preview.rate.grade_name ? ` (grade ${preview.rate.grade_name})` : ""}: {fmtRp(ratePerKg)}/kg</>
                      : "Kuantitas × tarif potongan plot — tercatat otomatis sebagai cicilan"}
                  </p>
                </div>
                {(manual || keepsExisting) && preview?.applies && (
                  <button type="button" onClick={() => { setManual(null); setForceAuto(true); }}
                    className="flex items-center gap-1 text-xs text-amber-700 hover:underline whitespace-nowrap">
                    <RotateCcw className="w-3 h-3" />Hitung dari tarif
                  </button>
                )}
              </div>

              {/* Nothing owed means nothing to deduct, whatever the rate says — the
                  lines below only appear for a type with debt left on it. */}
              {preview?.applies && repayLines.length === 0 && (
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Petani ini tidak punya utang Pre-Finance yang tercatat — tidak ada yang dipotong dari setoran ini.
                </div>
              )}
              {preview?.applies && !preview.rate && repayLines.length > 0 && (
                <div className="flex items-start gap-2 text-xs text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Plot ini belum punya tarif potongan (Pre-Finance → Tarif Potongan). Isi manual bila setoran ini memang dipotong.
                </div>
              )}

              {repayLines.map((l) => {
                const val = repayAmount(l);
                const over = val > Math.max(0, l.outstanding) + 0.5;
                return (
                  <div key={l.pre_finance_type_id}>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-slate-600">
                        {l.type_name}{l.per_kg > 0 ? ` · ${fmtRp(l.per_kg)}/kg` : ""}
                      </Label>
                      <span className="text-xs text-slate-400">Sisa utang: {fmtRp(l.outstanding)}</span>
                    </div>
                    <Input type="number" value={val ? String(val) : ""} placeholder="0"
                      onChange={(e) => setRepay(l.pre_finance_type_id, Number(e.target.value) || 0)}
                      className={over ? "border-red-300 bg-red-50" : ""} />
                    {over && <p className="text-xs text-red-600 mt-1">Melebihi sisa utang</p>}
                    {!manual && !keepsExisting && l.amount < l.computed && (
                      <p className="text-xs text-amber-700 mt-1">Dibatasi sisa utang (tarif: {fmtRp(l.computed)})</p>
                    )}
                  </div>
                );
              })}
              {!preview && <p className="text-xs text-slate-400">Isi tanggal dan kuantitas untuk menghitung potongan.</p>}
            </div>
          )}

          {isPS && (
            <div className="flex items-start gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
              <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-700">Skema <b>Profit Sharing</b>: petani tidak dibeli-putus, harga otomatis <b>Rp 0</b>. Bagi hasil dihitung dari penjualan − investasi.</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">No. Invoice / Nota</Label>
              <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="NP0001" />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Status Pembayaran</Label>
              <select value={paid} onChange={(e) => setPaid(e.target.value as any)} className={selectCls}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-slate-900 text-white space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Pembelian</span>
              <span className="text-lg font-bold tabular-nums">{fmtRp(total)}</span>
            </div>
            {isPF && repayTotal > 0 && (
              <>
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Potongan cicilan</span>
                  <span className="tabular-nums">− {fmtRp(repayTotal)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/20 pt-1">
                  <span className="text-sm font-medium">Dibayar ke petani</span>
                  <span className="text-lg font-bold tabular-nums">{fmtRp(total - repayTotal)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan Pembelian"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Purchasing() {
  const { user } = useAuth();
  const mayWrite = canWriteOperations(user);
  const [search, setSearch] = useState("");
  const [schemeFilter, setSchemeFilter] = useState<"" | Scheme>("");
  // Search and scheme go to the server: filtering a single page in the browser
  // would hide every match that happens to sit on another page.
  const {
    rows: list, meta, page, setPage, perPage, setPerPage, loading, error, refetch,
  } = usePagedApi<PurchasingRow>("purchasing", {
    search: search || undefined,
    scheme: schemeFilter || undefined,
  }, [search, schemeFilter]);
  const { data: plots } = useApi<Plot[]>("plots");
  const { data: commodities } = useApi<Commodity[]>("commodities");
  const { data: grades } = useApi<Grade[]>("grades");
  const { data: collectors } = useApi<Collector[]>("collectors");
  const { data: warehouses } = useApi<Warehouse[]>("warehouses");

  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState<PurchasingRow | null>(null);

  // Totals cover the whole filtered set, not the page on screen — the server sums
  // them over the same query that produced the rows.
  const totalQty = Number((meta as any)?.totals?.quantity ?? 0);
  const totalValue = Number((meta as any)?.totals?.total_value ?? 0);
  const totalRepay = Number((meta as any)?.totals?.repayment_total ?? 0);

  async function remove(id: number) {
    if (!confirm("Hapus data pembelian ini?")) return;
    try { await api.del(`purchasing/${id}`); toast.success("Dihapus"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal menghapus"); }
  }

  return (
    <div className="space-y-6 pb-8">
      {showModal && (
        <PurchasingModal
          onClose={() => { setShowModal(false); setEditRow(null); }} onSaved={refetch}
          plots={plots || []} commodities={commodities || []} grades={grades || []}
          collectors={collectors || []} warehouses={warehouses || []} editRow={editRow}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Purchasing</h1>
          <p className="text-sm text-slate-500">Catatan pembelian komoditas dari petani atau collector — skema mengikuti plot</p>
        </div>
        {mayWrite && (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setEditRow(null); setShowModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />Tambah Pembelian
          </Button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Transaksi", value: (meta?.total ?? list.length).toLocaleString("id-ID"), color: "text-slate-900" },
          { label: "Total Volume (Kg)", value: totalQty.toLocaleString("id-ID"), color: "text-blue-700" },
          { label: "Total Nilai", value: fmtRp(totalValue), color: "text-emerald-700" },
          { label: "Potongan Cicilan", value: fmtRp(totalRepay), color: "text-amber-700" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <select value={schemeFilter} onChange={(e) => setSchemeFilter(e.target.value as any)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="">Semua Skema</option>
            <option value="BeliPutus">Beli Putus</option>
            <option value="PreFinance">Pre-Finance</option>
            <option value="ProfitSharing">Profit Sharing</option>
          </select>
          <div className="flex-1 relative min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Cari supplier atau invoice…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Tanggal", "Invoice", "Skema", "Supplier", "Komoditas", "Grade", "Qty (Kg)", "Harga/Kg", "Total", "Potongan", "Bayar", ""].map((h) => (
                  <th key={h} className={`${["Qty (Kg)", "Harga/Kg", "Total", "Potongan"].includes(h) ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{r.date}</td>
                  <td className="py-3 px-4 text-sm font-mono text-slate-600">{r.receipt_invoice || "—"}</td>
                  <td className="py-3 px-4"><SchemeBadge scheme={r.scheme} /></td>
                  <td className="py-3 px-4 text-sm">
                    <p className="font-semibold text-slate-900">{r.supplier_type === "farmer" ? (r.farmer?.farmer_name ?? "—") : (r.collector?.collector_name ?? "—")}</p>
                    <p className="text-xs text-slate-400">{r.supplier_type === "farmer" ? (r.plot?.plot_name ?? "") : "Collector"}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-700">{r.commodity?.commodities_name ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.grade?.grade_name ?? "—"}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{Number(r.quantity).toLocaleString("id-ID")}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(r.price_per_unit)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-slate-900">{fmtRp(r.total_value)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-amber-700" title={Number(r.repayment_total) > 0 ? `Dibayar ke petani: ${fmtRp(r.net_payment)}` : undefined}>
                    {Number(r.repayment_total) > 0 ? fmtRp(r.repayment_total) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${r.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.payment_status === "paid" ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {mayWrite && <Button size="sm" variant="ghost" onClick={() => { setEditRow(r); setShowModal(true); }}><Pencil className="w-4 h-4" /></Button>}
                      {mayWrite && <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} page={page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} />
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && list.length === 0 && (
          <div className="p-16 text-center">
            <Leaf className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Belum ada pembelian</p>
            <p className="text-sm text-slate-400 mt-1">Klik "Tambah Pembelian" untuk mulai</p>
          </div>
        )}
      </Card>
    </div>
  );
}
