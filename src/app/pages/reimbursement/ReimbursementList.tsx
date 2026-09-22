// Payment Request Reimbursement — semua pengajuan pembayaran yang tidak berasal
// dari procurement, pada satu daftar.
//
// Ada dua jenis, dan bedanya cuma siapa yang menerima uangnya:
//
//   Petani   — satu transfer ke rekening KTH, dengan daftar petani di baliknya.
//              Karena itu jumlah baris ditampilkan di sebelah nominal: angka besar
//              tanpa keterangan berapa orang di baliknya tidak bisa diperiksa.
//   Pribadi  — mengganti uang yang sudah ditalangi sendiri, dengan daftar struknya.
//
// Yang menandatangani keduanya sama persis — pengaju → Project Manager → Finance
// Manager → Direktur — dan begitu juga kode pembayaran dan rekonsiliasinya. Dulu
// keduanya berdiri di dua menu terpisah, dan yang mengisi harus mengingat sebuah
// dokumen dulu diajukan lewat menu yang mana. Sekarang satu menu, dan jenisnya
// menjadi kolom serta filter.
//
// Formulirnya tetap dua, karena barisnya memang dua hal yang berbeda: daftar petani
// dengan hari kerja, melawan daftar pengeluaran dengan struk.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  HandCoins, Plus, Search, Users, ArrowRight, Clock, CheckCircle2, AlertTriangle,
  Banknote, Receipt, ChevronDown,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canWriteOperations, canEditDocument, isEntityBound } from "../../lib/permissions";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

type Kind = "Reimbursement" | "Expense";

interface Row {
  id: number;
  payreq_number: string;
  payreq_kind: Kind;
  status: string;
  amount: number;
  line_count: number;
  kth_name: string | null;
  beneficiary_name: string | null;
  entity_name: string | null;
  reason: string | null;
  requested_by_name: string | null;
  requested_by_role: string | null;
  estimated_pay_date: string | null;
  released_pay_date: string | null;
  payment_code: string | null;
  pending_role_name: string | null;
  pending_role_code: string | null;
  pending_step_label: string | null;
  created_at: string | null;
}

const TABS = ["Semua", "Draft", "Pending", "Revision", "Approved", "Paid"] as const;

/** What each kind is called on screen, and where its pages live. */
const KIND = {
  Reimbursement: {
    label: "Petani",
    long: "Reimbursement Petani",
    hint: "Membayar petani · satu transfer ke rekening KTH",
    createPath: "/reimbursement/create",
    viewBase: "/reimbursement",
    tone: "bg-teal-50 text-teal-700 border-teal-200",
    icon: Users,
  },
  Expense: {
    label: "Pribadi",
    long: "Reimbursement Pribadi",
    hint: "Mengganti uang yang ditalangi sendiri · tanpa PR/PO",
    createPath: "/reimbursement/pribadi/create",
    viewBase: "/reimbursement/pribadi",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    icon: Receipt,
  },
} as const;

function statusStyle(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "approved") return "bg-sky-50 text-sky-700 border-sky-200";
  if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "revision") return "bg-violet-50 text-violet-700 border-violet-200";
  if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function Stat({ icon: Icon, label, value, sub, tone }: {
  icon: any; label: string; value: string; sub?: string; tone: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{label}</p>
          <p className="text-lg font-bold text-slate-900 truncate">{value}</p>
          {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function ReimbursementList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error } = useApi<Row[]>("reimbursements/claims");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Semua");
  const [kindTab, setKindTab] = useState<"Semua" | Kind>("Semua");
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  // HR and the other cross-entity roles see several PTs, so their rows have to say
  // which one each belongs to.
  const bound = isEntityBound(user);

  const rows = useMemo(() => {
    let list = data || [];
    if (kindTab !== "Semua") list = list.filter((r) => r.payreq_kind === kindTab);
    if (tab !== "Semua") list = list.filter((r) => r.status === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.payreq_number, r.kth_name, r.beneficiary_name, r.reason, r.requested_by_name]
          .some((v) => (v || "").toLowerCase().includes(q)));
    }
    return list;
  }, [data, tab, kindTab, search]);

  // The headline figures follow the kind filter: with "Petani" selected, "siap
  // dibayar" has to mean the farmer ones, or the number contradicts the list below it.
  const all = useMemo(
    () => (data || []).filter((r) => kindTab === "Semua" || r.payreq_kind === kindTab),
    [data, kindTab]);
  const waiting = all.filter((r) => r.status === "Pending" || r.status === "Revision");
  const readyToPay = all.filter((r) => r.status === "Approved");
  const paid = all.filter((r) => r.status === "Paid");
  const sum = (list: Row[]) => list.reduce((t, r) => t + Number(r.amount || 0), 0);
  const lines = (list: Row[]) => list.reduce((t, r) => t + Number(r.line_count || 0), 0);

  // Whoever may file one may see the button; the API is the real gate. Asked per
  // kind, because they are not the same permission — Procurement may file the
  // personal claim and not the farmer one.
  const mayFile = (kind: Kind) => canWriteOperations(user)
    && canEditDocument(user, kind, { status: "Draft", entity_id: null }, null);
  const creatable = (["Reimbursement", "Expense"] as Kind[]).filter(mayFile);

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8" onClick={() => menuOpen && setMenuOpen(false)}>
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <HandCoins className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg">Payment Request Reimbursement</h1>
            <p className="text-slate-500 text-sm">
              Penggantian ke petani lewat KTH, dan penggantian uang yang ditalangi sendiri
            </p>
          </div>

          {/* Satu tombol, dua jenis. Pilihannya ada di sini dan bukan di dalam
              formulir, karena begitu jenisnya dipilih isian dan aturannya memang
              berbeda — bukan sekadar satu kolom yang berubah. */}
          {creatable.length > 0 && (
            <div className="ml-auto relative" onClick={(e) => e.stopPropagation()}>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => {
                  if (creatable.length === 1) navigate(KIND[creatable[0]].createPath);
                  else setMenuOpen((v) => !v);
                }}>
                <Plus className="w-4 h-4 mr-1.5" />
                {creatable.length === 1 ? `Buat ${KIND[creatable[0]].long}` : "Buat Pengajuan"}
                {creatable.length > 1 && <ChevronDown className="w-4 h-4 ml-1.5" />}
              </Button>
              {menuOpen && creatable.length > 1 && (
                <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20">
                  {creatable.map((k) => {
                    const Icon = KIND[k].icon;
                    return (
                      <button key={k} onClick={() => { setMenuOpen(false); navigate(KIND[k].createPath); }}
                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <Icon className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-800">{KIND[k].long}</span>
                          <span className="block text-xs text-slate-400">{KIND[k].hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Clock} label="Menunggu approval" tone="bg-amber-50 text-amber-600"
            value={String(waiting.length)} sub={fmtRp(sum(waiting))} />
          <Stat icon={CheckCircle2} label="Siap dibayar" tone="bg-sky-50 text-sky-600"
            value={String(readyToPay.length)} sub={fmtRp(sum(readyToPay))} />
          <Stat icon={Banknote} label="Sudah dibayar" tone="bg-emerald-50 text-emerald-600"
            value={String(paid.length)} sub={fmtRp(sum(paid))} />
          <Stat icon={Users} label="Baris terbayar" tone="bg-slate-100 text-slate-600"
            value={String(lines(paid))} sub="petani / pengeluaran pada dokumen Paid" />
        </div>

        <Card className="p-0 overflow-hidden">
          {/* Jenis dulu, status kemudian: yang pertama menentukan dokumennya
              tentang apa, yang kedua sudah sampai mana. */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100">
            {(["Semua", "Reimbursement", "Expense"] as const).map((k) => (
              <button key={k} onClick={() => setKindTab(k)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  kindTab === k
                    ? "bg-teal-600 text-white border-teal-600"
                    : "text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                {k === "Semua" ? "Semua jenis" : KIND[k].long}
                <span className="ml-1.5 text-xs opacity-60">
                  {k === "Semua"
                    ? (data || []).length
                    : (data || []).filter((r) => r.payreq_kind === k).length}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-1 flex-wrap">
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                  {t}
                  {t !== "Semua" && (
                    <span className="ml-1.5 text-xs opacity-60">
                      {all.filter((r) => r.status === t).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nomor, KTH, penerima, pengaju…" className="pl-9 w-64" />
            </div>
          </div>

          {loading && <p className="px-5 py-12 text-center text-sm text-slate-400">Memuat…</p>}
          {error && <p className="px-5 py-12 text-center text-sm text-red-500">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <div className="px-5 py-16 text-center">
              <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada pengajuan pada filter ini.</p>
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-2.5 font-medium">Nomor</th>
                    <th className="px-5 py-2.5 font-medium">Jenis</th>
                    <th className="px-5 py-2.5 font-medium">Penerima</th>
                    <th className="px-5 py-2.5 font-medium">Diajukan oleh</th>
                    <th className="px-5 py-2.5 font-medium text-right">Baris</th>
                    <th className="px-5 py-2.5 font-medium text-right">Nominal</th>
                    <th className="px-5 py-2.5 font-medium">Status</th>
                    <th className="px-5 py-2.5 font-medium">Menunggu</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    // The row is tinted when it is this person's turn — the same cue
                    // the procurement lists use, so one habit works everywhere.
                    const mine = r.pending_role_code && r.pending_role_code === user?.role_code;
                    const kind = KIND[r.payreq_kind] || KIND.Reimbursement;
                    return (
                      <tr key={`${r.payreq_kind}-${r.id}`}
                        onClick={() => navigate(`${kind.viewBase}/${r.id}`)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          mine ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-3">
                          <p className="font-mono font-medium text-slate-800">{r.payreq_number}</p>
                          {/* Kode yang harus ditempel di keterangan transfer. Ada di
                              daftar karena finance membayar sambil membaca layar ini. */}
                          {r.payment_code && (
                            <p className="text-xs font-bold text-slate-500 tracking-wide"
                              title="Kode pembayaran untuk keterangan transfer">{r.payment_code}</p>
                          )}
                          {r.reason && <p className="text-xs text-slate-400 truncate max-w-[220px]">{r.reason}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <Badge className={`border ${kind.tone}`}>{kind.label}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-slate-700 truncate max-w-[200px]">
                            {r.kth_name || r.beneficiary_name || "—"}
                          </p>
                          {!bound && <p className="text-xs text-slate-400">{r.entity_name || "—"}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-slate-700 truncate max-w-[160px]">{r.requested_by_name || "—"}</p>
                          <p className="text-xs text-slate-400">{r.requested_by_role || ""}</p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">{r.line_count}</td>
                        <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900">{fmtRp(r.amount)}</td>
                        <td className="px-5 py-3">
                          <Badge className={`border ${statusStyle(r.status)}`}>{r.status}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          {r.status === "Approved" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-sky-700">
                              <Banknote className="w-3.5 h-3.5" />Finance · transfer
                            </span>
                          ) : r.pending_role_name ? (
                            <span className={`inline-flex items-center gap-1 text-xs ${mine ? "text-amber-700 font-semibold" : "text-slate-500"}`}>
                              {mine && <AlertTriangle className="w-3.5 h-3.5" />}
                              {r.pending_role_name}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <ArrowRight className="w-4 h-4 text-slate-300 inline" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
