// Detail stok opname — apa yang dihitung, apa kata sistem waktu itu, dan selisihnya.
//
// Angka "Sistem" di sini adalah POTRET, bukan angka stok hari ini. Itu yang membuat
// dokumennya tetap berarti berbulan-bulan kemudian: kalau ia dihitung ulang saat
// dibaca, selisihnya akan berubah sendiri setiap ada barang masuk, dan sebuah
// hitungan fisik bulan lalu jadi tidak mengatakan apa-apa.
//
// Menyesuaikan stok butuh persetujuan Project Manager PT pemilik gudang
// (2026-10-22): petugas mengajukan, PM menyetujui — dan saat itulah stok berubah —
// atau menolak dengan alasan. Yang ditolak bisa dibetulkan di sini lalu diajukan lagi.

import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, ClipboardCheck, CalendarClock, TriangleAlert, Lock, Send, CheckCircle2, XCircle,
  Pencil, Save, X, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canWriteOperations, ROLE } from "../../lib/permissions";
import { refreshInbox } from "../../lib/inbox";
import { DocumentAttachments } from "../../components/DocumentAttachments";

const num = (n: number) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 });
const fmtDate = (d: string | null) => (d ? String(d).slice(0, 10) : "—");
const fmtTime = (d: string | null) => (d ? String(d).slice(0, 16).replace("T", " ") : "—");

type Approval = "Draft" | "Pending" | "Approved" | "Rejected";

interface Line {
  id: number;
  sapropdi_id: number;
  sapropdi_name: string | null;
  category: string | null;
  unit_name: string | null;
  unit_id: number | null;
  system_qty: number;
  counted_qty: number;
  variance: number;
  /** Terisi hanya kalau opname ini dipakai untuk menyesuaikan stok. */
  adjustment: number | null;
  remarks: string | null;
}

interface Detail {
  id: number;
  opname_number: string;
  opname_date: string;
  warehouse_name: string | null;
  entity_id: number | null;
  entity_name: string | null;
  counted_by_name: string | null;
  notes: string | null;
  line_count: number;
  variance_lines: number;
  variance_total: number;
  applied_at: string | null;
  applied_by_name: string | null;
  approval_status: Approval;
  submitted_by_name: string | null;
  submitted_at: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  lines: Line[];
}

const STATUS: Record<Approval, { label: string; cls: string }> = {
  Draft:    { label: "Dicatat", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  Pending:  { label: "Menunggu persetujuan PM", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  Approved: { label: "Disetujui · stok disesuaikan", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  Rejected: { label: "Ditolak PM", cls: "bg-red-50 text-red-700 border-red-200" },
};

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
      <span className="text-xs text-slate-400 block">{label}</span>
      <span className={`font-mono font-bold text-lg ${tone || "text-slate-900"}`}>{value}</span>
    </div>
  );
}

export default function StockOpnameView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi<Detail>(id ? `stock-opname/${id}` : null, undefined, [id]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Record<number, { counted: string; remarks: string }> | null>(null);

  const status: Approval = data?.approval_status || (data?.applied_at ? "Approved" : "Draft");
  const applied = !!data?.applied_at;
  const mayWrite = canWriteOperations(user);
  // Same rule the API enforces: the PM of the warehouse's PT, Super Admin as break-glass.
  const mayReview = !!data && (
    user?.role_code === ROLE.SUPER_ADMIN
    || (user?.role_code === ROLE.PROJECT_MANAGER
        && (!!user?.role_cross_entity || Number(user?.entity_id) === Number(data.entity_id))));
  const editable = !applied && (status === "Draft" || status === "Rejected") && mayWrite;

  const lines = data?.lines || [];
  const diff = lines.filter((l) => Number(l.variance) !== 0);
  const total = Number(data?.variance_total || 0);

  async function act(path: string, body: any, okMsg: string) {
    if (!data) return;
    setBusy(true);
    try {
      const r = await api.postRaw<any>(`stock-opname/${data.id}/${path}`, body);
      toast.success(r?.message || okMsg);
      refetch();
      refreshInbox();
    } catch (e: any) {
      toast.error(e?.message || "Gagal");
    } finally { setBusy(false); }
  }

  function submit() {
    if (!confirm(`Ajukan penyesuaian stok ke Project Manager?\n\n${diff.length} barang berselisih. `
      + "Stok baru berubah setelah PM menyetujui.")) return;
    act("submit", {}, "Diajukan ke PM");
  }
  function approve() {
    // Sekali disetujui, dokumennya tidak bisa diubah atau dihapus lagi, dan angka
    // stok bersandar padanya. Itu harus disebut sebelum diklik, bukan sesudah.
    const note = prompt(
      `Setujui dan sesuaikan stok ${data?.warehouse_name || ""} agar sama dengan hitungan fisik?\n\n`
      + `${diff.length} barang akan berubah angkanya. Sesudah ini opname tidak bisa diubah atau dihapus.\n\n`
      + "Catatan (opsional):", "");
    if (note === null) return;
    act("approve", { note: note || null }, "Disetujui");
  }
  function reject() {
    const note = prompt("Alasan penolakan (wajib) — petugas gudang akan membacanya:", "");
    if (note === null) return;
    if (!note.trim()) { toast.error("Alasan penolakan wajib diisi"); return; }
    act("reject", { note }, "Ditolak");
  }

  function startEdit() {
    const m: Record<number, { counted: string; remarks: string }> = {};
    lines.forEach((l) => { m[l.id] = { counted: String(Number(l.counted_qty)), remarks: l.remarks || "" }; });
    setEditing(m);
  }
  async function saveEdit() {
    if (!data || !editing) return;
    for (const l of lines) {
      const v = Number(editing[l.id]?.counted);
      if (!Number.isFinite(v) || v < 0) { toast.error(`${l.sapropdi_name}: hasil hitung harus angka ≥ 0`); return; }
    }
    setBusy(true);
    try {
      await api.put(`stock-opname/${data.id}`, {
        lines: lines.map((l) => ({
          sapropdi_id: l.sapropdi_id, unit_id: l.unit_id,
          counted_qty: Number(editing[l.id].counted), remarks: editing[l.id].remarks || null,
        })),
      });
      toast.success("Hasil hitung diperbarui");
      setEditing(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally { setBusy(false); }
  }

  const th = "text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap";
  const thR = th.replace("text-left", "text-right");
  const inputCls = "w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={() => navigate("/warehouse/opname")} className="p-2 hover:bg-slate-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg font-mono">
              {data?.opname_number || "Stok Opname"}
            </h1>
            <p className="text-slate-500 text-sm">Gudang → Stok Opname</p>
          </div>
        </div>
        {data && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge className={`border ${STATUS[status].cls}`}>
              {status === "Approved" && <Lock className="w-3 h-3 mr-1 inline" />}
              {status === "Pending" && <Clock className="w-3 h-3 mr-1 inline" />}
              {STATUS[status].label}
            </Badge>
            {!applied && diff.length === 0 && (
              <Badge className="border bg-emerald-50 text-emerald-700 border-emerald-200">Catatan &amp; rak cocok</Badge>
            )}
            {editable && !editing && (
              <Button variant="outline" onClick={startEdit} disabled={busy}>
                <Pencil className="w-4 h-4 mr-2" />Ubah Hasil Hitung
              </Button>
            )}
            {editable && !editing && diff.length > 0 && (
              <Button className="bg-indigo-500 hover:bg-indigo-600 text-white" onClick={submit} disabled={busy}>
                <Send className="w-4 h-4 mr-2" />{status === "Rejected" ? "Ajukan Lagi ke PM" : "Ajukan Penyesuaian ke PM"}
              </Button>
            )}
            {status === "Pending" && mayReview && (
              <>
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={reject} disabled={busy}>
                  <XCircle className="w-4 h-4 mr-2" />Tolak
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={approve} disabled={busy}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Setujui &amp; Sesuaikan Stok
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {loading && <Card className="p-12 text-center text-sm text-slate-400">Memuat…</Card>}
      {error && <Card className="p-12 text-center text-sm text-red-500">{error}</Card>}

      {data && (
        <>
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Tanggal Hitung</span>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-800 font-medium">
                  <CalendarClock className="w-3.5 h-3.5 text-slate-400" />{fmtDate(data.opname_date)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Gudang</span>
                <span className="text-sm text-slate-800 font-medium">{data.warehouse_name || "—"}</span>
                {data.entity_name && <span className="text-xs text-slate-400 block">{data.entity_name}</span>}
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Dihitung oleh</span>
                <span className="text-sm text-slate-800 font-medium">{data.counted_by_name || "—"}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Catatan</span>
                <span className="text-sm text-slate-700">{data.notes || "—"}</span>
              </div>
            </div>
            {/* Jejak persetujuan: siapa mengajukan, siapa memutuskan, kapan. */}
            {(data.submitted_at || data.reviewed_at || data.review_note) && (
              <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-400 block">Diajukan</span>
                  {data.submitted_by_name || "—"}
                  <span className="block text-xs text-slate-400">{fmtTime(data.submitted_at)}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">
                    {status === "Rejected" ? "Ditolak oleh" : status === "Approved" ? "Disetujui oleh" : "Keputusan PM"}
                  </span>
                  {data.reviewed_by_name || (status === "Pending" ? "menunggu…" : "—")}
                  <span className="block text-xs text-slate-400">{data.reviewed_at ? fmtTime(data.reviewed_at) : ""}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Catatan PM</span>
                  <span className="text-slate-700">{data.review_note || "—"}</span>
                </div>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Stat label="Barang dihitung" value={String(data.line_count)} />
            <Stat label="Baris berselisih" value={String(diff.length)}
              tone={diff.length ? "text-amber-700" : "text-emerald-700"} />
            <Stat label="Total selisih" value={`${total > 0 ? "+" : ""}${num(total)}`}
              tone={total === 0 ? "text-slate-400" : total > 0 ? "text-emerald-700" : "text-red-600"} />
          </div>

          {status === "Approved" ? (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-sky-50 border border-sky-200">
              <Lock className="w-4 h-4 text-sky-600 mt-0.5 shrink-0" />
              <p className="text-sm text-sky-800">
                Stok <strong>sudah disesuaikan</strong>
                {data.reviewed_by_name ? ` atas persetujuan ${data.reviewed_by_name}`
                  : data.applied_by_name ? ` oleh ${data.applied_by_name}` : ""}
                {data.applied_at ? ` pada ${String(data.applied_at).slice(0, 10)}` : ""}.
                Kolom Penyesuaian adalah angka yang benar-benar ditambahkan ke stok — itulah yang membuat
                sisa stok di Inventory berbeda dari Total Masuk − Total Keluar.
                Dokumen ini tidak bisa diubah atau dihapus lagi.
              </p>
            </div>
          ) : status === "Pending" ? (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">
                Menunggu persetujuan <strong>Project Manager {data.entity_name || ""}</strong>. Stok belum berubah;
                ia disesuaikan saat PM menyetujui. Selama menunggu, hasil hitung tidak bisa diubah.
              </p>
            </div>
          ) : status === "Rejected" ? (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-800">
                <strong>Ditolak PM</strong>{data.review_note ? `: “${data.review_note}”` : ""}. Betulkan hasil hitung
                bila perlu, lalu ajukan lagi. Stok tidak berubah.
              </p>
            </div>
          ) : diff.length > 0 ? (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <TriangleAlert className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-sm text-indigo-800">
                Selisih di bawah <strong>belum mengubah angka stok</strong>. Kalau hitungan fisiknya yang benar,
                pilih <strong>Ajukan Penyesuaian ke PM</strong> — stok dibetulkan setelah Project Manager menyetujui.
                Kalau sebab selisihnya sudah diketahui, lebih baik dibetulkan lewat Stock In / Stock Out.
              </p>
            </div>
          ) : null}

          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-slate-900 font-semibold">Hasil Hitung</h2>
                <p className="text-sm text-slate-500">
                  Kolom Sistem adalah angka saat dihitung, bukan angka hari ini.
                </p>
              </div>
              {editing && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}><X className="w-4 h-4 mr-1" />Batal</Button>
                  <Button className="bg-indigo-500 hover:bg-indigo-600 text-white" onClick={saveEdit} disabled={busy}>
                    <Save className="w-4 h-4 mr-1" />Simpan
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className={th}>Barang</th>
                    <th className={th}>Satuan</th>
                    <th className={thR}>Sistem</th>
                    <th className={thR}>Fisik</th>
                    <th className={thR}>Selisih</th>
                    {applied && <th className={thR}>Penyesuaian</th>}
                    <th className={th}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const counted = editing ? Number(editing[l.id]?.counted) || 0 : Number(l.counted_qty);
                    const v = counted - Number(l.system_qty);
                    return (
                      <tr key={l.id} className={`border-b border-slate-50 ${v !== 0 ? "bg-amber-50/40" : ""}`}>
                        <td className="py-3 px-4 text-sm text-slate-800">
                          {l.sapropdi_name || "—"}
                          {l.category && <span className="block text-xs text-slate-400">{l.category}</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500">{l.unit_name || "—"}</td>
                        <td className={`py-3 px-4 text-sm text-right font-mono ${
                          Number(l.system_qty) < 0 ? "text-red-600" : "text-slate-600"}`}>
                          {num(l.system_qty)}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono text-slate-900">
                          {editing ? (
                            <input type="number" min={0} step="any" className={inputCls} value={editing[l.id]?.counted ?? ""}
                              onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], counted: e.target.value } })} />
                          ) : num(l.counted_qty)}
                        </td>
                        <td className={`py-3 px-4 text-sm text-right font-mono font-semibold ${
                          v === 0 ? "text-emerald-600" : v > 0 ? "text-emerald-700" : "text-red-600"}`}>
                          {v > 0 ? "+" : ""}{num(v)}
                        </td>
                        {applied && (
                          <td className="py-3 px-4 text-sm text-right font-mono text-sky-700">
                            {l.adjustment == null ? "—"
                              : `${Number(l.adjustment) > 0 ? "+" : ""}${num(Number(l.adjustment))}`}
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm text-slate-500">
                          {editing ? (
                            <input className="w-full border border-slate-200 rounded-lg px-2 py-1 text-sm" value={editing[l.id]?.remarks ?? ""}
                              onChange={(e) => setEditing({ ...editing, [l.id]: { ...editing[l.id], remarks: e.target.value } })} />
                          ) : (l.remarks || "—")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {lines.length === 0 && (
                <div className="p-12 text-center text-sm text-slate-400">Tidak ada baris.</div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <DocumentAttachments docType="StockOpname" docId={data.id}
              categories={["Lembar Hitung", "Foto Rak", "Lainnya"]} />
          </Card>
        </>
      )}
    </div>
  );
}
