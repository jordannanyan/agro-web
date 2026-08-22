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

interface Line { key: string; farmer_id: string; description: string; amount: string }

const blankLine = (): Line => ({
  key: Math.random().toString(36).slice(2), farmer_id: "", description: "", amount: "",
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
              description: it.description ?? "",
              amount: String(it.amount ?? ""),
            }))
          : [blankLine()]);
      } catch (e: any) {
        toast.error(e?.message || "Gagal memuat reimbursement");
      }
    })();
  }, [id]);

  // Changing the KTH changes which farmers are selectable, so lines pointing at
  // the old one are cleared rather than silently submitted against a farmer who
  // is not in this group.
  useEffect(() => {
    if (loadedOnce.current) { loadedOnce.current = false; return; }
    setLines((prev) => prev.map((l) => ({ ...l, farmer_id: "" })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kthId]);

  const kth = useMemo(() => (kths || []).find((k) => String(k.id) === kthId) || null, [kths, kthId]);
  const total = lines.reduce((t, l) => t + (Number(l.amount) || 0), 0);
  const filled = lines.filter((l) => l.farmer_id && Number(l.amount) > 0);

  const usedFarmers = lines.map((l) => l.farmer_id).filter(Boolean);
  const duplicate = usedFarmers.length !== new Set(usedFarmers).size;

  function setLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function addLine() { setLines((prev) => [...prev, blankLine()]); }
  function removeLine(key: string) {
    setLines((prev) => (prev.length === 1 ? [blankLine()] : prev.filter((l) => l.key !== key)));
  }

  /** Everyone in this KTH who is not on the list yet, in one go. */
  function addAllFarmers() {
    const already = new Set(usedFarmers);
    const rest = (farmers || []).filter((f) => !already.has(String(f.id)));
    if (!rest.length) { toast.info("Semua petani KTH ini sudah ada di daftar"); return; }
    setLines((prev) => [
      ...prev.filter((l) => l.farmer_id || Number(l.amount) > 0),
      ...rest.map((f) => ({ ...blankLine(), farmer_id: String(f.id) })),
    ]);
  }

  async function submit(status: "Draft" | "Pending" | "keep") {
    if (!kthId) { toast.error("Pilih KTH tujuan"); return; }
    if (kth && !kth.bank_account) {
      toast.error(`KTH ${kth.kth_name} belum punya nomor rekening — lengkapi dulu di data KTH`);
      return;
    }
    if (duplicate) { toast.error("Ada petani yang muncul dua kali"); return; }
    if (!filled.length) { toast.error("Isi minimal satu baris petani dengan nominal"); return; }
    const incomplete = lines.find((l) => (l.farmer_id && !(Number(l.amount) > 0)) || (!l.farmer_id && Number(l.amount) > 0));
    if (incomplete) { toast.error("Ada baris yang petani atau nominalnya belum lengkap"); return; }

    const payload: any = {
      kth_id: Number(kthId),
      budget_code_id: budgetCodeId ? Number(budgetCodeId) : null,
      reason, person_in_charge: pic,
      activity_date: activityDate || null,
      estimated_pay_date: estPayDate || null,
      items: filled.map((l) => ({
        farmer_id: Number(l.farmer_id),
        description: l.description || null,
        amount: Number(l.amount),
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
              <p className="text-slate-500 text-sm">Pembayaran petani lewat rekening KTH</p>
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
              Petani yang Dibayar
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
            <p className="text-sm text-slate-400 py-6 text-center">Pilih KTH dulu untuk memilih petaninya.</p>
          )}

          {kthId && (
            <>
              <div className="space-y-2">
                {lines.map((l, i) => {
                  const dupe = !!l.farmer_id && usedFarmers.filter((f) => f === l.farmer_id).length > 1;
                  return (
                    <div key={l.key} className="flex items-start gap-2">
                      <span className="w-6 text-xs text-slate-300 pt-2.5 text-right shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <select value={l.farmer_id} onChange={(e) => setLine(l.key, { farmer_id: e.target.value })}
                          className={`${selectCls} ${dupe ? "border-red-300 bg-red-50" : ""}`}>
                          <option value="">— pilih petani —</option>
                          {(farmers || []).map((f) => (
                            <option key={f.id} value={f.id}>{f.farmer_name}</option>
                          ))}
                        </select>
                        {dupe && <p className="text-[11px] text-red-600 mt-0.5">Petani ini sudah ada di baris lain.</p>}
                      </div>
                      <Input className="flex-1 min-w-0" value={l.description}
                        onChange={(e) => setLine(l.key, { description: e.target.value })}
                        placeholder="Untuk apa (mis. panen 12–18 Agu)" />
                      <Input className="w-40 shrink-0 text-right" type="number" value={l.amount}
                        onChange={(e) => setLine(l.key, { amount: e.target.value })} placeholder="0" />
                      <button onClick={() => removeLine(l.key)}
                        className="p-2 text-slate-300 hover:text-red-600 shrink-0" title="Hapus baris">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 text-white">
                <span className="text-sm font-medium">
                  Total transfer · {filled.length} petani
                </span>
                <span className="text-lg font-bold font-mono">{fmtRp(total)}</span>
              </div>
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
