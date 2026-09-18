// Picking the files a document cannot be submitted without.
//
// Attachments hang off a document that already exists, so on a new document there
// is nowhere to put one until it has been saved. That leaves two options: refuse
// the submit and make people save a draft, upload, come back and submit — or hold
// the files here and do those three steps for them. This is the second.
//
// The rule itself lives in the API (documents.ts::requireAttachment), which refuses
// any document entering the approval chain with nothing attached. This component
// only keeps somebody from meeting that refusal after they have filled in a form.

import { useRef } from "react";
import { Paperclip, X, FileText } from "lucide-react";
import { api } from "../lib/api";

export interface PickedFiles {
  files: File[];
  setFiles: (f: File[]) => void;
}

/**
 * Send held files to a document that now exists.
 *
 * Returns nothing and throws on failure — the caller is mid-submit and has to know,
 * because a document left Draft with no attachment is exactly what the rule is for.
 */
export async function uploadPicked(
  docType: string,
  docId: number | string,
  files: File[],
  category?: string,
): Promise<void> {
  if (!files.length) return;
  const form = new FormData();
  for (const f of files) form.append("files", f);
  if (category) form.append("category", category);
  await api.upload(`documents/${docType}/${docId}/attachments`, form);
}

export function RequiredAttachments({
  files,
  setFiles,
  existingCount = 0,
  hint,
}: PickedFiles & {
  /** Attachments the document already has — an edit does not have to re-upload. */
  existingCount?: number;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const satisfied = files.length > 0 || existingCount > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            Lampiran <span className="text-red-500">*</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            {hint || "Wajib diisi sebelum dokumen diajukan — yang menyetujui menandatangani sesuatu, bukan sekadar angka."}
            {" "}Format gambar atau PDF.
          </p>
        </div>
        <span className={`shrink-0 text-[11px] font-semibold px-2 py-1 rounded-full border ${
          satisfied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
          {satisfied ? "Sudah ada" : "Belum ada"}
        </span>
      </div>

      {existingCount > 0 && (
        <p className="text-xs text-slate-500 mb-2">
          {existingCount} lampiran sudah tersimpan pada dokumen ini. Tambahkan di bawah bila perlu.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          setFiles([...files, ...Array.from(e.target.files || [])]);
          // Clear it, or picking the same file twice in a row does nothing.
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 text-sm text-slate-600 hover:border-emerald-400 hover:text-emerald-700"
      >
        <Paperclip className="w-4 h-4" />Pilih berkas…
      </button>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-slate-400 shrink-0">{Math.max(1, Math.round(f.size / 1024))} KB</span>
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-600 shrink-0" title="Buang">
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
