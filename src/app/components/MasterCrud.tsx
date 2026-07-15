import { useState } from "react";
import { Plus, Edit, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { useApi } from "../lib/hooks";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "switch" | "password";
  required?: boolean;
  options?: { value: any; label: string }[];
  placeholder?: string;
  hideInTable?: boolean;
  /** Custom table cell renderer. */
  cell?: (row: any) => React.ReactNode;
  /** Default value for new rows. */
  default?: any;
  colSpan?: 1 | 2;
}

interface Props {
  endpoint: string;
  title: string;
  fields: FieldDef[];
  /** Extra query for the list fetch. */
  query?: Record<string, any>;
  /** Disable create/edit/delete (read-only view). */
  readOnly?: boolean;
  emptyText?: string;
}

const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  if (field.type === "select") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        <option value="">{field.placeholder || "— pilih —"}</option>
        {(field.options || []).map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (field.type === "switch") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="accent-emerald-500 w-4 h-4" />
        <span className="text-sm text-slate-600">{value ? "Aktif" : "Nonaktif"}</span>
      </label>
    );
  }
  if (field.type === "textarea") {
    return <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={field.placeholder}
      className="w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />;
  }
  return <Input type={field.type === "number" ? "number" : field.type === "password" ? "password" : "text"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} />;
}

function EditModal({ fields, row, onClose, onSave }: { fields: FieldDef[]; row: any | null; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [form, setForm] = useState<any>(() => {
    const init: any = {};
    fields.forEach((f) => { init[f.name] = row ? row[f.name] : (f.default ?? (f.type === "switch" ? true : "")); });
    return init;
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    for (const f of fields) {
      if (f.required && (form[f.name] === "" || form[f.name] == null)) { toast.error(`${f.label} wajib diisi`); return; }
    }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch (e: any) { toast.error(e?.message || "Gagal menyimpan"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold">{row ? "Edit" : "Tambah"} Data</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 grid grid-cols-2 gap-4">
          {fields.filter((f) => !(f.type === "password" && row && false)).map((f) => (
            <div key={f.name} className={f.colSpan === 2 || f.type === "textarea" ? "col-span-2" : ""}>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">{f.label}{f.required && <span className="text-red-500"> *</span>}{f.type === "password" && row && <span className="text-slate-400 font-normal"> (kosongkan jika tidak diubah)</span>}</label>
              <FieldInput field={f} value={form[f.name]} onChange={(v) => setForm((p: any) => ({ ...p, [f.name]: v }))} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={submit} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MasterCrud({ endpoint, title, fields, query, readOnly, emptyText }: Props) {
  const { data, loading, error, refetch } = useApi<any[]>(endpoint, query);
  const [editing, setEditing] = useState<{ row: any | null } | null>(null);

  const cols = fields.filter((f) => !f.hideInTable);

  async function save(formData: any) {
    // Build payload: drop empty password on edit, coerce numbers/booleans.
    const payload: any = {};
    for (const f of fields) {
      let v = formData[f.name];
      if (f.type === "password" && (v === "" || v == null)) continue;
      if (f.type === "number" && v !== "" && v != null) v = Number(v);
      if (f.type === "switch") v = v ? 1 : 0;
      if (f.type === "select" && v === "") v = null;
      payload[f.name] = v;
    }
    if (editing?.row) {
      await api.put(`${endpoint}/${editing.row.id}`, payload);
      toast.success(`${title} diperbarui`);
    } else {
      await api.post(endpoint, payload);
      toast.success(`${title} ditambahkan`);
    }
    refetch();
  }

  async function del(id: number) {
    if (!confirm("Hapus data ini?")) return;
    try { await api.del(`${endpoint}/${id}`); toast.success("Dihapus"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal menghapus (mungkin sedang dipakai)"); }
  }

  function renderCell(f: FieldDef, row: any) {
    if (f.cell) return f.cell(row);
    const v = row[f.name];
    if (f.type === "switch") return <Badge className={`border ${v ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>{v ? "Aktif" : "Nonaktif"}</Badge>;
    if (f.type === "select" && f.options) return f.options.find((o) => String(o.value) === String(v))?.label ?? (v ?? "—");
    return v ?? "—";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-semibold">{title}</h3>
        {!readOnly && (
          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setEditing({ row: null })}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Tambah
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {cols.map((f) => <th key={f.name} className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">{f.label}</th>)}
              {!readOnly && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row) => (
              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                {cols.map((f) => <td key={f.name} className="py-3 px-4 text-sm text-slate-700">{renderCell(f, row)}</td>)}
                {!readOnly && (
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditing({ row })}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => del(row.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-10 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-10 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && (data || []).length === 0 && <div className="p-10 text-center text-slate-400 text-sm">{emptyText || "Belum ada data"}</div>}
      </div>

      {editing && <EditModal fields={fields} row={editing.row} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}
