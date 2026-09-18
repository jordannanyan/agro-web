// Membuat / mengubah reimbursement.
//
// Bentuk formulirnya mengikuti bentuk uangnya: satu rekening tujuan di atas, daftar
// petani di bawah, dan totalnya dihitung dari daftar itu — tidak ada kolom nominal
// yang bisa diketik. Itu disengaja. Nominal yang diketik sendiri adalah cara sebuah
// dokumen berakhir dengan angka transfer yang tidak sama dengan jumlah rinciannya,
// dan begitu uangnya keluar tidak ada yang bisa merapikannya lagi.
//
// Rekeningnya juga tidak diketik: diambil dari data KTH. KTH yang belum punya
// rekening ditolak di sini dengan kalimat yang menyebut apa yang harus dilengkapi,
// bukan dibiarkan lolos lalu gagal saat transfer.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft, HandCoins, Save, Send, RotateCcw, Plus, Trash2, Users, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

interface Kth {
  id: number; kth_name: string; entities_id: number | null;
  bank_name: string | null; bank_account: string | null; bank_account_name: string | null;
}
interface Farmer { id: number; farmer_name: string; no_rek: string | null }
interface BudgetCode { id: number; code: string }

type Category = "DailyWorker" | "LabourLoanPreFinance" | "LabourLoanProfitSharing";

const CATEGORY_LABEL: Record<Category, string> = {
  DailyWorker: "Daily worker",
  LabourLoanPreFinance: "Labour loan — pre finance",
  LabourLoanProfitSharing: "Labour loan — profit sharing",
};

/**
 * One line of the form the field admins actually file.
 *
 * `farmer_name` is who is paid — usually a daily worker, so it is typed rather than
 * picked, with the KTH's farmers offered as suggestions. `on_behalf_name` is whose
 * land or loan the work was on, which is the farmer the cost belongs to. Keeping
 * them apart is the whole point: the money goes one way and the debt the other.
 */
interface Line {
  key: string;
  farmer_id: string;
  farmer_name: string;
  category: Category;
  on_behalf_farmer_id: string;
  on_behalf_name: string;
  description: string;
  rate: string;
  work_days: string;
  work_dates: string;
  amount: string;
  recipient_bank_name: string;
  recipient_bank_account: string;
}

const blankLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  farmer_id: "", farmer_name: "", category: "DailyWorker",
  on_behalf_farmer_id: "", on_behalf_name: "",
  description: "", rate: "", work_days: "", work_dates: "", amount: "",
  recipient_bank_name: "", recipient_bank_account: "",
});

export default function ReimbursementCreate() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: kths } = useApi<Kth[]>("kth");
  const { data: budgetCodes } = useApi<BudgetCode[]>("budget-codes");

  const [kthId, setKthId] = useState("");
  const [budgetCodeId, setBudgetCodeId] = useState("");
  const [reason, setReason] = useState("");
  const [pic, setPic] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [estPayDate, setEstPayDate] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [saving, setSaving] = useState(false);
  const [docStatus, setDocStatus] = useState<string | null>(null);
  const isRevision = docStatus === "Revision";
  const loadedOnce = useRef(false);

  // Farmers belong to a KTH, so the picker cannot be filled until one is chosen.
  const { data: farmers } = useApi<Farmer[]>(
    kthId ? "farmers" : null, kthId ? { kth_id: kthId } : undefined, [kthId]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const d = await api.get<any>(`reimbursements/${id}`);
        loadedOnce.current = true;
        setDocStatus(d.status ?? null);
        setKthId(d.kth_id ? String(d.kth_id) : "");
        setBudgetCodeId(d.budget_code_id ? String(d.budget_code_id) : "");
        setReason(d.reason ?? "");
        setPic(d.person_in_charge ?? "");
        setActivityDate(d.activity_date ? String(d.activity_date).slice(0, 10) : "");
        setEstPayDate(d.estimated_pay_date ? String(d.estimated_pay_date).slice(0, 10) : "");
        setLines((d.items || []).length
          ? d.items.map((it: any) => ({
              key: `i${it.id}`,
              farmer_id: String(it.farmer_id ?? ""),
              farmer_name: it.farmer_name ?? "",
              category: (it.category ?? "DailyWorker") as Category,
              on_behalf_farmer_id: String(it.on_behalf_farmer_id ?? ""),
              on_behalf_name: it.on_behalf_name ?? "",
              description: it.description ?? "",
              rate: it.rate != null ? String(it.rate) : "",
              work_days: it.work_days != null ? String(it.work_days) : "",
              work_dates: it.work_dates ?? "",
              amount: String(it.amount ?? ""),
              recipient_bank_name: it.recipient_bank_name ?? "",
              recipient_bank_account: it.recipient_bank_account ?? "",
            }))
          : [blankLine()]);
      } catch (e: any) {
        toast.error(e?.message || "Gagal memuat reimbursement");
      }
    })();
  }, [id]);

  // Changing the KTH changes which farmers the suggestions come from, so a line
  // that had been matched to one of the old group's farmers loses that link. The
  // typed name stays: it is what somebody keyed in, and throwing away their typing
  // because they corrected the KTH would be its own bug.
  useEffect(() => {
    if (loadedOnce.current) { loadedOnce.current = false; return; }
    setLines((prev) => prev.map((l) => ({ ...l, farmer_id: "", on_behalf_farmer_id: "" })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kthId]);

  const kth = useMemo(() => (kths || []).find((k) => String(k.id) === kthId) || null, [kths, kthId]);
  const total = lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);
  const filled = lines.filter((l) => l.farmer_name.trim() && Number(l.amount) > 0);

  /**
   * The two recaps the paper form prints, computed live so the person filling it in
   * can check against the sheet in front of them before anybody else has to.
   */
  const recap = useMemo(() => {
    const scheme = new Map<string, { label: string; amount: number }>();
    const recipient = new Map<string, { name: string; amount: number }>();
    for (const l of filled) {
      const amount = Number(l.amount) || 0;
      const owner = l.category === "DailyWorker" ? "" : l.on_behalf_name.trim();
      const key = `${l.category}|${owner}`;
      const label = owner ? `${owner} — ${CATEGORY_LABEL[l.category]}` : CATEGORY_LABEL[l.category];
      scheme.set(key, { label, amount: (scheme.get(key)?.amount || 0) + amount });
      const rk = l.farmer_name.trim().toLowerCase();
      recipient.set(rk, { name: l.farmer_name.trim(), amount: (recipient.get(rk)?.amount || 0) + amount });
    }
    const byAmount = (a: any, b: any) => b.amount - a.amount;
    return {
      scheme: [...scheme.values()].sort(byAmount),
      recipient: [...recipient.values()].sort(byAmount),
    };
  }, [filled]);

  /** A labour loan has to say whose loan it is, or the by-scheme recap cannot name it. */
  const missingOwner = lines.some(
    (l) => l.category !== "DailyWorker" && Number(l.amount) > 0 && !l.on_behalf_name.trim());

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  /**
   * Typing a name that exactly matches one of the KTH's farmers links the line to
   * that farmer; anything else stays free text. Most of these people are daily
   * workers who are in no master list, and refusing to record them is what kept the
   * form in Google Docs.
   */
  function setName(key: string, field: "farmer" | "on_behalf", value: string) {
    const match = (farmers || []).find(
      (f) => f.farmer_name.trim().toLowerCase() === value.trim().toLowerCase());
    setLines((prev) => prev.map((l) => (l.key !== key ? l : field === "farmer"
      ? { ...l, farmer_name: value, farmer_id: match ? String(match.id) : "" }
      : { ...l, on_behalf_name: value, on_behalf_farmer_id: match ? String(match.id) : "" })));
  }
  function addLine() { setLines((prev) => [...prev, blankLine()]); }
  function removeLine(key: string) {
    setLines((prev) => (prev.length === 1 ? [blankLine()] : prev.filter((l) => l.key !== key)));
  }

  /** Everyone in this KTH who is not named yet, in one go. */
  function addAllFarmers() {
    const already = new Set(lines.map((l) => l.farmer_name.trim().toLowerCase()).filter(Boolean));
    const rest = (farmers || []).filter((f) => !already.has(f.farmer_name.trim().toLowerCase()));
    if (!rest.length) { toast.info("Semua petani KTH ini sudah ada di daftar"); return; }
    setLines((prev) => [
      ...prev.filter((l) => l.farmer_name.trim() || Number(l.amount) > 0),
      ...rest.map((f) => ({
        ...blankLine(), farmer_id: String(f.id), farmer_name: f.farmer_name,
        recipient_bank_account: f.no_rek ?? "",
      })),
    ]);
  }

  async function submit(status: "Draft" | "Pending" | "keep") {
    if (!kthId) { toast.error("Pilih KTH tujuan"); return; }
    if (kth && !kth.bank_account) {
      toast.error(`KTH ${kth.kth_name} belum punya nomor rekening — lengkapi dulu di data KTH`);
      return;
    }
    if (!filled.length) { toast.error("Isi minimal satu baris penerima dengan nominal"); return; }
    const incomplete = lines.find(
      (l) => (l.farmer_name.trim() && !(Number(l.amount) > 0)) || (!l.farmer_name.trim() && Number(l.amount) > 0));
    if (incomplete) { toast.error("Ada baris yang nama penerima atau nominalnya belum lengkap"); return; }
    if (missingOwner) { toast.error("Baris labour loan harus menyebut lahan/pinjaman siapa"); return; }

    const payload: any = {
      kth_id: Number(kthId),
      budget_code_id: budgetCodeId ? Number(budgetCodeId) : null,
      reason, person_in_charge: pic,
      activity_date: activityDate || null,
      estimated_pay_date: estPayDate || null,
      items: filled.map((l) => ({
        farmer_id: l.farmer_id ? Number(l.farmer_id) : null,
        farmer_name: l.farmer_name.trim(),
        category: l.category,
        on_behalf_farmer_id: l.on_behalf_farmer_id ? Number(l.on_behalf_farmer_id) : null,
        on_behalf_name: l.on_behalf_name.trim() || null,
        description: l.description || null,
        rate: l.rate === "" ? null : Number(l.rate),
        work_days: l.work_days === "" ? null : Number(l.work_days),
        work_dates: l.work_dates || null,
        amount: Number(l.amount),
        recipient_bank_name: l.recipient_bank_name || null,
        recipient_bank_account: l.recipient_bank_account || null,
      })),
      ...(status === "keep" ? {} : { status }),
    };
    setSaving(true);
    try {
      const res = isEdit
        ? await api.put<any>(`reimbursements/${id}`, payload)
        : await api.post<any>("reimbursements", payload);
      toast.success(
        status === "Draft" ? "Reimbursement disimpan draft"
          : status === "keep" ? "Perubahan revisi disimpan"
          : isRevision ? "Dikirim ulang untuk approval"
          : "Diajukan untuk approval");
      navigate(`/reimbursement/${isEdit ? id : res.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan reimbursement");
    } finally { setSaving(false); }
  }

  const selectCls = "w-full border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const label = "text-xs text-slate-500 font-medium mb-1.5 block";

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
              <h1 className="text-slate-900 font-semibold text-lg">
                {isRevision ? "Revisi" : isEdit ? "Edit" : "Buat"} Reimbursement
              </h1>
              <p className="text-slate-500 text-sm">Membayar petani lewat rekening KTH</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto space-y-6">
        {/* Tujuan transfer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Rekening Tujuan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label}>KTH <span className="text-red-500">*</span></label>
              <select value={kthId} onChange={(e) => setKthId(e.target.value)} className={selectCls}>
                <option value="">— pilih KTH —</option>
                {(kths || []).map((k) => <option key={k.id} value={k.id}>{k.kth_name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Project Code</label>
              <select value={budgetCodeId} onChange={(e) => setBudgetCodeId(e.target.value)} className={selectCls}>
                <option value="">— tanpa kode —</option>
                {(budgetCodes || []).map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
          </div>

          {/* Rekening tidak diketik: yang dipakai adalah milik KTH, dan kalau belum
              ada, dokumen ini tidak akan bisa dibayarkan. */}
          {kth && (
            kth.bank_account ? (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Uang dikirim ke</p>
                <p className="text-sm text-slate-800 font-medium">
                  {kth.bank_name || "Bank"} · <span className="font-mono">{kth.bank_account}</span>
                  {" "}· a.n. {kth.bank_account_name || kth.kth_name}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  KTH <span className="font-semibold">{kth.kth_name}</span> belum punya nomor rekening.
                  Lengkapi dulu di data KTH — tanpa itu tidak ada tujuan transfer untuk dokumen ini.
                </p>
              </div>
            )
          )}
        </div>

        {/* Daftar petani */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
              Rincian Penerima
            </h2>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={addAllFarmers} disabled={!kthId}>
                <Users className="w-4 h-4 mr-1.5" />Tambah semua petani KTH
              </Button>
              <Button size="sm" variant="outline" onClick={addLine} disabled={!kthId}>
                <Plus className="w-4 h-4 mr-1.5" />Baris
              </Button>
            </div>
          </div>

          {!kthId && (
            <p className="text-sm text-slate-400 py-6 text-center">Pilih KTH dulu untuk mengisi rinciannya.</p>
          )}

          {kthId && (
            <>
              {/* Suggestions, not a closed list. Most people on these documents are
                  daily workers who are in no master list at all; typing a name that
                  matches one of the KTH's farmers links the line to them, and
                  anything else is recorded as typed. */}
              <datalist id="reimb-farmers">
                {(farmers || []).map((f) => <option key={f.id} value={f.farmer_name} />)}
              </datalist>

              <div className="space-y-3">
                {lines.map((l, i) => {
                  const loan = l.category !== "DailyWorker";
                  const ownerMissing = loan && Number(l.amount) > 0 && !l.on_behalf_name.trim();
                  return (
                    <div key={l.key} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-6 text-xs text-slate-300 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Penerima <span className="text-red-500">*</span></label>
                          <Input list="reimb-farmers" value={l.farmer_name}
                            onChange={(e) => setName(l.key, "farmer", e.target.value)}
                            placeholder="Nama penerima (mis. Tenggo)" />
                        </div>
                        <div className="w-56 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Kategori</label>
                          <select value={l.category} onChange={(e) => setLine(l.key, { category: e.target.value as Category })}
                            className={selectCls}>
                            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
                              <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-56 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">
                            Lahan/pinjaman siapa {loan && <span className="text-red-500">*</span>}
                          </label>
                          <Input list="reimb-farmers" value={l.on_behalf_name} disabled={!loan}
                            onChange={(e) => setName(l.key, "on_behalf", e.target.value)}
                            className={ownerMissing ? "border-red-300 bg-red-50" : ""}
                            placeholder={loan ? "mis. Mustari" : "—"} />
                        </div>
                        <button onClick={() => removeLine(l.key)}
                          className="p-2 mt-4 text-slate-300 hover:text-red-600 shrink-0" title="Hapus baris">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-end gap-2 pl-8">
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Keterangan</label>
                          <Input value={l.description}
                            onChange={(e) => setLine(l.key, { description: e.target.value })}
                            placeholder="mis. Land maintenance" />
                        </div>
                        <div className="w-28 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Rate</label>
                          <Input type="number" className="text-right" value={l.rate}
                            onChange={(e) => setLine(l.key, { rate: e.target.value })} placeholder="0" />
                        </div>
                        <div className="w-20 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Hari</label>
                          <Input type="number" className="text-right" value={l.work_days}
                            onChange={(e) => setLine(l.key, { work_days: e.target.value })} placeholder="0" />
                        </div>
                        <div className="w-48 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Tanggal kerja</label>
                          <Input value={l.work_dates}
                            onChange={(e) => setLine(l.key, { work_dates: e.target.value })}
                            placeholder="06, 07, 10 Agustus" />
                        </div>
                        <div className="w-40 shrink-0">
                          <label className="text-[11px] text-slate-400 block mb-0.5">Nominal <span className="text-red-500">*</span></label>
                          <Input type="number" className="text-right" value={l.amount}
                            onChange={(e) => setLine(l.key, { amount: e.target.value })} placeholder="0" />
                        </div>
                      </div>

                      {/* Rate x hari is a description of how the amount was reached,
                          not a formula: the real sheets carry weeks where one of four
                          days was paid at half rate. Flagged, never corrected. */}
                      {Number(l.rate) > 0 && Number(l.work_days) > 0
                        && Number(l.rate) * Number(l.work_days) !== Number(l.amount) && Number(l.amount) > 0 && (
                        <p className="text-[11px] text-amber-600 mt-1.5 pl-8">
                          Rate × hari = {fmtRp(Number(l.rate) * Number(l.work_days))}, beda dengan nominal.
                          Tidak apa-apa bila memang ada hari yang dibayar berbeda — nominal yang dipakai.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white">
                <span className="text-sm font-medium">
                  Total transfer · {filled.length} baris · {recap.recipient.length} penerima
                </span>
                <span className="text-lg font-bold font-mono">{fmtRp(total)}</span>
              </div>

              {/* The two recaps the paper form prints, live. They are what a reader
                  checks against each other first, so the person filling this in
                  should see them before anybody else has to. */}
              {filled.length > 0 && (
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <p className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Rekap per skema
                    </p>
                    <ul className="divide-y divide-slate-50">
                      {recap.scheme.map((g) => (
                        <li key={g.label} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-slate-600 pr-3">{g.label}</span>
                          <span className="font-mono text-slate-800 whitespace-nowrap">{fmtRp(g.amount)}</span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between px-3 py-2 text-sm bg-slate-50 font-semibold">
                        <span className="text-slate-700">Total</span>
                        <span className="font-mono text-slate-900">{fmtRp(total)}</span>
                      </li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <p className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Rekap per penerima
                    </p>
                    <ul className="divide-y divide-slate-50">
                      {recap.recipient.map((r) => (
                        <li key={r.name} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-slate-600 pr-3">{r.name}</span>
                          <span className="font-mono text-slate-800 whitespace-nowrap">{fmtRp(r.amount)}</span>
                        </li>
                      ))}
                      <li className="flex items-center justify-between px-3 py-2 text-sm bg-slate-50 font-semibold">
                        <span className="text-slate-700">Total</span>
                        <span className="font-mono text-slate-900">{fmtRp(total)}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                Nominal dokumen dihitung dari daftar ini, tidak bisa diketik terpisah — angka di
                rekening koran nanti harus sama persis dengan jumlah baris di atas.
              </p>
            </>
          )}
        </div>

        {/* Keterangan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-4">Keterangan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={label}>Penanggung Jawab</label>
              <Input value={pic} onChange={(e) => setPic(e.target.value)} placeholder="Nama PIC" /></div>
            <div><label className={label}>Tanggal Kegiatan</label>
              <Input type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} /></div>
            <div><label className={label}>Estimasi Bayar</label>
              <Input type="date" value={estPayDate} onChange={(e) => setEstPayDate(e.target.value)} /></div>
            <div className="sm:col-span-3"><label className={label}>Alasan / Keterangan</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                placeholder="Mis. pembayaran hasil panen minggu ke-3 Agustus…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Dokumen pendukung — daftar tanda tangan petani, kuitansi, bukti transfer — dilampirkan
            di halaman detail setelah dokumen tersimpan, dan boleh beberapa berkas sekaligus.
          </p>
        </div>

        <div className="flex items-center justify-between pb-8">
          <button onClick={() => navigate("/reimbursement")}
            className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50">Batal</button>
          <div className="flex items-center gap-3">
            {isRevision ? (
              <>
                <Button variant="outline" onClick={() => submit("keep")} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />Simpan Perubahan
                </Button>
                <Button className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => submit("Pending")} disabled={saving}>
                  <RotateCcw className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan & Kirim Ulang"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => submit("Draft")} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />Simpan Draft
                </Button>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => submit("Pending")} disabled={saving}>
                  <Send className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Ajukan Approval"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
