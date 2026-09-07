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

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, HelpCircle, Copy, Check,
  Clock, History, ArrowRight, X, Banknote, Lock, Eye, EyeOff, ShieldCheck, ShieldAlert,
  Download, Landmark, Loader2,
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

interface Checks {
  container: {
    ok: boolean;
    kind: "encrypted-ooxml" | "plain-ooxml" | "legacy-xls" | "csv" | "unknown";
    encrypted: boolean;
    crypto_profile_ok: boolean;
    crypto: { cipher: string | null; chaining: string | null; hash: string | null; key_bits: number | null; spin_count: number | null; data_integrity: boolean } | null;
  };
  bank_identity: { ok: boolean; resaved: boolean; application: string | null; creator: string | null; title: string | null };
  account_number: string | null;
  account_known: boolean;
  totals: { ok: boolean; parsed_in: number; parsed_out: number; stated_in: number | null; stated_out: number | null };
  closing: { ok: boolean; computed: number | null; stated: number | null };
  balance_chain: { ok: boolean; breaks: number; first_break_row: number | null; checked: number };
  arithmetic_ok: boolean;
}

interface StatementInfo {
  account_number: string | null; period: string | null;
  opening_balance: number | null; closing_balance: number | null;
  total_in: number | null; total_out: number | null;
}

interface PolicyFinding {
  code: "container" | "crypto_profile" | "bank_identity" | "account" | "arithmetic" | "duplicate_file";
  level: "reject" | "warn";
  title: string;
  message: string;
}

/** The server's verdict on the file. The Apply button follows this, nothing else. */
interface Policy {
  ok: boolean;
  strict: boolean;
  findings: PolicyFinding[];
}

interface Analysis {
  file_name: string; summary: Summary; lines: Line[];
  statement?: StatementInfo; checks?: Checks; policy?: Policy;
}

/** How the file arrived, in the words a person would use for it. */
const CONTAINER_LABEL: Record<Checks["container"]["kind"], string> = {
  "encrypted-ooxml": "berkas terkunci password dari bank",
  "plain-ooxml": "workbook Excel biasa, tanpa password",
  "legacy-xls": "Excel format lama (.xls), tanpa password",
  csv: "CSV",
  unknown: "tidak dikenali",
};

/**
 * Where the file came from, as far as a file can say.
 *
 * Spelled out rather than reduced to a tick: nothing here proves the statement is
 * the bank's, and a green panel that implies otherwise would be worse than none.
 * What it does show is that the numbers inside agree with each other — which an
 * edited file cannot manage without a great deal of care.
 */
function ProvenancePanel({ checks, statement, policy }: { checks: Checks; statement?: StatementInfo; policy?: Policy }) {
  const accepted = policy ? policy.ok : checks.arithmetic_ok;
  const rejections = policy?.findings.filter((f) => f.level === "reject") ?? [];
  const warnings = policy?.findings.filter((f) => f.level === "warn") ?? [];
  const rows = [
    {
      ok: checks.container.ok,
      label: "Wadah file",
      detail: CONTAINER_LABEL[checks.container.kind]
        + (checks.container.crypto ? ` · ${checks.container.crypto.cipher}-${checks.container.crypto.key_bits}/${checks.container.crypto.hash}` : ""),
      note: checks.container.ok
        ? "Terkunci dengan parameter enkripsi yang dipakai Livin. Ini yang paling sulit ditiru tanpa sengaja: file yang pernah dibuka dan disimpan ulang tidak kembali seperti ini."
        : checks.container.kind === "encrypted-ooxml"
          ? "Terkunci, tetapi bukan dengan kunci buatan Livin — file ini dikunci ulang oleh aplikasi lain."
          : "E-statement Livin selalu terkunci password. File ini tidak.",
    },
    {
      ok: checks.bank_identity.ok,
      label: "Dibuat oleh",
      detail: checks.bank_identity.application || "File tidak menyebutkan aplikasi pembuatnya",
      note: checks.bank_identity.ok
        ? "Aplikasi pembuatnya adalah sistem e-statement bank. Penanda ini bisa dipalsukan orang yang tahu caranya, tapi tidak bertahan kalau file sekadar dibuka lalu disimpan."
        : checks.bank_identity.resaved
          ? `File mengaku terbitan ${checks.bank_identity.creator || "bank"}, tetapi terakhir disimpan oleh aplikasi lain — artinya pernah dibuka dan disimpan ulang, bukan file mentah dari bank.`
          : "Tidak ada penanda e-statement bank pada file ini.",
    },
    {
      ok: checks.account_known,
      label: "Nomor rekening",
      detail: checks.account_number || "tidak terbaca",
      note: checks.account_known ? undefined : "Rekening ini tidak ada dalam daftar rekening resmi.",
    },
    {
      ok: checks.totals.ok,
      label: "Total transaksi",
      detail: `masuk ${fmtRp(checks.totals.parsed_in)} · keluar ${fmtRp(checks.totals.parsed_out)}`,
      note: checks.totals.ok ? "Cocok dengan ringkasan yang dicetak bank di file yang sama." : "TIDAK cocok dengan ringkasan bank.",
    },
    {
      ok: checks.balance_chain.ok && checks.closing.ok,
      label: "Rantai saldo",
      detail: checks.balance_chain.ok
        ? `utuh di ${checks.balance_chain.checked} baris`
        : `putus di ${checks.balance_chain.breaks} baris (pertama baris ${checks.balance_chain.first_break_row})`,
      note: checks.balance_chain.ok
        ? "Saldo tiap baris runtut dari baris sebelumnya sampai saldo akhir."
        : "Nominal atau baris di file ini berubah setelah diterbitkan.",
    },
  ];

  return (
    <Card className={`p-5 ${accepted ? "border-slate-200" : "border-red-300 bg-red-50/50"}`}>
      <div className="flex items-start gap-2 mb-3">
        {accepted ? <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />}
        <div>
          <h3 className="text-slate-800 font-semibold text-sm">
            {!accepted
              ? "File ini akan ditolak"
              : warnings.length
                ? "Diterima, dengan catatan"
                : "File ini berkas mentah dari bank"}
          </h3>
          <p className="text-xs text-slate-500">
            {!accepted
              ? "Impor tidak bisa diterapkan selama alasan di bawah masih ada."
              : "Tidak ada cara membuktikan file benar-benar dari bank — spreadsheet tidak ditandatangani secara digital. Yang bisa diperiksa: file masih terkunci dengan kunci buatan bank, properti dokumen masih menyebut bank sebagai pembuatnya, dan angkanya saling cocok. Mengubah satu nominal memaksa pengubahnya memperbaiki seluruh kolom saldo dan empat angka ringkasan bank sekaligus, lalu mengunci ulang file dengan cara yang sama."}
            {statement?.period ? ` Periode: ${statement.period}.` : ""}
          </p>
        </div>
      </div>

      {/* The reasons first: they are what the person has to act on, and the
          per-check grid below only explains them. */}
      {rejections.map((f) => (
        <div key={f.code} className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Ditolak — {f.title}</span>
          </div>
          <p className="text-sm text-red-800 mt-0.5">{f.message}</p>
        </div>
      ))}
      {warnings.map((f) => (
        <div key={f.code} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 mb-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{f.title}</span>
          </div>
          <p className="text-sm text-amber-800 mt-0.5">{f.message}</p>
        </div>
      ))}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className={`rounded-xl px-3 py-2 border ${r.ok ? "bg-white border-slate-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-center gap-1.5">
              {r.ok ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
              <span className="text-xs font-semibold text-slate-700">{r.label}</span>
            </div>
            <p className="text-sm text-slate-800 mt-0.5 break-words">{r.detail}</p>
            {r.note && <p className={`text-xs mt-0.5 ${r.ok ? "text-slate-400" : "text-red-600 font-medium"}`}>{r.note}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}

interface Outstanding {
  id: number; payreq_number: string; payment_code: string | null; amount: number;
  beneficiary_name: string | null; bank_name: string | null; entity_name: string | null;
  estimated_pay_date: string | null; age_days: number;
  /** Reimbursements are chased from this same list — the link has to go elsewhere. */
  payreq_kind?: "Procurement" | "Reimbursement";
  kth_name?: string | null;
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

// ── Export ke Kopra ───────────────────────────────────────────────────────────
// The mirror image of the upload above. Instead of reading what the bank did, this
// writes what finance is asking it to do — and puts the payment code in the transfer
// remark, which is the whole reason the statement coming back can settle itself.

interface EntityRow { id: number; entities_name: string; bank_account_no?: string | null }

interface ExportLine {
  id: number; payreq_number: string; payment_code: string | null; payreq_kind: string;
  beneficiary_name: string | null; bank_account: string | null; bank_name: string | null;
  bank_code: string; method: string; service: string; amount: number;
}
interface ExportBlocker { id: number; payreq_number: string; reason: string }
interface DebitAccount {
  id: number; label: string; account_no: string; account_name: string | null;
}
interface ExportPreview {
  format: string; filename: string; transfer_date: string;
  debit_account: DebitAccount & { entity_id: number; entity_name: string };
  debit_accounts: DebitAccount[];
  bi_fast_limit: number; total: number; count: number;
  lines: ExportLine[];
  blockers: ExportBlocker[];
  already_exported: { id: number; payreq_number: string; exported_at: string }[];
}

const METHOD_HINT: Record<string, string> = {
  "In-House": "Sesama Mandiri",
  "BI FAST": "BI FAST",
  RTGS: "RTGS",
};

export default function PaymentReconciliation() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"export" | "upload" | "outstanding" | "history">("export");
  // Only for the encrypted exports the bank e-mails out. It is sent with the file
  // and never stored — not here, not on the server — so it has to be re-typed if
  // the same file is uploaded again.
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // ── Export state ───────────────────────────────────────────────────────────
  // A Consolidated file debits one account, so the entity is not a filter here but
  // part of what the file *is*: pick SNBS and you are making SNBS's transfer run.
  const { data: entities } = useApi<EntityRow[]>("entities");
  const [expEntity, setExpEntity] = useState<number | null>(null);
  // A PT runs several accounts — operational plus one per trading line — and which
  // one a transfer leaves from is not a detail. Blank means "the entity's default",
  // which the server resolves.
  const [expAccount, setExpAccount] = useState<number | null>(null);
  const [expFormat, setExpFormat] = useState<"csv" | "xlsx">("csv");
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expReexport, setExpReexport] = useState(false);
  const [expPreview, setExpPreview] = useState<ExportPreview | null>(null);
  const [expError, setExpError] = useState<string | null>(null);
  const [expBusy, setExpBusy] = useState(false);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());

  // Default to the first entity the signed-in user can actually export for.
  useEffect(() => {
    if (expEntity == null && entities?.length) setExpEntity(entities[0].id);
  }, [entities, expEntity]);

  const expQuery = useMemo(() => ({
    entity_id: expEntity ?? "",
    debit_account_id: expAccount ?? "",
    format: expFormat,
    transfer_date: expDate,
    reexport: expReexport ? 1 : "",
  }), [expEntity, expAccount, expFormat, expDate, expReexport]);

  async function loadPreview() {
    if (!expEntity) return;
    setExpBusy(true);
    setExpError(null);
    try {
      const data = await api.get<ExportPreview>("payment-requests/export/kopra/preview", expQuery);
      setExpPreview(data);
      // Follow the server's choice so the dropdown shows the account actually used,
      // rather than sitting blank while the file debits something.
      setExpAccount(data.debit_account.id);
      setExcluded(new Set());
    } catch (e: any) {
      setExpPreview(null);
      setExpError(e?.message || "Gagal menyiapkan export");
    } finally { setExpBusy(false); }
  }

  // The preview is the file: every control above it changes what would be
  // downloaded, so none of them may leave a stale list on screen.
  useEffect(() => {
    if (tab === "export" && expEntity) loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, expEntity, expAccount, expFormat, expDate, expReexport]);

  const included = useMemo(
    () => (expPreview?.lines || []).filter((l) => !excluded.has(l.id)), [expPreview, excluded]);
  const includedTotal = useMemo(
    () => included.reduce((sum, l) => sum + Number(l.amount || 0), 0), [included]);

  async function downloadKopra() {
    if (!expEntity || !included.length) return;
    setExpBusy(true);
    try {
      // The ids are always sent, even when nothing is excluded: the server re-plans
      // from them, so what is downloaded is exactly the set shown on screen.
      const { filename } = await api.download("payment-requests/export/kopra", {
        ...expQuery, ids: included.map((l) => l.id).join(","),
      });
      toast.success(`${included.length} transfer diexport — ${filename}`);
      // Re-read: the rows just downloaded are now stamped as exported, and the
      // outstanding list is what finance chases next.
      loadPreview();
      refetchOutstanding();
    } catch (e: any) {
      const blockers: ExportBlocker[] = e?.body?.data?.blockers || [];
      toast.error(blockers.length
        ? `${e.message} (${blockers.map((b) => b.payreq_number).join(", ")})`
        : e?.message || "Gagal membuat file");
    } finally { setExpBusy(false); }
  }

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
        <button className={tabCls("export")} onClick={() => setTab("export")}>Export Transfer Kopra</button>
        <button className={tabCls("upload")} onClick={() => setTab("upload")}>Unggah & Cocokkan</button>
        <button className={tabCls("outstanding")} onClick={() => setTab("outstanding")}>
          Belum Terbayar{outstanding?.length ? ` (${outstanding.length})` : ""}
        </button>
        <button className={tabCls("history")} onClick={() => setTab("history")}>Riwayat Impor</button>
      </div>

      {/* ── Unggah ──────────────────────────────────────────────────────────── */}
      {/* ── Export ke Kopra ─────────────────────────────────────────────────── */}
      {tab === "export" && (
        <>
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Landmark className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-slate-800 font-semibold">File transfer massal untuk Kopra by Mandiri</h3>
                <p className="text-xs text-slate-500 max-w-3xl">
                  Payment request yang sudah disetujui dikumpulkan menjadi satu file yang tinggal diunggah di Kopra.
                  Kode pembayaran ikut masuk ke kolom keterangan transfer, jadi mutasi yang kembali nanti bisa
                  melunasinya sendiri di tab <span className="font-semibold">Unggah &amp; Cocokkan</span>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Perusahaan</label>
                <select
                  value={expEntity ?? ""}
                  onChange={(e) => {
                    setExpEntity(Number(e.target.value) || null);
                    // The old account belongs to the old company. Clearing it lets the
                    // server pick the new company's default instead of refusing.
                    setExpAccount(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {(entities || []).map((e) => (
                    <option key={e.id} value={e.id}>{e.entities_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Rekening didebit</label>
                <select
                  value={expAccount ?? ""}
                  onChange={(e) => setExpAccount(Number(e.target.value) || null)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  disabled={!expPreview?.debit_accounts?.length}
                >
                  {(expPreview?.debit_accounts || []).map((a) => (
                    <option key={a.id} value={a.id}>{a.label} — {a.account_no}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Format</label>
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1">
                  {(["csv", "xlsx"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setExpFormat(f)}
                      className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        expFormat === f ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {expFormat === "csv"
                    ? "Multiple Transfer by File Upload — Consolidated"
                    : "Template KOPRA format baru (mendukung RTGS)"}
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal transfer</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs text-slate-600 pb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={expReexport}
                    onChange={(e) => setExpReexport(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Ikutkan yang sudah pernah diexport
                </label>
              </div>
            </div>

            {expPreview && (
              <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                <div>
                  <p className="text-[11px] text-slate-400">Rekening didebit</p>
                  <p className="text-sm font-mono font-semibold text-slate-800">{expPreview.debit_account.account_no}</p>
                  <p className="text-[11px] text-slate-500">{expPreview.debit_account.label}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Nama file</p>
                  <p className="text-sm font-mono text-slate-700">{expPreview.filename}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Jumlah transfer</p>
                  <p className="text-sm font-semibold text-slate-800">{included.length}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Total</p>
                  <p className="text-sm font-mono font-bold text-slate-900">{fmtRp(includedTotal)}</p>
                </div>
                <div className="ml-auto">
                  <Button
                    onClick={downloadKopra}
                    disabled={expBusy || !included.length}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {expBusy
                      ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      : <Download className="w-4 h-4 mr-2" />}
                    Unduh file {expFormat.toUpperCase()}
                  </Button>
                </div>
              </div>
            )}

            {expError && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">{expError}</p>
              </div>
            )}
          </Card>

          {/* Ditahan: setiap baris di sini adalah orang yang tidak akan menerima
              transfer kalau tidak diperbaiki dulu. */}
          {!!expPreview?.blockers.length && (
            <Card className="p-0 border-amber-200">
              <div className="p-4 border-b border-amber-100 bg-amber-50/60 rounded-t-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-900">
                  {expPreview.blockers.length} payment request belum bisa masuk file
                </h3>
              </div>
              <div className="divide-y divide-slate-50">
                {expPreview.blockers.map((b) => (
                  <div key={b.id} className="px-4 py-3 flex items-start gap-3">
                    <button
                      onClick={() => navigate(`/procurement/payreq/${b.id}`)}
                      className="font-mono text-sm text-emerald-700 hover:underline shrink-0"
                    >
                      {b.payreq_number}
                    </button>
                    <p className="text-sm text-slate-600">{b.reason}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!!expPreview?.already_exported.length && (
            <Card className="p-4 flex items-start gap-2">
              <History className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-600">
                {expPreview.already_exported.length} payment request sudah pernah masuk file transfer sebelumnya dan
                dilewati: <span className="font-mono">{expPreview.already_exported.map((r) => r.payreq_number).join(", ")}</span>.
                Centang “Ikutkan yang sudah pernah diexport” kalau memang perlu diulang.
              </p>
            </Card>
          )}

          <Card className="p-0">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-slate-800 font-semibold">Isi file</h3>
                <p className="text-xs text-slate-400">
                  Hilangkan centang untuk menunda satu transfer tanpa menahan yang lain.
                </p>
              </div>
              {expBusy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="w-10 py-3 px-4"></th>
                    {["No. PayReq", "Kode (keterangan transfer)", "Penerima", "Rekening tujuan", "Metode", "Nominal"].map((h) => (
                      <th key={h} className={`${h === "Nominal" ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(expPreview?.lines || []).map((l) => {
                    const on = !excluded.has(l.id);
                    return (
                      <tr key={l.id} className={`border-b border-slate-50 ${on ? "hover:bg-slate-50/50" : "opacity-40"}`}>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => setExcluded((prev) => {
                              const next = new Set(prev);
                              if (next.has(l.id)) next.delete(l.id); else next.add(l.id);
                              return next;
                            })}
                            className="rounded border-slate-300"
                          />
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => navigate(l.payreq_kind === "Reimbursement"
                              ? `/reimbursement/${l.id}` : `/procurement/payreq/${l.id}`)}
                            className="font-mono text-emerald-700 hover:underline"
                          >
                            {l.payreq_number}
                          </button>
                          {l.payreq_kind === "Reimbursement" && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-semibold uppercase tracking-wide">
                              petani
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-sm text-slate-800">{l.payment_code}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{l.beneficiary_name || "—"}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          <span className="font-mono">{l.bank_account}</span>
                          <span className="block text-xs text-slate-400">
                            {l.bank_name}{l.bank_code ? ` · ${l.bank_code}` : ""}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-600 text-xs font-semibold">
                            {METHOD_HINT[l.method] || l.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-mono font-semibold text-slate-900">{fmtRp(l.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!expBusy && !(expPreview?.lines || []).length && (
              <div className="p-12 text-center text-slate-400 text-sm">
                {expPreview?.blockers.length
                  ? "Semua payment request yang siap masih tertahan — lihat daftar di atas."
                  : "Tidak ada payment request yang siap ditransfer untuk perusahaan ini."}
              </div>
            )}
          </Card>
        </>
      )}

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

          {analysis?.checks && <ProvenancePanel checks={analysis.checks} statement={analysis.statement} policy={analysis.policy} />}

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
                    {analysis?.policy?.ok === false
                      ? <>File ini ditolak, jadi tidak ada yang akan diubah. Perbaiki alasan di atas — biasanya cukup dengan mengunduh ulang rekening koran dari Livin dan mengunggahnya apa adanya.</>
                      : s.will_pay > 0
                      ? <>Belum ada yang diubah. Menerapkan file ini akan menandai <span className="font-bold">{s.will_pay} payment request</span> menjadi Paid.</>
                      : <>Tidak ada baris yang memenuhi syarat pelunasan pada file ini.</>}
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Toleransi biaya transfer: {fmtRp(s.tolerance)} per pembayaran.
                    </span>
                  </p>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                    disabled={busy || s.will_pay === 0 || analysis?.policy?.ok === false} onClick={apply}>
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
                      <button
                        onClick={() => navigate(o.payreq_kind === "Reimbursement"
                          ? `/reimbursement/${o.id}` : `/procurement/payreq/${o.id}`)}
                        className="font-mono text-emerald-700 hover:underline">
                        {o.payreq_number}
                      </button>
                      {o.payreq_kind === "Reimbursement" && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded border border-teal-200 bg-teal-50 text-teal-700 text-[10px] font-semibold uppercase tracking-wide">
                          petani
                        </span>
                      )}
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
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {o.beneficiary_name || "—"}
                      {o.payreq_kind === "Reimbursement" && o.kth_name && (
                        <span className="block text-xs text-slate-400">{o.kth_name}</span>
                      )}
                    </td>
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
