import { useRef, useState } from "react";
import { Paperclip, Upload, Trash2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "../lib/api";
import { useApi } from "../lib/hooks";
import { Button } from "./ui/button";

interface Attachment { id: number; category: string | null; subcategory: string | null; file_path: string; created_at: string | null; }

export function DocumentAttachments({ docType, docId, categories }: {
  docType: "PR" | "PO" | "PayReq" | "Reimbursement";
  docId: number;
  categories?: string[];
}) {
  const { data, loading, refetch } = useApi<Attachment[]>(docId ? `documents/${docType}/${docId}/attachments` : null, undefined, [docId]);
  const [category, setCategory] = useState(categories?.[0] || "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Several at once. A reimbursement arrives as a stack — the signed farmer list,
  // a photo of each receipt, the transfer slip — and one round trip per file is how
  // people end up attaching three of the five.
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const form = new FormData();
    for (const f of files) form.append("files", f);
    if (category) form.append("category", category);
    setUploading(true);
    try {
      await api.upload(`documents/${docType}/${docId}/attachments`, form);
      toast.success(files.length > 1 ? `${files.length} lampiran diunggah` : "Lampiran diunggah");
      refetch();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: number) {
    if (!confirm("Hapus lampiran ini?")) return;
    try { await api.del(`documents/${docType}/${docId}/attachments/${id}`); toast.success("Dihapus"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal menghapus"); }
  }

  const rows = data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-slate-900 font-semibold flex items-center gap-2"><Paperclip className="w-4 h-4 text-slate-400" />Lampiran</h2>
        <div className="flex items-center gap-2">
          {categories && categories.length > 0 && (
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-1.5" />{uploading ? "Mengunggah…" : "Upload"}
          </Button>
          <input ref={fileRef} type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={onFile} />
        </div>
      </div>

      {loading && <p className="text-sm text-slate-400">Memuat…</p>}
      {!loading && rows.length === 0 && <p className="text-sm text-slate-400">Belum ada lampiran.</p>}
      <div className="space-y-2">
        {rows.map((a) => {
          const name = a.file_path.split("/").pop() || "file";
          return (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center"><FileText className="w-4 h-4 text-slate-500" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{name}</p>
                <p className="text-xs text-slate-400">{a.category || "Umum"}{a.created_at ? ` · ${a.created_at}` : ""}</p>
              </div>
              <a href={fileUrl(a.file_path)} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-emerald-600" title="Buka"><Download className="w-4 h-4" /></a>
              <button onClick={() => remove(a.id)} className="p-2 text-slate-400 hover:text-red-600" title="Hapus"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
