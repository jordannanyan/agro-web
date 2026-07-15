import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, CreditCard, Save, AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

interface Farmer { id: number; farmer_name: string; }
interface PFType { id: number; type_name: string; }
interface PayMethod { id: number; method_name: string; }
interface OutstandingRow { pre_finance_type_id: number; type_name: string; outstanding: number; }

const formatRp = (val: number) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
const parseNumber = (s: string) => {
  const n = parseInt(String(s).replace(/\D/g, ""), 10);
  return isNaN(n) ? 0 : n;
};

export default function InstallmentCreate() {
  const navigate = useNavigate();
  const { data: farmers } = useApi<Farmer[]>("farmers");
  const { data: types } = useApi<PFType[]>("pre-finance-types");
  const { data: methods } = useApi<PayMethod[]>("payment-methods");

  const [farmerId, setFarmerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [methodId, setMethodId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [amounts, setAmounts] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  // Outstanding per type for the selected farmer.
  const { data: outstanding } = useApi<OutstandingRow[]>(
    farmerId ? "pre-finance/outstanding" : null,
    farmerId ? { farmer_id: farmerId } : undefined,
    [farmerId]
  );
  const outMap = useMemo(() => {
    const m: Record<number, number> = {};
    (outstanding || []).forEach((o) => { m[o.pre_finance_type_id] = Number(o.outstanding || 0); });
    return m;
  }, [outstanding]);

  const total = useMemo(() => Object.values(amounts).reduce((s, v) => s + Number(v || 0), 0), [amounts]);
  const overpaid = (types || []).some((t) => (amounts[t.id] || 0) > (outMap[t.id] ?? Infinity) && (outMap[t.id] ?? 0) >= 0 && outMap[t.id] !== undefined && (amounts[t.id] || 0) > outMap[t.id]);
  const isValid = farmerId && total > 0 && !overpaid;

  function setAmount(typeId: number, v: number) {
    setAmounts((prev) => ({ ...prev, [typeId]: v }));
  }

  async function save() {
    if (!isValid) return;
    const details = (types || [])
      .filter((t) => (amounts[t.id] || 0) > 0)
      .map((t) => ({ pre_finance_type_id: t.id, amount: amounts[t.id] }));
    const form = new FormData();
    form.append("farmer_id", farmerId);
    form.append("date", date);
    if (methodId) form.append("payment_method_id", methodId);
    if (reference) form.append("reference_no", reference);
    if (notes) form.append("notes", notes);
    form.append("details", JSON.stringify(details));
    if (proof) form.append("upload_proof", proof);
    setSaving(true);
    try {
      await api.upload("pre-finance/installments", form);
      toast.success("Cicilan tersimpan");
      navigate("/prefinance/installment");
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan cicilan");
    } finally { setSaving(false); }
  }

  const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white";

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/prefinance/installment")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center"><CreditCard className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-slate-900 font-semibold text-lg">Tambah Cicilan</h1>
              <p className="text-slate-500 text-sm">Pre-Finance → Cicilan (breakdown per tipe)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl mx-auto space-y-6">
        {/* Informasi Utama */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi Utama</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Petani <span className="text-red-500">*</span></label>
              <select value={farmerId} onChange={(e) => { setFarmerId(e.target.value); setAmounts({}); }} className={inputCls}>
                <option value="">Pilih petani…</option>
                {(farmers || []).map((f) => <option key={f.id} value={f.id}>{f.farmer_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Tanggal <span className="text-red-500">*</span></label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Metode Pembayaran</label>
              <select value={methodId} onChange={(e) => setMethodId(e.target.value)} className={inputCls}>
                <option value="">Pilih…</option>
                {(methods || []).map((m) => <option key={m.id} value={m.id}>{m.method_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">No. Referensi</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. transaksi / giro" className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Bukti Bayar</label>
              <label className="flex items-center gap-2 border border-dashed border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-500 cursor-pointer hover:border-emerald-400">
                <Upload className="w-4 h-4" />
                <span className="truncate">{proof ? proof.name : "Upload bukti…"}</span>
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          </div>
        </div>

        {/* Breakdown per tipe */}
        {farmerId && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Pembayaran per Tipe</h2>
            <div className="space-y-4">
              {(types || []).map((t) => {
                const max = outMap[t.id];
                const val = amounts[t.id] || 0;
                const err = max !== undefined && val > max;
                return (
                  <div key={t.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-slate-500 font-medium">Pembayaran {t.type_name} (Rp)</label>
                      <span className="text-xs text-slate-400">Outstanding: {max !== undefined ? formatRp(max) : "—"}</span>
                    </div>
                    <input
                      type="text" inputMode="numeric"
                      value={val ? val.toLocaleString("id-ID") : ""}
                      onChange={(e) => setAmount(t.id, parseNumber(e.target.value))}
                      placeholder="0"
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 transition-colors ${
                        err ? "border-red-300 bg-red-50 focus:ring-red-500/20" : "border-slate-200 focus:ring-emerald-500/20 focus:border-emerald-400"
                      }`}
                    />
                    {err && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />Melebihi outstanding ({formatRp(max!)})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total Pembayaran</span>
              <span className="text-xl font-bold text-emerald-700 font-mono">{formatRp(total)}</span>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-3 block">
            Catatan <span className="text-slate-400 font-normal normal-case">(Opsional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan…" rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none" />
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/prefinance/installment")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors">Batal</button>
          <button onClick={save} disabled={!isValid || saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />{saving ? "Menyimpan…" : "Simpan Cicilan"}
          </button>
        </div>
      </div>
    </div>
  );
}
