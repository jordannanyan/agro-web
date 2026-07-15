import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, FileText } from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = ["2026", "2025", "2024"];

interface ActualItem {
  id: string;
  tanggal: string;
  kategori: string;
  subKategori: string;
  nilaiAktual: number;
  keterangan: string;
}

const mockActual: ActualItem[] = [
  { id: "1", tanggal: "2026-06-03", kategori: "Pupuk", subKategori: "Pupuk NPK", nilaiAktual: 48500000, keterangan: "Realisasi pembelian pupuk NPK" },
  { id: "2", tanggal: "2026-06-05", kategori: "Pestisida", subKategori: "Herbisida", nilaiAktual: 12300000, keterangan: "Pembelian herbisida Glifosat" },
  { id: "3", tanggal: "2026-06-08", kategori: "Transport", subKategori: "Angkut Komoditas", nilaiAktual: 18700000, keterangan: "Ongkir ke gudang Palembang" },
  { id: "4", tanggal: "2026-06-10", kategori: "Labor", subKategori: "Upah Pemanen", nilaiAktual: 41200000, keterangan: "Upah panen minggu 1-2 Juni" },
  { id: "5", tanggal: "2026-06-11", kategori: "Operasional Gudang", subKategori: "Listrik & Air", nilaiAktual: 6800000, keterangan: "Tagihan utilitas gudang" },
];

interface PreviewItem {
  tanggal: string;
  kategori: string;
  subKategori: string;
  nilaiAktual: number;
  keterangan: string;
  valid: boolean;
  error?: string;
}

const mockPreviewData: PreviewItem[] = [
  { tanggal: "2026-06-12", kategori: "Pupuk", subKategori: "Pupuk Organik", nilaiAktual: 9500000, keterangan: "Pembelian pupuk organik cair", valid: true },
  { tanggal: "2026-06-13", kategori: "Bibit", subKategori: "Bibit Karet", nilaiAktual: 27000000, keterangan: "Pembelian bibit karet okulasi", valid: true },
  { tanggal: "2026-06-14", kategori: "InvalidKategori", subKategori: "Misc", nilaiAktual: 5000000, keterangan: "", valid: false, error: "Kategori tidak dikenali" },
];

function formatRp(val: number) {
  return val.toLocaleString("id-ID");
}

export default function FinanceActual() {
  const [bulanFilter, setBulanFilter] = useState("6");
  const [tahunFilter, setTahunFilter] = useState("2026");
  const [showPreview, setShowPreview] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validCount = mockPreviewData.filter((d) => d.valid).length;
  const errorCount = mockPreviewData.filter((d) => !d.valid).length;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setShowPreview(true);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Actual (Import File)</h1>
        <p className="text-sm text-slate-500">Import data realisasi dari Finance untuk dicocokkan dengan budget</p>
      </div>

      {/* Filter + Upload */}
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

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import File
          </Button>
        </div>
      </Card>

      {/* Upload Zone */}
      {!showPreview && (
        <Card
          className="p-10 border-2 border-dashed border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-700 font-medium mb-1">Klik atau drag & drop file Excel</p>
            <p className="text-sm text-slate-400">Format yang didukung: .xlsx, .xls, .csv</p>
            <p className="text-xs text-slate-400 mt-2">Kolom yang diperlukan: Tanggal, Kategori, Sub Kategori, Nilai Aktual, Keterangan</p>
          </div>
        </Card>
      )}

      {/* Preview Modal / Section */}
      {showPreview && (
        <Card className="border-2 border-emerald-200">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-slate-900 font-semibold text-sm">{uploadedFileName}</p>
                <p className="text-xs text-slate-400">{mockPreviewData.length} baris ditemukan</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                  <CheckCircle className="w-3 h-3" /> {validCount} valid
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full font-medium">
                    <AlertCircle className="w-3 h-3" /> {errorCount} error
                  </span>
                )}
              </div>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tanggal</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategori</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sub Kategori</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nilai Aktual</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {mockPreviewData.map((row, i) => (
                  <tr key={`prev-${i}`} className={`border-b border-slate-50 ${!row.valid ? "bg-red-50/50" : ""}`}>
                    <td className="py-3 px-6">
                      {row.valid
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            <span className="text-xs text-red-500">{row.error}</span>
                          </div>
                        )
                      }
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-600">{row.tanggal}</td>
                    <td className="py-3 px-6 text-sm text-slate-700">{row.kategori}</td>
                    <td className="py-3 px-6 text-sm text-slate-700">{row.subKategori}</td>
                    <td className="py-3 px-6 text-right text-sm font-mono font-semibold text-slate-900">
                      Rp {formatRp(row.nilaiAktual)}
                    </td>
                    <td className="py-3 px-6 text-sm text-slate-500">{row.keterangan || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {errorCount > 0 && "Perbaiki data yang error sebelum menyimpan. "}
              {validCount} data siap disimpan.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setShowPreview(false)}>Batal</Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={errorCount > 0}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Simpan {validCount} Data
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Existing Actual Data Table */}
      <Card>
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-slate-900 font-semibold">Data Aktual Tersimpan</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {MONTHS[parseInt(bulanFilter) - 1]} {tahunFilter} · {mockActual.length} transaksi
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tanggal</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategori</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sub Kategori</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nilai Aktual</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {mockActual.map((item) => (
                <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-4 px-6 text-sm text-slate-600">{item.tanggal}</td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                      {item.kategori}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-700 font-medium">{item.subKategori}</td>
                  <td className="py-4 px-6 text-right text-sm font-mono font-semibold text-slate-900">
                    Rp {formatRp(item.nilaiAktual)}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">{item.keterangan || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={3} className="py-3 px-6 text-sm font-semibold text-slate-700">Total Aktual</td>
                <td className="py-3 px-6 text-right text-sm font-mono font-bold text-slate-900">
                  Rp {formatRp(mockActual.reduce((s, a) => s + a.nilaiAktual, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {mockActual.length === 0 && (
          <div className="p-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Belum ada data aktual</p>
            <p className="text-sm text-slate-400 mt-1">Import file Excel untuk memulai</p>
          </div>
        )}
      </Card>
    </div>
  );
}
