import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, ShoppingCart, Plus, Trash2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface Vendor { id: number; vendor_name: string; }
interface BudgetCode { id: number; code: string; }
interface PROption { id: number; pr_number: string; entity_id: number; entity_name?: string | null; status: string; }
interface POItem { key: string; pr_item_id: number | null; description: string; order_qty: string; unit_price: string; }
interface Extra { key: string; description: string; amount: string; }

const rid = () => Math.random().toString(36).slice(2);

export default function PurchaseOrderCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { data: vendors } = useApi<Vendor[]>("vendors");
  const { data: budgetCodes } = useApi<BudgetCode[]>("budget-codes");
  const { data: prs } = useApi<PROption[]>("purchase-requests", { status: "Approved" });

  const [prId, setPrId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [budgetCodeId, setBudgetCodeId] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [terms, setTerms] = useState("");
  const [items, setItems] = useState<POItem[]>([{ key: rid(), pr_item_id: null, description: "", order_qty: "", unit_price: "" }]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [includeTax, setIncludeTax] = useState(false);
  const [taxRate, setTaxRate] = useState("11");
  const [saving, setSaving] = useState(false);

  // Shown instead of the removed picker: the entity of whichever PR is selected.
  const prEntityName = (prs || []).find((p) => String(p.id) === prId)?.entity_name ?? "";

  const skipPrefill = useRef(false);

  // Edit mode: load existing PO into the form (skip PR auto-prefill).
  useEffect(() => {
    if (!id) return;
    skipPrefill.current = true;
    (async () => {
      try {
        const po = await api.get<any>(`purchase-orders/${id}`);
        setVendorId(String(po.vendor_id ?? ""));
        setPrId(po.purchase_request_id ? String(po.purchase_request_id) : "");
        setBudgetCodeId(po.budget_code_id ? String(po.budget_code_id) : "");
        if (po.order_date) setOrderDate(String(po.order_date).slice(0, 10));
        setDueDate(po.due_date ? String(po.due_date).slice(0, 10) : "");
        setTerms(po.payment_terms ?? "");
        setIncludeTax(!!po.is_tax_included);
        setTaxRate(String(po.tax_rate ?? "11"));
        if (Array.isArray(po.items)) setItems(po.items.map((it: any) => ({ key: rid(), pr_item_id: it.pr_item_id ?? null, description: it.pr_item_description ?? "Item", order_qty: String(it.order_qty ?? ""), unit_price: String(it.unit_price ?? "") })));
        if (Array.isArray(po.extra_costs)) setExtras(po.extra_costs.map((e: any) => ({ key: rid(), description: e.description ?? "", amount: String(e.amount ?? "") })));
      } catch { /* ignore */ }
    })();
  }, [id]);

  // When a PR is chosen, load its items as PO item candidates. The entity is not
  // copied into form state — the server reads it off the PR when saving.
  useEffect(() => {
    if (!prId) return;
    if (skipPrefill.current) { skipPrefill.current = false; return; }
    (async () => {
      try {
        const pr = await api.get<any>(`purchase-requests/${prId}`);
        if (Array.isArray(pr.items) && pr.items.length) {
          setItems(pr.items.map((it: any) => ({
            key: rid(), pr_item_id: it.id, description: it.description,
            order_qty: String(it.quantity ?? ""), unit_price: String(it.unit_cost ?? ""),
          })));
        }
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prId]);

  const itemsSubtotal = useMemo(() => items.reduce((s, it) => s + (parseFloat(it.order_qty) || 0) * (parseFloat(it.unit_price) || 0), 0), [items]);
  const extrasTotal = useMemo(() => extras.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0), [extras]);
  const subtotal = itemsSubtotal + extrasTotal;
  const tax = includeTax ? subtotal * ((parseFloat(taxRate) || 0) / 100) : 0;
  const grandTotal = subtotal + tax;

  const upd = (key: string, f: keyof POItem, v: string) => setItems((p) => p.map((it) => (it.key === key ? { ...it, [f]: v } : it)));
  const updExtra = (key: string, f: keyof Extra, v: string) => setExtras((p) => p.map((e) => (e.key === key ? { ...e, [f]: v } : e)));

  async function submit(status: "Draft" | "Pending") {
    if (!prId) { toast.error("Sumber PR wajib dipilih — entitas PO mengikuti PR"); return; }
    if (!vendorId) { toast.error("Vendor wajib dipilih"); return; }
    const validItems = items.filter((it) => parseFloat(it.order_qty) > 0);
    if (!validItems.length) { toast.error("Tambahkan minimal 1 item"); return; }
    const payload = {
      vendor_id: Number(vendorId),
      purchase_request_id: Number(prId),
      budget_code_id: budgetCodeId ? Number(budgetCodeId) : null,
      order_date: orderDate,
      due_date: dueDate || null,
      payment_terms: terms || null,
      is_tax_included: includeTax,
      tax_rate: Number(taxRate) || 0,
      status,
      items: validItems.map((it) => ({ pr_item_id: it.pr_item_id, order_qty: Number(it.order_qty), unit_price: Number(it.unit_price) || 0 })),
      extra_costs: extras.filter((e) => e.description || e.amount).map((e) => ({ description: e.description, amount: Number(e.amount) || 0 })),
    };
    setSaving(true);
    try {
      const res = isEdit ? await api.put<any>(`purchase-orders/${id}`, payload) : await api.post<any>("purchase-orders", payload);
      toast.success(status === "Draft" ? "PO disimpan draft" : "PO diajukan approval");
      navigate(`/procurement/po/${isEdit ? id : res.id}`);
    } catch (e: any) { toast.error(e?.message || "Gagal menyimpan PO"); }
    finally { setSaving(false); }
  }

  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/procurement/purchase-order")} className="p-2 hover:bg-slate-100 rounded-lg"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center"><ShoppingCart className="w-4 h-4 text-white" /></div>
            <div><h1 className="text-slate-900 font-semibold text-lg">{isEdit ? "Edit" : "Buat"} Purchase Order</h1><p className="text-slate-500 text-sm">Procurement → PO</p></div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-5xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi Umum</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Sumber PR <span className="text-red-500">*</span></label>
              <select value={prId} onChange={(e) => setPrId(e.target.value)} className={selectCls}>
                <option value="">Pilih PR…</option>
                {(prs || []).map((p) => <option key={p.id} value={p.id}>{p.pr_number}{p.entity_name ? ` · ${p.entity_name}` : ""}</option>)}
              </select>
            </div>
            {/* Both routes into a PO start at a PR, so the PR settles which PT is
                buying. Offering the choice again only invited the two to disagree. */}
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Entitas</label>
              <div className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm bg-slate-50 text-slate-700 truncate">
                {prEntityName || <span className="text-slate-400">mengikuti PR yang dipilih</span>}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Vendor <span className="text-red-500">*</span></label>
              <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={selectCls}>
                <option value="">Pilih…</option>{(vendors || []).map((v) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Budget Code</label>
              <select value={budgetCodeId} onChange={(e) => setBudgetCodeId(e.target.value)} className={selectCls}>
                <option value="">—</option>{(budgetCodes || []).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">Tanggal Order</label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
            <div><label className="text-xs text-slate-500 font-medium mb-1.5 block">Jatuh Tempo</label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="col-span-3"><label className="text-xs text-slate-500 font-medium mb-1.5 block">Termin Pembayaran</label><Input value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="mis. Net 30" /></div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Item</h2>
            <Button size="sm" variant="outline" onClick={() => setItems((p) => [...p, { key: rid(), pr_item_id: null, description: "", order_qty: "", unit_price: "" }])}><Plus className="w-4 h-4 mr-1" />Item</Button>
          </div>
          <table className="w-full">
            <thead><tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <th className="py-2 pr-3 font-semibold">Deskripsi</th><th className="py-2 px-3 font-semibold text-right">Qty</th><th className="py-2 px-3 font-semibold text-right">Harga</th><th className="py-2 px-3 font-semibold text-right">Total</th><th />
            </tr></thead>
            <tbody>
              {items.map((it) => {
                const total = (parseFloat(it.order_qty) || 0) * (parseFloat(it.unit_price) || 0);
                return (
                  <tr key={it.key} className="border-b border-slate-50">
                    <td className="py-2 pr-3"><Input value={it.description} onChange={(e) => upd(it.key, "description", e.target.value)} placeholder="Deskripsi" /></td>
                    <td className="py-2 px-3 w-28"><Input type="number" className="text-right" value={it.order_qty} onChange={(e) => upd(it.key, "order_qty", e.target.value)} placeholder="0" /></td>
                    <td className="py-2 px-3 w-32"><Input type="number" className="text-right" value={it.unit_price} onChange={(e) => upd(it.key, "unit_price", e.target.value)} placeholder="0" /></td>
                    <td className="py-2 px-3 text-right text-sm font-mono text-slate-700 whitespace-nowrap">{fmtRp(total)}</td>
                    <td className="py-2 pl-3">{items.length > 1 && <button onClick={() => setItems((p) => p.filter((x) => x.key !== it.key))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Extra costs + tax */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Biaya Tambahan (freight / handling)</h2>
            <Button size="sm" variant="outline" onClick={() => setExtras((p) => [...p, { key: rid(), description: "", amount: "" }])}><Plus className="w-4 h-4 mr-1" />Biaya</Button>
          </div>
          {extras.length === 0 && <p className="text-sm text-slate-400 mb-4">Belum ada biaya tambahan.</p>}
          {extras.map((e) => (
            <div key={e.key} className="flex items-center gap-3 mb-2">
              <Input value={e.description} onChange={(ev) => updExtra(e.key, "description", ev.target.value)} placeholder="Deskripsi biaya" className="flex-1" />
              <Input type="number" value={e.amount} onChange={(ev) => updExtra(e.key, "amount", ev.target.value)} placeholder="0" className="w-40 text-right" />
              <button onClick={() => setExtras((p) => p.filter((x) => x.key !== e.key))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}

          <div className="mt-4 border-t border-slate-100 pt-4 space-y-2 max-w-sm ml-auto text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal Item</span><span className="font-mono text-slate-700">{fmtRp(itemsSubtotal)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Biaya Tambahan</span><span className="font-mono text-slate-700">{fmtRp(extrasTotal)}</span></div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)} className="accent-emerald-500" />
                PPN <input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} disabled={!includeTax} className="w-14 border border-slate-200 rounded px-1.5 py-0.5 text-right text-xs disabled:bg-slate-50" />%
              </label>
              <span className="font-mono text-slate-700">{fmtRp(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-semibold text-slate-800">Grand Total</span><span className="font-mono font-bold text-emerald-700 text-base">{fmtRp(grandTotal)}</span></div>
          </div>
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/procurement/purchase-order")} className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => submit("Draft")} disabled={saving}><Save className="w-4 h-4 mr-2" />Simpan Draft</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => submit("Pending")} disabled={saving}><Send className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Ajukan Approval"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
