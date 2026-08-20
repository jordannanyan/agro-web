// Rekonsiliasi Pembayaran — the screen that settles payment requests.
//
// Finance transfers the money in the bank's own channel quoting the request's
// payment code, then brings the statement here. Every outgoing line is matched
// against the outstanding requests; the ones that agree on code *and* amount are
// marked Paid, and everything else is shown rather than swallowed.
//
// The upload is two steps on purpose. A preview that writes nothing lets somebody
// see exactly which payments a file will settle before it settles them — asking
// people to trust a parser they cannot inspect is how reconciliation stops being
// checked at all.

import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, HelpCircle, Copy, Check,
  Clock, History, ArrowRight, X, Banknote, Lock, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { refreshInbox } from "../../lib/inbox";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

// ── Verdicts ──────────────────────────────────────────────────────────────────
// The wording matters more than usual here: each of these is a different thing to
// do next, and a person scanning forty rows should not have to work out which.
const VERDICT: Record<string, { label: string; hint: string; cls: string; icon: any; group: "paid" | "exception" | "quiet" }> = {
  matched:          { label: "Cocok",            hint: "Kode dan nominal sama persis → jadi Paid",              cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, group: "paid" },
  matched_with_fee: { label: "Cocok (ada biaya)", hint: "Selisih kecil dianggap biaya transfer → jadi Paid",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, group: "paid" },
  amount_mismatch:  { label: "Selisih nominal",  hint: "Kode dikenal tetapi jumlahnya berbeda — perlu diperiksa", cls: "bg-red-50 text-red-700 border-red-200",            icon: AlertTriangle, group: "exception" },
  not_approved:     { label: "Mendahului approval", hint: "Uang keluar sebelum rantai approval selesai",        cls: "bg-red-50 text-red-700 border-red-200",            icon: AlertTriangle, group: "exception" },
  code_unknown:     { label: "Kode asing",       hint: "Format kode benar tetapi tidak pernah diterbitkan",      cls: "bg-amber-50 text-amber-700 border-amber-200",      icon: HelpCircle,   group: "exception" },
  no_code:          { label: "Tanpa kode",       hint: "Pengeluaran tanpa kode pembayaran di keterangan",        cls: "bg-slate-100 text-slate-600 border-slate-200",     icon: HelpCircle,   group: "quiet" },
  already_paid:     { label: "Sudah Paid",       hint: "Pembayaran ini sudah pernah direkonsiliasi",             cls: "bg-slate-100 text-slate-500 border-slate-200",     icon: Check,        group: "quiet" },
  duplicate:        { label: "Duplikat",         hint: "Baris yang sama sudah pernah diunggah",                  cls: "bg-slate-100 text-slate-500 border-slate-200",     icon: Check,        group: "quiet" },
  incoming:         { label: "Dana masuk",       hint: "Bukan pembayaran keluar",                                cls: "bg-sky-50 text-sky-600 border-sky-200",           icon: ArrowRight,   group: "quiet" },
};

interface Line {
  row_no: number | null;
  date: string | null;
  remark: string;
  amount_in: number;
  amount_out: number;
  detected_code: string | null;
  match_status: string;
  fee_amount: number;
  match_note: string | null;
  payment_request: { id: number; payreq_number: string; amount: number; status: string; entity_name: string | null } | null;
}

interface Summary {
  total_rows: number; outgoing: number; will_pay: number; mismatch: number;
  unmatched: number; duplicate: number; incoming: number; tolerance: number; paid?: number;
}

interface Analysis { file_name: string; summary: Summary; lines: Line[] }

interface Outstanding {
  id: number; payreq_number: string; payment_code: string | null; amount: number;
  beneficiary_name: string | null; bank_name: string | null; entity_name: string | null;
  estimated_pay_date: string | null; age_days: number;
}

interface ImportRow {
  id: number; file_name: string; uploaded_by_name: string | null; created_at: string;
  period_start: string | null; period_end: string | null; total_rows: number;
  paid_count: number; mismatch_count: number; unmatched_count: number; duplicate_count: number;
}

function VerdictBadge({ status }: { status: string }) {
  const v = VERDICT[status] ?? VERDICT.no_code;
  const Icon = v.icon;
  return (
    <span title={v.hint} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${v.cls}`}>
      <Icon className="w-3 h-3" />{v.label}
    </span>
  );
}

function Stat({ label, value, tone = "slate", sub }: { label: string; value: number | string; tone?: string; sub?: string }) {
  const tones: Record<string, string> = {
    slate: "text-slate-900", emerald: "text-emerald-600", red: "text-red-600", amber: "text-amber-600",
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-xl font-bold ${tones[tone] ?? tones.slate}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PaymentReconciliation() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"upload" | "outstanding" | "history">("upload");
  // Only for the encrypted exports the bank e-mails out. It is sent with the file
  // and never stored — not here, not on the server — so it has to be re-typed if
  // the same file is uploaded again.
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: outstanding, refetch: refetchOutstanding } =
    useApi<Outstanding[]>("bank-statements/outstanding");
  const { data: history, refetch: refetchHistory } = useApi<ImportRow[]>("bank-statements");

  const totalOutstanding = useMemo(
    () => (outstanding || []).reduce((s, o) => s + Number(o.amount || 0), 0), [outstanding]);

  function pick(f: File | null) {
    setFile(f);
    setAnalysis(null);
    setApplied(false);
  }

  async function preview() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      // Password before the file: multer fills req.body from the fields it has
      // already read, and this ordering keeps it available however it is consumed.
      if (password) form.append("password", password);
      form.append("file", file);
      setAnalysis(await api.upload<Analysis>("bank-statements/preview", form));
      setApplied(false);
    } catch (e: any) {
      toast.error(e?.message || "Gagal membaca file");
      setAnalysis(null);
    } finally { setBusy(false); }
  }

  async function apply() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      if (password) form.append("password", password);
      form.append("file", file);
      const res = await api.upload<Analysis & { id: number }>("bank-statements", form);
      setAnalysis(res);
      setApplied(true);
      toast.success(res.summary.paid
        ? `${res.summary.paid} payment request ditandai Paid`
        : "Tidak ada payment request yang cocok pada file ini");
      refetchOutstanding();
      refetchHistory();
      refreshInbox();
    } catch (e: any) {
      toast.error(e?.message || "Gagal memproses file");
    } finally { setBusy(false); }
  }

  const s = analysis?.summary;
  const grouped = useMemo(() => {
    const lines = analysis?.lines || [];
    // Exceptions first: they are the only rows that need a person. Everything the
    // machine settled reads as confirmation and can wait further down the page.
    const order: Record<string, number> = { exception: 0, paid: 1, quiet: 2 };
    return [...lines].sort((a, b) =>
      (order[VERDICT[a.match_status]?.group ?? "quiet"] ?? 2) - (order[VERDICT[b.match_status]?.group ?? "quiet"] ?? 2));
  }, [analysis]);

  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
      tab === t ? "bg-emerald-50 text-emerald-700" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`;

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Rekonsiliasi Pembayaran</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Payment request menjadi <span className="font-semibold">Paid</span> ketika transfernya terlihat di rekening
          koran — bukan ketika seseorang menandainya. Unggah file mutasi bank, sistem mencocokkan kode pembayaran di
          kolom keterangan beserta nominalnya.
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button className={tabCls("upload")} onClick={() => setTab("upload")}>Unggah & Cocokkan</button>
        <button className={tabCls("outstanding")} onClick={() => setTab("outstanding")}>
          Belum Terbayar{outstanding?.length ? ` (${outstanding.length})` : ""}
        </button>
        <button className={tabCls("history")} onClick={() => setTab("history")}>Riwayat Impor</button>
      </div>

      {/* ── Unggah ──────────────────────────────────────────────────────────── */}
      {tab === "upload" && (
        <>
          <Card className="p-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-emerald-300 transition-colors"
            >
              <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{file.name}</span>
                  <button onClick={() => pick(null)} className="p-1 hover:bg-slate-100 rounded" title="Hapus pilihan">
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 font-medium">Tarik file e-statement ke sini, atau pilih file</p>
                  <p className="text-xs text-slate-400 mt-1">.xlsx, .xlsm atau .csv — maksimal 10 MB</p>
                </>
              )}
              <input
                ref={fileRef} type="file" accept=".xlsx,.xlsm,.csv" className="hidden"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
              />
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1.5" />Pilih File
                </Button>
                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white"
                  disabled={!file || busy} onClick={preview}>
                  {busy && !applied ? "Membaca…" : "Periksa Kecocokan"}
                </Button>
              </div>

              {/* E-statement yang dikirim bank lewat email biasanya terkunci. Kolom
                  ini dibiarkan kosong untuk file biasa — bukan dua alur berbeda,
                  cukup satu yang menyesuaikan filenya. */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 flex-wrap">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <label className="text-xs text-slate-500">Password file</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="kosongkan bila tidak terkunci"
                    autoComplete="off"
                    className="w-64 border border-slate-200 rounded-lg pl-3 pr-9 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                    title={showPassword ? "Sembunyikan" : "Tampilkan"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-xs text-slate-400">dipakai sekali untuk membuka file, tidak disimpan</span>
              </div>
            </div>
          </Card>

          {s && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Stat label="Baris terbaca" value={s.total_rows} sub={`${s.outgoing} pengeluaran`} />
                <Stat label={applied ? "Ditandai Paid" : "Akan jadi Paid"} value={applied ? (s.paid ?? 0) : s.will_pay} tone="emerald" />
                <Stat label="Perlu diperiksa" value={s.mismatch} tone="red" sub="selisih / mendahului approval" />
                <Stat label="Tanpa pasangan" value={s.unmatched} tone="amber" sub="tanpa kode / kode asing" />
                <Stat label="Sudah pernah" value={s.duplicate} sub="duplikat atau sudah Paid" />
              </div>

              {!applied && (
                <Card className="p-4 flex items-center justify-between gap-4 border-emerald-200 bg-emerald-50/40">
                  <p className="text-sm text-slate-700">
                    {s.will_pay > 0
                      ? <>Belum ada yang diubah. Menerapkan file ini akan menandai <span className="font-bold">{s.will_pay} payment request</span> menjadi Paid.</>
                      : <>Tidak ada baris yang memenuhi syarat pelunasan pada file ini.</>}
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Toleransi biaya transfer: {fmtRp(s.tolerance)} per pembayaran.
                    </span>
                  </p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    disabled={busy || s.will_pay === 0} onClick={apply}>
                    <Banknote className="w-4 h-4 mr-1.5" />{busy ? "Memproses…" : "Terapkan & Tandai Paid"}
                  </Button>
                </Card>
              )}
              {applied && (
                <Card className="p-4 border-emerald-200 bg-emerald-50/60">
                  <p className="text-sm text-emerald-800 font-semibold">
                    File diterapkan — {s.paid ?? 0} payment request kini berstatus Paid.
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Baris yang perlu diperiksa tetap tersimpan di riwayat impor, jadi tidak hilang begitu halaman ditutup.
                  </p>
                </Card>
              )}

              <Card className="p-0">
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-slate-800 font-semibold">Hasil pencocokan per baris</h3>
                  <p className="text-xs text-slate-400">Yang perlu ditindak muncul di atas</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {["Tgl", "Keterangan Bank", "Kode", "Payment Request", "Keluar", "Status", "Catatan"].map((h) => (
                          <th key={h} className={`${h === "Keluar" ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map((l, i) => {
                        const group = VERDICT[l.match_status]?.group;
                        return (
                          <tr key={i} className={`border-b border-slate-50 ${group === "exception" ? "bg-red-50/40" : group === "quiet" ? "text-slate-400" : ""}`}>
                            <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">{l.date || "—"}</td>
                            <td className="py-3 px-4 text-sm text-slate-700 max-w-md"><span className="line-clamp-2">{l.remark}</span></td>
                            <td className="py-3 px-4 text-sm font-mono font-semibold text-slate-800 whitespace-nowrap">{l.detected_code || "—"}</td>
                            <td className="py-3 px-4 text-sm whitespace-nowrap">
                              {l.payment_request ? (
                                <button onClick={() => navigate(`/procurement/payreq/${l.payment_request!.id}`)}
                                  className="font-mono text-emerald-700 hover:underline">
                                  {l.payment_request.payreq_number}
                                </button>
                              ) : "—"}
                            </td>
                            <td className="py-3 px-4 text-sm text-right font-mono whitespace-nowrap">
                              {l.amount_out ? fmtRp(l.amount_out) : <span className="text-sky-600">{fmtRp(l.amount_in)} masuk</span>}
                            </td>
                            <td className="py-3 px-4"><VerdictBadge status={l.match_status} /></td>
                            <td className="py-3 px-4 text-xs text-slate-500 max-w-xs">{l.match_note || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}

      {/* ── Belum terbayar ──────────────────────────────────────────────────── */}
      {tab === "outstanding" && (
        <Card className="p-0">
          <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-slate-800 font-semibold">Disetujui, belum terlihat di rekening koran</h3>
              <p className="text-xs text-slate-400 max-w-2xl">
                Sisi lain dari rekonsiliasi: pembayaran yang sudah disetujui semua orang tetapi belum pernah
                ditransfer tidak meninggalkan jejak apa pun di bank — hanya daftar ini yang bisa menemukannya.
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-400">Total</p>
              <p className="text-lg font-bold text-slate-900 font-mono">{fmtRp(totalOutstanding)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["No. PayReq", "Kode Pembayaran", "Entitas", "Penerima", "Nominal", "Umur"].map((h) => (
                    <th key={h} className={`${h === "Nominal" ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(outstanding || []).map((o) => (
                  <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-sm">
                      <button onClick={() => navigate(`/procurement/payreq/${o.id}`)} className="font-mono text-emerald-700 hover:underline">
                        {o.payreq_number}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      {o.payment_code ? (
                        <button
                          onClick={() => { navigator.clipboard?.writeText(o.payment_code!); setCopied(o.payment_code); toast.success("Kode disalin"); setTimeout(() => setCopied(null), 2000); }}
                          className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-800 hover:text-emerald-700"
                          title="Salin untuk ditempel di keterangan transfer"
                        >
                          {o.payment_code}
                          {copied === o.payment_code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{o.entity_name || "—"}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{o.beneficiary_name || "—"}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-slate-900">{fmtRp(o.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${o.age_days >= 14 ? "text-red-600" : o.age_days >= 7 ? "text-amber-600" : "text-slate-500"}`}>
                        <Clock className="w-3 h-3" />{o.age_days ?? 0} hari
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(outstanding || []).length && (
            <div className="p-12 text-center text-slate-400 text-sm">Tidak ada pembayaran yang menggantung</div>
          )}
        </Card>
      )}

      {/* ── Riwayat ─────────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <Card className="p-0">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-slate-800 font-semibold flex items-center gap-2"><History className="w-4 h-4 text-slate-400" />Riwayat Impor</h3>
            <p className="text-xs text-slate-400">File yang diunggah tersimpan sebagai bukti di balik setiap pelunasan</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["File", "Periode", "Diunggah oleh", "Baris", "Paid", "Perlu diperiksa"].map((h) => (
                    <th key={h} className={`${["Baris", "Paid", "Perlu diperiksa"].includes(h) ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(history || []).map((h) => (
                  <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-sm text-slate-700">{h.file_name}</td>
                    <td className="py-3 px-4 text-sm text-slate-500 font-mono">{h.period_start || "?"} → {h.period_end || "?"}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{h.uploaded_by_name || "—"}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono">{h.total_rows}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-emerald-600">{h.paid_count}</td>
                    <td className="py-3 px-4 text-sm text-right font-mono text-red-600">{h.mismatch_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(history || []).length && (
            <div className="p-12 text-center text-slate-400 text-sm">Belum ada file yang diunggah</div>
          )}
        </Card>
      )}
    </div>
  );
}
