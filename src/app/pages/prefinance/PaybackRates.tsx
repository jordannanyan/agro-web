import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, X, Save, Percent, Info } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { api } from "../../lib/api";
import { useApi } from "../../lib/hooks";
import { usePagedApi, Pagination } from "../../components/Pagination";
import { canWriteOperations } from "../../lib/permissions";
import { useAuth } from "../../store/AuthContext";

// Rupiah per kilo deducted from a pre-finance farmer's delivery to pay back the
// loan — the ledger's `AML - Purchase Price Database`. A rate holds from its
// effective date until the plot's next one.

interface Plot { id: number; plot_name: string; scheme: string; farmer?: { id: number; farmer_name: string } | null; }
interface Grade { id: number; grade_name: string; }
interface RateRow {
  id: number; plot_id: number; plot_name: string; scheme: string; farmer_name: string | null;
  grade_id: number | null; grade_name: string | null; effective_date: string;
  full_price: number | null; saprodi_per_kg: number; labor_per_kg: number;
  total_per_kg: number; final_price: number | null; notes: string | null;
}

const fmtRp = (n: number | null | undefined) => (n == null ? "—" : `Rp ${Number(n).toLocaleString("id-ID")}`);

function RateModal({ plots, grades, editRow, onClose, onSaved }: {
  plots: Plot[]; grades: Grade[]; editRow: RateRow | null; onClose: () => void; onSaved: () => void;
}) {
  const [plotId, setPlotId] = useState(editRow ? String(editRow.plot_id) : "");
  const [gradeId, setGradeId] = useState(editRow?.grade_id ? String(editRow.grade_id) : "");
  const [date, setDate] = useState(editRow?.effective_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [full, setFull] = useState(editRow?.full_price != null ? String(editRow.full_price) : "");
  const [saprodi, setSaprodi] = useState(editRow ? String(editRow.saprodi_per_kg) : "");
  const [labor, setLabor] = useState(editRow ? String(editRow.labor_per_kg) : "");
  const [notes, setNotes] = useState(editRow?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const pfPlots = useMemo(() => plots.filter((p) => p.scheme === "PreFinance" || String(p.id) === plotId), [plots, plotId]);
  const perKg = (Number(saprodi) || 0) + (Number(labor) || 0);
  const finalPrice = full !== "" ? Number(full) - perKg : null;
  const selectCls = "w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white";

  async function save() {
    if (!plotId || !date) { toast.error("Plot dan tanggal berlaku wajib diisi"); return; }
    if (finalPrice != null && finalPrice < 0) { toast.error("Total potongan per kg melebihi harga penuh"); return; }
    const body = {
      plot_id: Number(plotId), grade_id: gradeId ? Number(gradeId) : null, effective_date: date,
      full_price: full !== "" ? Number(full) : null,
      saprodi_per_kg: Number(saprodi) || 0, labor_per_kg: Number(labor) || 0, notes: notes || null,
    };
    setSaving(true);
    try {
      if (editRow) await api.put(`pre-finance/payback-rates/${editRow.id}`, body);
      else await api.post("pre-finance/payback-rates", body);
      toast.success(editRow ? "Tarif diperbarui" : "Tarif ditambahkan");
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold">{editRow ? "Edit" : "Tambah"} Tarif Potongan</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Plot (Pre-Finance) *</Label>
            <select value={plotId} onChange={(e) => setPlotId(e.target.value)} className={selectCls}>
              <option value="">Pilih plot…</option>
              {pfPlots.map((p) => <option key={p.id} value={p.id}>{p.plot_name} — {p.farmer?.farmer_name ?? "?"}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Berlaku sejak *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Grade</Label>
              <select value={gradeId} onChange={(e) => setGradeId(e.target.value)} className={selectCls}>
                <option value="">Semua grade</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.grade_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Harga penuh / kg</Label>
            <Input type="number" value={full} onChange={(e) => setFull(e.target.value)} placeholder="2850" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Potongan Saprodi / kg</Label>
              <Input type="number" value={saprodi} onChange={(e) => setSaprodi(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Potongan Tenaga Kerja / kg</Label>
              <Input type="number" value={labor} onChange={(e) => setLabor(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-900 text-white space-y-1 text-sm">
            <div className="flex justify-between"><span>Total potongan / kg</span><span className="tabular-nums font-semibold">{fmtRp(perKg)}</span></div>
            <div className="flex justify-between"><span>Harga final / kg (dicatat di Purchasing)</span><span className="tabular-nums font-semibold">{fmtRp(finalPrice)}</span></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />{saving ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PaybackRates() {
  const mayWrite = canWriteOperations(useAuth().user);
  const [search, setSearch] = useState("");
  const { rows, meta, page, setPage, perPage, setPerPage, loading, error, refetch } =
    usePagedApi<RateRow>("pre-finance/payback-rates", { search: search || undefined }, [search]);
  const { data: plots } = useApi<Plot[]>("plots");
  const { data: grades } = useApi<Grade[]>("grades");
  const [modal, setModal] = useState<{ row: RateRow | null } | null>(null);

  async function remove(id: number) {
    if (!confirm("Hapus tarif ini? Setoran yang sudah tercatat tidak berubah.")) return;
    try { await api.del(`pre-finance/payback-rates/${id}`); toast.success("Dihapus"); refetch(); }
    catch (e: any) { toast.error(e?.message || "Gagal menghapus"); }
  }

  return (
    <div className="space-y-6 pb-8">
      {modal && <RateModal plots={plots || []} grades={grades || []} editRow={modal.row} onClose={() => setModal(null)} onSaved={refetch} />}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Tarif Potongan Cicilan</h1>
          <p className="text-sm text-slate-500">Potongan utang per kg dari setoran petani Pre-Finance (buku besar: Purchase Price Database)</p>
        </div>
        {mayWrite && (
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setModal({ row: null })}>
            <Plus className="w-4 h-4 mr-2" />Tambah Tarif
          </Button>
        )}
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
        <p>Saat setoran diinput di Purchasing, potongan = kuantitas × tarif yang berlaku pada tanggal setoran (tarif per grade
          didahulukan), dibatasi sisa utang. Mengubah tarif hanya berlaku untuk setoran berikutnya.</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Cari plot atau petani…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["Plot", "Petani", "Grade", "Berlaku Sejak", "Harga Penuh", "Saprodi/kg", "Tenaga Kerja/kg", "Total/kg", "Harga Final", ""].map((h, i) => (
                  <th key={h + i} className={`${i >= 4 && i <= 8 ? "text-right" : "text-left"} py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-sm font-mono text-slate-700">{r.plot_name}</td>
                  <td className="py-3 px-4 text-sm text-slate-900">{r.farmer_name ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{r.grade_name ?? "Semua"}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{r.effective_date?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-600">{fmtRp(r.full_price)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(r.saprodi_per_kg)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-700">{fmtRp(r.labor_per_kg)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono font-semibold text-amber-700">{fmtRp(r.total_per_kg)}</td>
                  <td className="py-3 px-4 text-right text-sm font-mono text-slate-900">{fmtRp(r.final_price)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {mayWrite && <Button size="sm" variant="ghost" onClick={() => setModal({ row: r })}><Pencil className="w-4 h-4" /></Button>}
                      {mayWrite && <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination meta={meta} page={page} onPage={setPage} perPage={perPage} onPerPage={setPerPage} />
        {loading && <div className="p-16 text-center text-slate-400 text-sm">Memuat…</div>}
        {error && !loading && <div className="p-16 text-center text-red-500 text-sm">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="p-16 text-center">
            <Percent className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Belum ada tarif potongan</p>
          </div>
        )}
      </Card>
    </div>
  );
}
