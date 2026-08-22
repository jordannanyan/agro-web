// Detail reimbursement.
//
// Yang harus terbaca dalam sekali lihat: berapa yang keluar, ke rekening siapa, dan
// untuk petani siapa saja. Daftar petaninya ditaruh sebelum alur approval dengan
// sengaja — orang yang menandatangani pengeluaran ini sedang menyetujui daftar itu,
// bukan sekadar satu angka.
//
// Pelunasannya sama persis dengan Payment Request: kode pembayaran ditempel di
// berita transfer, dan yang mengubah status jadi Paid adalah baris rekening koran
// yang cocok — bukan tombol di halaman ini.

import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, HandCoins, Banknote, Copy, Check, FileSpreadsheet, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useApi } from "../../lib/hooks";
import { useAuth } from "../../store/AuthContext";
import { canRecordPayment } from "../../lib/permissions";
import { ApprovalTimeline, ApprovalStep } from "../../components/ApprovalTimeline";
import { DocumentAttachments } from "../../components/DocumentAttachments";
import { DocumentActions, RevisionBanner } from "../../components/DocumentActions";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface Item {
  id: number; farmer_id: number | null; farmer_name: string;
  description: string | null; amount: number; no_hp: string | null; no_rek: string | null;
}

interface Detail {
  id: number; payreq_number: string; status: string;
  entity_id: number | null; entity_name: string | null;
  kth_id: number | null; kth_name: string | null;
  budget_code: string | null; reason: string | null; person_in_charge: string | null;
  activity_date: string | null; estimated_pay_date: string | null; released_pay_date: string | null;
  amount: number; farmer_count: number; items_total: number;
  bank_name: string | null; bank_account: string | null; beneficiary_name: string | null;
  requested_by_name: string | null;
  payment_code: string | null;
  approvals: ApprovalStep[];
  items: Item[];
}

function statusStyle(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "approved") return "bg-sky-50 text-sky-700 border-sky-200";
  if (s === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "revision") return "bg-violet-50 text-violet-700 border-violet-200";
  if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function ReimbursementView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi<Detail>(id ? `reimbursements/${id}` : null, undefined, [id]);
  const [copied, setCopied] = useState(false);

  const steps = (data?.approvals || []).filter((s) => s.step_label !== "Payment");
  const fullyApproved = steps.length > 0 && steps.every((s) => s.status === "Approved");
  const paid = data?.status === "Paid";
  const awaitingPayment = !!data && fullyApproved && !paid;

  return (
    <div className="min-h-screen bg-[#FAFBFC] -mx-8 -my-8">
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/reimbursement")} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <HandCoins className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900 font-semibold text-lg font-mono">
                {data?.payreq_number || "Reimbursement"}
              </h1>
              <p className="text-slate-500 text-sm">Pembayaran petani lewat rekening KTH</p>
            </div>
          </div>
          {data && (
            <div className="ml-auto flex items-center gap-3">
              <Badge className={`border ${statusStyle(data.status)}`}>{data.status}</Badge>
              <DocumentActions docType="Reimbursement" doc={data} approvals={data.approvals} onChanged={refetch} />
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
        {loading && <div className="text-center text-slate-400 py-16 text-sm">Memuat…</div>}
        {error && <div className="text-center text-red-500 py-16 text-sm">{error}</div>}

        {data && (
          <>
            <RevisionBanner docType="Reimbursement" doc={data} approvals={data.approvals} />

            <Card className="p-6">
              <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Informasi</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "KTH", value: data.kth_name || "—" },
                  { label: "Entitas", value: data.entity_name || "—" },
                  { label: "Diajukan oleh", value: data.requested_by_name || "—" },
                  { label: "Project Code", value: data.budget_code || "—" },
                  { label: "PIC", value: data.person_in_charge || "—" },
                  { label: "Tanggal Kegiatan", value: data.activity_date || "—" },
                  { label: "Estimasi Bayar", value: data.estimated_pay_date || "—" },
                  { label: "Tanggal Bayar", value: data.released_pay_date || "—" },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
              {data.reason && (
                <div className="mt-4 bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-slate-400 mb-0.5">Keterangan</p>
                  <p className="text-sm text-slate-700">{data.reason}</p>
                </div>
              )}
              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white">
                <span className="text-sm font-medium">Nominal transfer</span>
                <span className="text-lg font-bold font-mono">{fmtRp(data.amount)}</span>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Rekening: {data.bank_name || "—"} · {data.bank_account || "—"} · a.n. {data.beneficiary_name || "—"}
              </p>
            </Card>

            {/* Daftar petani — yang sebenarnya sedang disetujui. */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-slate-900 font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />Petani yang Dibayar
                </h2>
                <span className="text-xs text-slate-400">{data.items?.length || 0} orang</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="py-2 font-medium">Petani</th>
                      <th className="py-2 font-medium">Keterangan</th>
                      <th className="py-2 font-medium text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.items || []).map((it) => (
                      <tr key={it.id} className="border-b border-slate-50">
                        <td className="py-2.5">
                          <p className="text-slate-800 font-medium">{it.farmer_name}</p>
                          {it.no_rek && <p className="text-xs text-slate-400 font-mono">{it.no_rek}</p>}
                        </td>
                        <td className="py-2.5 text-slate-600">{it.description || "—"}</td>
                        <td className="py-2.5 text-right font-mono text-slate-900">{fmtRp(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="py-3 text-sm font-semibold text-slate-700">Jumlah</td>
                      <td className="py-3 text-right font-mono font-bold text-slate-900">{fmtRp(data.items_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {/* Kalau ini pernah muncul, ada yang salah di luar formulir — nominal
                  dokumen selalu dihitung dari baris-baris di atas. */}
              {Number(data.items_total) !== Number(data.amount) && (
                <p className="text-xs text-red-600 mt-2">
                  Jumlah baris ({fmtRp(data.items_total)}) tidak sama dengan nominal dokumen
                  ({fmtRp(data.amount)}). Jangan dibayarkan sebelum diperiksa.
                </p>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-slate-900 font-semibold mb-4">Alur Approval</h2>
              <ApprovalTimeline docType="Reimbursement" docId={data.id} steps={data.approvals || []} onChanged={refetch} />
            </Card>

            {awaitingPayment && data.payment_code && (
              <Card className="p-6 border-amber-200 bg-amber-50/50">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="w-4 h-4 text-amber-600" />
                  <h2 className="text-slate-900 font-semibold">Menunggu Pembayaran</h2>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Seluruh approval selesai. Transfer <span className="font-semibold">{fmtRp(data.amount)}</span> ke
                  rekening {data.kth_name}, lalu <span className="font-semibold">salin kode di bawah ke kolom
                  Berita/Keterangan transfer</span>. Status berubah jadi Paid setelah rekening koran diunggah
                  dan barisnya cocok.
                </p>
                <div className="flex items-center gap-3 bg-white border-2 border-dashed border-amber-300 rounded-xl px-4 py-3 max-w-md">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-0.5">Kode Pembayaran</p>
                    <p className="text-2xl font-bold font-mono tracking-wider text-slate-900">{data.payment_code}</p>
                  </div>
                  <Button size="sm" variant="outline" className="border-amber-300"
                    onClick={() => {
                      navigator.clipboard?.writeText(data.payment_code || "");
                      setCopied(true);
                      toast.success("Kode disalin — tempel di keterangan transfer");
                      setTimeout(() => setCopied(false), 2000);
                    }}>
                    {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5" />}
                    {copied ? "Tersalin" : "Salin"}
                  </Button>
                </div>
                {canRecordPayment(user?.role_code) && (
                  <button onClick={() => navigate("/procurement/reconciliation")}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 hover:text-amber-800">
                    <FileSpreadsheet className="w-4 h-4" />Buka Rekonsiliasi Pembayaran →
                  </button>
                )}
              </Card>
            )}

            {paid && (
              <Card className="p-6 border-emerald-200 bg-emerald-50/40">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm text-emerald-800 font-medium">
                    Sudah dibayar{data.released_pay_date ? ` pada ${data.released_pay_date}` : ""}
                    {data.payment_code ? ` · kode ${data.payment_code}` : ""} ·
                    {" "}{data.items?.length || 0} petani, {fmtRp(data.amount)}.
                  </p>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <DocumentAttachments docType="Reimbursement" docId={data.id}
                categories={["Daftar Tanda Tangan", "Kuitansi", "Bukti Transfer", "Lainnya"]} />
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
