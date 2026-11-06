// "Tambah Biaya": every cost that is not saprodi — labour, transport, anything
// else — entered the same way from Pre-Finance and from Profit Sharing.
//
// Saprodi is not here on purpose: goods leave the warehouse through Stock Out,
// which is what takes them off the stock. Everything else is one
// pre_finance_distributions line on a plot, and the plot decides what it is:
//   a Pre-Finance plot   → the farmer's debt, repaid off deliveries
//   a Profit Sharing plot → a cost of the season, set against the margin when the
//                           share is paid out (not debt)
// (the API stores the plot's scheme on the line — utils/distributionScheme.ts).

import { useEffect, useMemo, useState } from "react";
import { X, Users, Truck, MoreHorizontal, Info, Plus, PackageMinus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";

type Mode = "PreFinance" | "ProfitSharing";
type Kind = "Labor" | "Transport" | "Other";
const KINDS: { kind: Kind; label: string; hint: string; icon: typeof Users; unitId: number; qtyLabel: string; priceLabel: string }[] = [
  { kind: "Labor", label: "Tenaga Kerja", hint: "upah harian/borongan orang yang bekerja di lahan", icon: Users, unitId: 9, qtyLabel: "Jumlah orang × hari (HOK)", priceLabel: "Upah per orang per hari" },
  { kind: "Transport", label: "Transport", hint: "ojek pupuk, sewa truk, angkut panen", icon: Truck, unitId: 10, qtyLabel: "Jumlah trip", priceLabel: "Biaya per trip" },
  { kind: "Other", label: "Lainnya", hint: "biaya lain yang bukan barang gudang", icon: MoreHorizontal, unitId: 14, qtyLabel: "Jumlah", priceLabel: "Harga satuan" },
];
const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500";

interface Plot { id: number; plot_name: string; scheme: string; farmer_id: number | null; commodities_id: number | null; planted: string | null;
  farmer?: { id: number; farmer_name: string } | null; farmer__farmer_name?: string }

export default function CostEntryDialog({ mode, onClose, onSaved }: { mode: Mode; onClose: () => void; onSaved: () => void }) {
  const isPS = mode === "ProfitSharing";
  const { data: plots } = useApi<Plot[]>("plots", { scheme: mode });
  const { data: types } = useApi<{ id: number; type_name: string }[]>("pre-finance-types");
  const { data: commodities } = useApi<{ id: number; commodities_name: string }[]>("commodities");
  const [kind, setKind] = useState<Kind>("Labor");
  const [farmerId, setFarmerId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [commodityId, setCommodityId] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE"));
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [total, setTotal] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const meta = KINDS.find((k) => k.kind === kind)!;

  const farmerName = (p: Plot) => p.farmer?.farmer_name ?? p.farmer__farmer_name ?? `Petani #${p.farmer_id}`;
  const farmers = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of plots || []) if (p.farmer_id) m.set(p.farmer_id, farmerName(p));
    return [...m].sort((a, b) => a[1].localeCompare(b[1]));
  }, [plots]);
  const farmerPlots = (plots || []).filter((p) => String(p.farmer_id) === farmerId);
  const plot = farmerPlots.find((p) => String(p.id) === plotId);
  // The crop the cost is for: the plot's own, else the first one grown on it.
  useEffect(() => {
    if (!plot) return;
    if (plot.commodities_id) { setCommodityId(String(plot.commodities_id)); return; }
    const first = (plot.planted || "").split("|")[0];
    const c = (commodities || []).find((x) => x.commodities_name === first);
    if (c) setCommodityId(String(c.id));
  }, [plotId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (farmerPlots.length === 1) setPlotId(String(farmerPlots[0].id)); else setPlotId(""); }, [farmerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const computed = (Number(qty) || 0) * (Number(price) || 0);
  const amount = total !== "" ? Number(total) || 0 : computed;
  const typeId = (types || []).find((t) => t.type_name === kind)?.id;
  const ready = !!(typeId && farmerId && plotId && date && amount > 0);

  async function save() {
    if (!ready) return;
    setSaving(true);
    try {
      const f = new FormData();
      f.append("pre_finance_type_id", String(typeId));
      f.append("farmer_id", farmerId);
      f.append("plot_id", plotId);
      if (commodityId) f.append("commodities_id", commodityId);
      f.append("date", date);
      if (qty) f.append("quantity", qty);
      if (qty) f.append("unit_id", String(meta.unitId));
      if (price) f.append("price_per_unit", price);
      f.append("total_amount", String(amount));
      const auto = kind === "Labor" ? (isPS ? "Tenaga kerja lahan bagi hasil" : "Hutang tenaga kerja") : meta.label;
      f.append("description", note.trim() ? `${auto} — ${note.trim()}` : `${auto} ${date}`);
      if (file) f.append("upload_proof", file);
      await api.upload("pre-finance/distributions", f);
      toast.success(`${meta.label} ${fmtRp(amount)} dicatat untuk ${plot?.plot_name}`);
      onSaved(); onClose();
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tambah Biaya {isPS ? "Lahan Bagi Hasil" : "Pre-Finance"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tenaga kerja, transport, atau biaya lain. Saprodi (barang gudang) dicatat lewat Gudang → Stock Out.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* 1. What kind of cost */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">1. Jenis biaya</p>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button key={k.kind} type="button" onClick={() => setKind(k.kind)}
                  className={`text-left rounded-xl border p-3 transition-colors ${kind === k.kind ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200" : "border-slate-200 hover:border-slate-300"}`}>
                  <k.icon className={`w-5 h-5 mb-1 ${kind === k.kind ? "text-emerald-700" : "text-slate-400"}`} />
                  <div className="text-sm font-bold text-slate-900">{k.label}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{k.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. For whom */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">2. Untuk lahan mana</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-xs text-slate-500">Petani
                <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className={`${inputCls} mt-1`}>
                  <option value="">Pilih petani…</option>
                  {farmers.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">Lahan
                <select value={plotId} onChange={(e) => setPlotId(e.target.value)} className={`${inputCls} mt-1`} disabled={!farmerId}>
                  <option value="">{farmerId ? "Pilih lahan…" : "Pilih petani dulu"}</option>
                  {farmerPlots.map((p) => <option key={p.id} value={p.id}>{p.plot_name}{p.planted ? ` · ${p.planted.split("|").join(", ")}` : ""}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-500">Komoditas
                <select value={commodityId} onChange={(e) => setCommodityId(e.target.value)} className={`${inputCls} mt-1`}>
                  <option value="">—</option>
                  {(commodities || []).map((c) => <option key={c.id} value={c.id}>{c.commodities_name}</option>)}
                </select>
              </label>
            </div>
            {farmers.length === 0 && plots && (
              <p className="text-xs text-amber-700 mt-2">Belum ada lahan berskema {isPS ? "Profit Sharing" : "Pre-Finance"}.</p>
            )}
          </div>

          {/* 3. How much */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">3. Tanggal & nominal</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-xs text-slate-500">Tanggal
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="text-xs text-slate-500">{meta.qtyLabel}
                <input type="number" min="0" value={qty} onChange={(e) => { setQty(e.target.value); setTotal(""); }} className={`${inputCls} mt-1`} placeholder="mis. 5" />
              </label>
              <label className="text-xs text-slate-500">{meta.priceLabel}
                <input type="number" min="0" value={price} onChange={(e) => { setPrice(e.target.value); setTotal(""); }} className={`${inputCls} mt-1`} placeholder="mis. 100000" />
              </label>
              <label className="text-xs text-slate-500">Total (Rp)
                <input type="number" min="0" value={total !== "" ? total : (computed ? String(computed) : "")} onChange={(e) => setTotal(e.target.value)}
                  className={`${inputCls} mt-1 font-semibold`} placeholder="atau isi langsung" />
              </label>
            </div>
            <label className="block text-xs text-slate-500 mt-3">Keterangan
              <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} mt-1`}
                placeholder={kind === "Labor" ? "mis. panen minggu ke-2, 3–9 Nov" : kind === "Transport" ? "mis. ojek pupuk kandang ke lahan" : "mis. sewa alat semprot"} />
            </label>
            <label className="block text-xs text-slate-500 mt-3">Bukti (opsional) — nota, kwitansi, foto
              <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 block text-sm" />
            </label>
          </div>

          {/* What it will mean */}
          <div className={`flex gap-2.5 rounded-xl border p-3 text-sm ${isPS ? "bg-violet-50 border-violet-200 text-violet-900" : "bg-sky-50 border-sky-200 text-sky-900"}`}>
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            {isPS ? (
              <p>Dicatat sebagai <b>biaya lahan bagi hasil</b>{plot ? <> untuk <b>{plot.plot_name}</b></> : ""} — <b>bukan utang petani</b>.
                Biaya ini dibandingkan dengan margin lahan; bagian petani baru dibayar setelah lahan untung (Bayar Bagi Hasil).</p>
            ) : (
              <p>Dicatat sebagai <b>utang Pre-Finance</b>{farmerId ? <> {farmers.find(([id]) => String(id) === farmerId)?.[1]}</> : " petani"}{plot ? <> di lahan <b>{plot.plot_name}</b></> : ""} —
                dicicil dari potongan setoran panen.</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-100">
          <span className="text-sm text-slate-600">Total: <b className="font-mono text-slate-900">{fmtRp(amount)}</b></span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!ready || saving} onClick={save}>
              {saving ? "Menyimpan…" : "Simpan Biaya"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Where each kind of cost is entered — the same on Pre-Finance and Profit Sharing. */
export function CostHowTo({ onAdd, onStockOut, mayWrite, ps }: { onAdd: () => void; onStockOut: () => void; mayWrite: boolean; ps: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0"><PackageMinus className="w-4 h-4 text-orange-600" /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Saprodi (barang dari gudang)</p>
          <p className="text-xs text-slate-500">Pupuk, pestisida, bibit, bambu… dicatat lewat Stock Out supaya stok gudang ikut berkurang.</p>
          {mayWrite && <button type="button" onClick={onStockOut} className="mt-2 text-sm font-semibold text-orange-700 hover:underline">Buat Stock Out →</button>}
        </div>
      </div>
      <div className={`rounded-xl border p-4 flex items-start gap-3 ${ps ? "border-violet-200 bg-violet-50/50" : "border-sky-200 bg-sky-50/50"}`}>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ps ? "bg-violet-100" : "bg-sky-100"}`}><Plus className={`w-4 h-4 ${ps ? "text-violet-700" : "text-sky-700"}`} /></div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Tenaga kerja, transport, & biaya lain</p>
          <p className="text-xs text-slate-500">Upah harian/borongan, ojek pupuk, sewa truk, dan biaya lain yang bukan barang gudang.</p>
          {mayWrite && (
            <button type="button" onClick={onAdd}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${ps ? "bg-violet-600 hover:bg-violet-700" : "bg-sky-600 hover:bg-sky-700"}`}>
              <Plus className="w-4 h-4" />Tambah Biaya
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
