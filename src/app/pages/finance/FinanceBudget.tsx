import { useState } from "react";
import { Plus, Edit, Trash2, X, Save, PiggyBank } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

const KATEGORI_LIST = ["Pupuk", "Pestisida", "Bibit", "Transport", "Labor", "Operasional Gudang", "Lainnya"];

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = ["2026", "2025", "2024"];

interface BudgetItem {
  id: string;
  periode: string;
  kategori: string;
  subKategori: string;
  budgetAmount: number;
  keterangan: string;
}

const mockBudget: BudgetItem[] = [
  { id: "1", periode: "Juni 2026", kategori: "Pupuk", subKategori: "Pupuk NPK", budgetAmount: 50000000, keterangan: "Pupuk NPK untuk musim tanam" },
  { id: "2", periode: "Juni 2026", kategori: "Pestisida", subKategori: "Herbisida", budgetAmount: 15000000, keterangan: "Pengendalian gulma" },
  { id: "3", periode: "Juni 2026", kategori: "Bibit", subKategori: "Bibit Karet", budgetAmount: 30000000, keterangan: "Replanting plot 12-15" },
  { id: "4", periode: "Juni 2026", kategori: "Transport", subKategori: "Angkut Komoditas", budgetAmount: 20000000, keterangan: "Pengangkutan ke gudang" },
  { id: "5", periode: "Juni 2026", kategori: "Labor", subKategori: "Upah Pemanen", budgetAmount: 45000000, keterangan: "Upah panen bulan Juni" },
  { id: "6", periode: "Juni 2026", kategori: "Operasional Gudang", subKategori: "Listrik & Air", budgetAmount: 8000000, keterangan: "Utilitas gudang utama" },
];

function formatRp(val: number) {
  return val.toLocaleString("id-ID");
}

function parseNumber(str: string) {
  return parseInt(str.replace(/\D/g, "")) || 0;
}

interface FormState {
  periode: string;
  kategori: string;
  subKategori: string;
  budgetAmount: string;
  keterangan: string;
}

const EMPTY_FORM: FormState = {
  periode: "Juni 2026",
  kategori: "",
  subKategori: "",
  budgetAmount: "",
  keterangan: "",
};

function BudgetModal({ onClose, editItem }: { onClose: () => void; editItem?: BudgetItem }) {
  const [form, setForm] = useState<FormState>(
    editItem
      ? {
          periode: editItem.periode,
          kategori: editItem.kategori,
          subKategori: editItem.subKategori,
          budgetAmount: String(editItem.budgetAmount),
          keterangan: editItem.keterangan,
        }
      : EMPTY_FORM
  );

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const amount = parseNumber(form.budgetAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-slate-900 font-semibold">{editItem ? "Edit Budget" : "Tambah Budget"}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Isi detail anggaran per kategori</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Periode *</Label>
            <Input
              placeholder="contoh: Juni 2026"
              value={form.periode}
              onChange={(e) => set("periode", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Kategori *</Label>
              <select
                value={form.kategori}
                onChange={(e) => set("kategori", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Pilih Kategori</option>
                {KATEGORI_LIST.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1.5 block">Sub Kategori *</Label>
              <Input
                placeholder="contoh: Pupuk NPK"
                value={form.subKategori}
                onChange={(e) => set("subKategori", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Budget Amount (Rp) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
              <Input
                className="pl-9"
                placeholder="0"
                value={amount > 0 ? formatRp(amount) : ""}
                onChange={(e) => set("budgetAmount", e.target.value)}
              />
            </div>
          </div>

          {amount > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-blue-700">Total Budget</span>
              <span className="font-mono font-semibold text-blue-800">Rp {formatRp(amount)}</span>
            </div>
          )}

          <div>
            <Label className="text-xs text-slate-600 mb-1.5 block">Keterangan</Label>
            <textarea
              value={form.keterangan}
              onChange={(e) => set("keterangan", e.target.value)}
              rows={2}
              placeholder="Keterangan tambahan (opsional)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Save className="w-4 h-4 mr-2" />
            {editItem ? "Simpan Perubahan" : "Simpan Budget"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function FinanceBudget() {
  const [bulanFilter, setBulanFilter] = useState("6");
  const [tahunFilter, setTahunFilter] = useState("2026");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | undefined>(undefined);

  const totalBudget = mockBudget.reduce((s, b) => s + b.budgetAmount, 0);

  function handleEdit(item: BudgetItem) {
    setEditItem(item);
    setShowModal(true);
  }

  function handleAddNew() {
    setEditItem(undefined);
    setShowModal(true);
  }

  return (
    <div className="space-y-6 pb-8">
      {showModal && <BudgetModal onClose={() => { setShowModal(false); setEditItem(undefined); }} editItem={editItem} />}

      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Budget</h1>
        <p className="text-sm text-slate-500">Buat dan kelola anggaran operasional PPIC per periode</p>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-shrink-0">
            <select
              value={bulanFilter}
              onChange={(e) => setBulanFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={String(i + 1)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex-shrink-0">
            <select
              value={tahunFilter}
              onChange={(e) => setTahunFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Budget</p>
              <p className="text-sm font-mono font-bold text-slate-900">Rp {formatRp(totalBudget)}</p>
            </div>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleAddNew}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Budget
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Periode</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategori</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sub Kategori</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Budget (Rp)</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Keterangan</th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {mockBudget.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-4 px-6 text-sm text-slate-600">{item.periode}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-700 font-medium">{item.subKategori}</td>
                  <td className="py-4 px-6 text-right text-sm font-mono font-semibold text-slate-900">
                    Rp {formatRp(item.budgetAmount)}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">{item.keterangan || "—"}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={3} className="py-3 px-6 text-sm font-semibold text-slate-700">Total</td>
                <td className="py-3 px-6 text-right text-sm font-mono font-bold text-slate-900">
                  Rp {formatRp(totalBudget)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {mockBudget.length === 0 && (
          <div className="p-16 text-center">
            <PiggyBank className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Belum ada data budget</p>
            <p className="text-sm text-slate-400 mt-1">Klik "Tambah Budget" untuk memulai</p>
          </div>
        )}
      </Card>
    </div>
  );
}
