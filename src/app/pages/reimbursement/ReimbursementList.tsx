// Reimbursement — membayar petani lewat rekening KTH-nya.
//
// Satu transfer keluar ke rekening KTH, dan dokumen ini yang menyebut transfer itu
// untuk petani siapa saja dan berapa masing-masing. Karena itu daftarnya menampilkan
// jumlah petani di sebelah nominal: angka besar tanpa keterangan berapa orang di
// baliknya tidak bisa diperiksa siapa pun.
//
// Alurnya sama dengan Payment Request — hanya Field Admin yang mengajukan, dan
// tidak ada PR atau PO di belakangnya.

import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  HandCoins, Plus, Search, Users, ArrowRight, Clock, CheckCircle2, AlertTriangle, Banknote,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canWriteOperations, canEditDocument } from "../../lib/permissions";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface Row {
  id: number;
  payreq_number: string;
  status: string;
  amount: number;
  farmer_count: number;
  kth_name: string | null;
  entity_name: string | null;
  reason: string | null;
  requested_by_name: string | null;
  estimated_pay_date: string | null;
  released_pay_date: string | null;
  payment_code: string | null;
  pending_role_name: string | null;
  pending_role_code: string | null;
  pending_step_label: string | null;
  created_at: string | null;
}

const TABS = ["Semua", "Draft", "Pending", "Revision", "Approved", "Paid"] as const;

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
  const { data, loading, error } = useApi<Row[]>("reimbursements");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Semua");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    let list = data || [];
    if (tab !== "Semua") list = list.filter((r) => r.status === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.payreq_number, r.kth_name, r.reason, r.requested_by_name]
          .some((v) => (v || "").toLowerCase().includes(q)));
    }
    return list;
  }, [data, tab, search]);

  const all = data || [];
  const waiting = all.filter((r) => r.status === "Pending" || r.status === "Revision");
  const readyToPay = all.filter((r) => r.status === "Approved");
  const paid = all.filter((r) => r.status === "Paid");
  const sum = (list: Row[]) => list.reduce((t, r) => t + Number(r.amount || 0), 0);
  const farmers = (list: Row[]) => list.reduce((t, r) => t + Number(r.farmer_count || 0), 0);

  // Whoever may file one may also see the button; the API is the real gate.
  const mayCreate = canWriteOperations(user)
    && canEditDocument(user, "Reimbursement", { status: "Draft", entity_id: null }, null);

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <HandCoins className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-slate-900 font-semibold text-lg">Reimbursement Petani</h1>
            <p className="text-slate-500 text-sm">
              Satu transfer ke rekening KTH · rinciannya per petani
            </p>
          </div>
          {mayCreate && (
            <Button className="ml-auto bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => navigate("/reimbursement/create")}>
              <Plus className="w-4 h-4 mr-1.5" />Buat Reimbursement
            </Button>
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
          <Stat icon={Users} label="Petani terbayar" tone="bg-slate-100 text-slate-600"
            value={String(farmers(paid))} sub="baris pada dokumen Paid" />
        </div>

        <Card className="p-0 overflow-hidden">
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
                placeholder="Cari nomor, KTH, keterangan…" className="pl-9 w-64" />
            </div>
          </div>

          {loading && <p className="px-5 py-12 text-center text-sm text-slate-400">Memuat…</p>}
          {error && <p className="px-5 py-12 text-center text-sm text-red-500">{error}</p>}
          {!loading && !error && rows.length === 0 && (
            <div className="px-5 py-16 text-center">
              <HandCoins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Belum ada reimbursement pada filter ini.</p>
            </div>
          )}

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-5 py-2.5 font-medium">Nomor</th>
                    <th className="px-5 py-2.5 font-medium">KTH</th>
                    <th className="px-5 py-2.5 font-medium text-right">Petani</th>
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
                    return (
                      <tr key={r.id}
                        onClick={() => navigate(`/reimbursement/${r.id}`)}
                        className={`border-b border-slate-50 cursor-pointer transition-colors ${
                          mine ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-3">
                          <p className="font-mono font-medium text-slate-800">{r.payreq_number}</p>
                          {r.reason && <p className="text-xs text-slate-400 truncate max-w-[220px]">{r.reason}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-slate-700">{r.kth_name || "—"}</p>
                          <p className="text-xs text-slate-400">{r.entity_name || "—"}</p>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">{r.farmer_count}</td>
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
