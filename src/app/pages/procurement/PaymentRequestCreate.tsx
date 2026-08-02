import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CreditCard, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

interface BudgetCode { id: number; code: string; }
interface PROption { id: number; pr_number: string; entity_id: number; entity_name?: string | null; grand_total: number; }
interface POOption { id: number; po_number: string; entity_id: number; entity_name?: string | null; }

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function PaymentRequestCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { data: budgetCodes } = useApi<BudgetCode[]>("budget-codes");
  const { data: prs } = useApi<PROption[]>("purchase-requests", { status: "Approved" });
  const { data: pos } = useApi<POOption[]>("purchase-orders");

  const [sourceType, setSourceType] = useState<"PO" | "PR">("PO");
  const [prId, setPrId] = useState("");
  const [poId, setPoId] = useState("");
  const [budgetCodeId, setBudgetCodeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [pic, setPic] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [estPayDate, setEstPayDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [saving, setSaving] = useState(false);
  const skipAutofill = useRef(false);

  // Edit mode: load existing PayReq.
  useEffect(() => {
    if (!id) return;
    skipAutofill.current = true;
    (async () => {
      try {
        const p = await api.get<any>(`payment-requests/${id}`);
        const src = p.purchase_order_id ? "PO" : "PR";
        setSourceType(src as any);
        setPrId(p.purchase_request_id ? String(p.purchase_request_id) : "");
        setPoId(p.purchase_order_id ? String(p.purchase_order_id) : "");
        setBudgetCodeId(p.budget_code_id ? String(p.budget_code_id) : "");
        setAmount(String(p.amount ?? ""));
        setReason(p.reason ?? "");
        setPic(p.person_in_charge ?? "");
        setActivityDate(p.activity_date ? String(p.activity_date).slice(0, 10) : "");
        setEstPayDate(p.estimated_pay_date ? String(p.estimated_pay_date).slice(0, 10) : "");
        setBankName(p.bank_name ?? "");
        setBankAccount(p.bank_account ?? "");
        setBeneficiary(p.beneficiary_name ?? "");
      } catch { /* ignore */ }
    })();
  }, [id]);

  // The entity is the source document's and the server reads it there when saving,
  // so the form never holds it. Only the amount is prefilled, as a suggestion.
  useEffect(() => {
    if (skipAutofill.current) { skipAutofill.current = false; return; }
    if (sourceType === "PR" && prId && !amount) {
      const pr = (prs || []).find((p) => String(p.id) === prId);
      if (pr) setAmount(String(pr.grand_total ?? ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prId, poId, sourceType]);

  async function submit(status: "Draft" | "Pending") {
    if (sourceType === "PR" && !prId) { toast.error("Pilih PR sumber"); return; }
    if (sourceType === "PO" && !poId) { toast.error("Pilih PO sumber"); return; }
    if (!budgetCodeId) { toast.error("Project Code wajib diisi"); return; }
    if (!(Number(amount) > 0)) { toast.error("Nominal harus > 0"); return; }
    const payload: any = {
      purchase_request_id: sourceType === "PR" ? Number(prId) : null,
      purchase_order_id: sourceType === "PO" ? Number(poId) : null,
      budget_code_id: budgetCodeId ? Number(budgetCodeId) : null,
      amount: Number(amount),
      reason, person_in_charge: pic,
      activity_date: activityDate || null,
      estimated_pay_date: estPayDate || null,
      bank_name: bankName, bank_account: bankAccount, beneficiary_name: beneficiary,
      status,
    };
    setSaving(true);
    try {
      const res = isEdit ? await api.put<any>(`payment-requests/${id}`, payload) : await api.post<any>("payment-requests", payload);
      toast.success(status === "Draft" ? "PayReq disimpan draft" : "PayReq diajukan approval");
      navigate(`/procurement/payreq/${isEdit ? id : res.id}`);
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan PayReq"); }
    finally { setSaving(false); }
  }

  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";
  const label = "text-xs text-slate-500 font-medium mb-1.5 block";

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/procurement/payment-request")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center"><CreditCard className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg">{isEdit ? "Edit" : "Buat"} Payment Request</h1><p className="text-slate-500 text-sm">Procurement → PayReq</p></div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl mx-auto space-y-6">
        {/* Source */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Sumber Dokumen</h2>
          <div className="flex gap-2 mb-4">
            {(["PO", "PR"] as const).map((t) => (
              <label key={t} className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors ${sourceType === t ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="radio" checked={sourceType === t} onChange={() => setSourceType(t)} className="accent-emerald-500" />
                <span className="text-sm font-medium">{t === "PO" ? "Dari PO (Route B)" : "Langsung dari PR (Route A)"}</span>
              </label>
            ))}
          </div>
          {sourceType === "PR" ? (
            <div><label className={label}>Pilih PR <span className="text-red-500">*</span></label>
              <select value={prId} onChange={(e) => setPrId(e.target.value)} className={selectCls}><option value="">Pilih PR…</option>{(prs || []).map((p) => <option key={p.id} value={p.id}>{p.pr_number}{p.entity_name ? ` · ${p.entity_name}` : ""}</option>)}</select>
            </div>
          ) : (
            <div><label className={label}>Pilih PO <span className="text-red-500">*</span></label>
              <select value={poId} onChange={(e) => setPoId(e.target.value)} className={selectCls}><option value="">Pilih PO…</option>{(pos || []).map((p) => <option key={p.id} value={p.id}>{p.po_number}{p.entity_name ? ` · ${p.entity_name}` : ""}</option>)}</select>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Detail Pembayaran</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* No entity field: a PayReq always follows a PR or PO, which settles it,
                and the source dropdown above already prints that entity. */}
            <div><label className={label}>Project Code <span className="text-red-500">*</span></label>
              <select value={budgetCodeId} onChange={(e) => setBudgetCodeId(e.target.value)} className={selectCls}><option value="">— pilih —</option>{(budgetCodes || []).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</select>
            </div>
            <div><label className={label}>Nominal (Rp) <span className="text-red-500">*</span></label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></div>
            <div><label className={label}>Penanggung Jawab</label><Input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC" /></div>
            <div><label className={label}>Tanggal Kegiatan</label><Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} /></div>
            <div><label className={label}>Estimasi Bayar</label><Input type="date" value={estPayDate} onChange={(e) => setEstPayDate(e.target.value)} /></div>
            <div className="col-span-2"><label className={label}>Alasan / Keterangan</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Keterangan pembayaran…" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
            </div>
          </div>
        </div>

        {/* Bank */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Rekening Tujuan</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={label}>Bank</label><Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA / Mandiri" /></div>
            <div><label className={label}>No. Rekening</label><Input value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} placeholder="123456789" /></div>
            <div><label className={label}>Atas Nama</label><Input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Nama penerima" /></div>
          </div>
        </div>

        {Number(amount) > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white">
            <span className="text-sm font-medium">Nominal Pembayaran</span>
            <span className="text-lg font-bold font-mono">{fmtRp(Number(amount))}</span>
          </div>
        )}

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/procurement/payment-request")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => submit("Draft")} disabled={saving}><Save className="w-4 h-4 mr-2" />Simpan Draft</Button>
            <Button className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => submit("Pending")} disabled={saving}><Send className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Ajukan Approval"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
