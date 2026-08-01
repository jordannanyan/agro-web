import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, FileText, Plus, Trash2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { EntityField } from "../../components/EntityField";

interface BudgetCode { id: number; code: string; }
interface Unit { id: number; unit_name: string; }
interface Sapropdi { id: number; sapropdi_name: string; }

interface Item {
  key: string;
  budget_code_id: string;
  sapropdi_id: string;
  description: string;
  unit_id: string;
  quantity: string;
  unit_cost: string;
}

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const newItem = (): Item => ({ key: Math.random().toString(36).slice(2), budget_code_id: "", sapropdi_id: "", description: "", unit_id: "", quantity: "", unit_cost: "" });

export default function PurchaseRequestCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { data: budgetCodes } = useApi<BudgetCode[]>("budget-codes");
  const { data: units } = useApi<Unit[]>("units");
  const { data: sapropdi } = useApi<Sapropdi[]>("sapropdi");

  const [entityId, setEntityId] = useState("");
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10));
  const [dateRequired, setDateRequired] = useState("");
  const [items, setItems] = useState<Item[]>([newItem()]);
  const [saving, setSaving] = useState(false);

  // Edit mode: load existing PR into the form.
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const pr = await api.get<any>(`purchase-requests/${id}`);
        setEntityId(String(pr.entity_id ?? ""));
        if (pr.request_date) setRequestDate(String(pr.request_date).slice(0, 10));
        setDateRequired(pr.date_required ? String(pr.date_required).slice(0, 10) : "");
        if (Array.isArray(pr.items) && pr.items.length) {
          setItems(pr.items.map((it: any) => ({
            key: Math.random().toString(36).slice(2),
            budget_code_id: it.budget_code_id ? String(it.budget_code_id) : "",
            sapropdi_id: it.sapropdi_id ? String(it.sapropdi_id) : "",
            description: it.description ?? "",
            unit_id: it.unit_id ? String(it.unit_id) : "",
            quantity: String(it.quantity ?? ""),
            unit_cost: String(it.unit_cost ?? ""),
          })));
        }
      } catch { /* ignore */ }
    })();
  }, [id]);

  const grandTotal = useMemo(
    () => items.reduce((s, it) => s + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0), 0),
    [items]
  );

  function updateItem(key: string, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  }

  async function submit(status: "Draft" | "Pending") {
    if (!entityId) { toast.error("Pilih entitas"); return; }
    const validItems = items.filter((it) => it.description.trim() && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) { toast.error("Tambahkan minimal 1 item dengan deskripsi & qty"); return; }
    const payload = {
      entity_id: Number(entityId),
      request_date: requestDate,
      date_required: dateRequired || null,
      status,
      items: validItems.map((it) => ({
        budget_code_id: it.budget_code_id ? Number(it.budget_code_id) : null,
        sapropdi_id: it.sapropdi_id ? Number(it.sapropdi_id) : null,
        description: it.description,
        unit_id: it.unit_id ? Number(it.unit_id) : null,
        quantity: Number(it.quantity),
        unit_cost: Number(it.unit_cost) || 0,
      })),
    };
    setSaving(true);
    try {
      const res = isEdit
        ? await api.put<any>(`purchase-requests/${id}`, payload)
        : await api.post<any>("purchase-requests", payload);
      toast.success(status === "Draft" ? "PR disimpan sebagai draft" : "PR diajukan untuk approval");
      navigate(`/procurement/pr/${isEdit ? id : res.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan PR");
    } finally { setSaving(false); }
  }

  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/procurement/purchase-request")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><FileText className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg">{isEdit ? "Edit" : "Buat"} Purchase Request</h1><p className="text-slate-500 text-sm">Procurement → PR</p></div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-5xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi Umum</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <EntityField value={entityId} onChange={setEntityId} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Tanggal Request</label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Tanggal Dibutuhkan</label>
              <Input type="date" value={dateRequired} onChange={(e) => setDateRequired(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Item Permintaan</h2>
            <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, newItem()])}><Plus className="w-4 h-4 mr-1" />Tambah Item</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                  <th className="py-2 pr-3 font-semibold">Budget</th>
                  <th className="py-2 px-3 font-semibold">Saprodi</th>
                  <th className="py-2 px-3 font-semibold">Deskripsi *</th>
                  <th className="py-2 px-3 font-semibold">Unit</th>
                  <th className="py-2 px-3 font-semibold text-right">Qty *</th>
                  <th className="py-2 px-3 font-semibold text-right">Harga Satuan</th>
                  <th className="py-2 px-3 font-semibold text-right">Total</th>
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const total = (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_cost) || 0);
                  return (
                    <tr key={it.key} className="border-b border-slate-50">
                      <td className="py-2 pr-3 w-32"><select value={it.budget_code_id} onChange={(e) => updateItem(it.key, "budget_code_id", e.target.value)} className={selectCls}><option value="">—</option>{(budgetCodes || []).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}</select></td>
                      <td className="py-2 px-3 w-40"><select value={it.sapropdi_id} onChange={(e) => { updateItem(it.key, "sapropdi_id", e.target.value); const s = (sapropdi || []).find((x) => String(x.id) === e.target.value); if (s && !it.description) updateItem(it.key, "description", s.sapropdi_name); }} className={selectCls}><option value="">—</option>{(sapropdi || []).map((s) => <option key={s.id} value={s.id}>{s.sapropdi_name}</option>)}</select></td>
                      <td className="py-2 px-3 min-w-[180px]"><Input value={it.description} onChange={(e) => updateItem(it.key, "description", e.target.value)} placeholder="Deskripsi item" /></td>
                      <td className="py-2 px-3 w-28"><select value={it.unit_id} onChange={(e) => updateItem(it.key, "unit_id", e.target.value)} className={selectCls}><option value="">—</option>{(units || []).map((u) => <option key={u.id} value={u.id}>{u.unit_name}</option>)}</select></td>
                      <td className="py-2 px-3 w-24"><Input type="number" value={it.quantity} onChange={(e) => updateItem(it.key, "quantity", e.target.value)} className="text-right" placeholder="0" /></td>
                      <td className="py-2 px-3 w-32"><Input type="number" value={it.unit_cost} onChange={(e) => updateItem(it.key, "unit_cost", e.target.value)} className="text-right" placeholder="0" /></td>
                      <td className="py-2 px-3 text-right text-sm font-mono text-slate-700 whitespace-nowrap">{fmtRp(total)}</td>
                      <td className="py-2 pl-3">{items.length > 1 && <button onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Grand Total</span>
            <span className="text-xl font-bold text-slate-900 font-mono">{fmtRp(grandTotal)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/procurement/purchase-request")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => submit("Draft")} disabled={saving}><Save className="w-4 h-4 mr-2" />Simpan Draft</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => submit("Pending")} disabled={saving}><Send className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Ajukan Approval"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
