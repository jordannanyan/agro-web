import { useState } from "react";
import { BarChart2, ArrowUpRight, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import { Card } from "../../components/ui/card";

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = ["2026", "2025", "2024"];

interface MonitoringRow {
  id: string;
  kategori: string;
  subKategori: string;
  budget: number;
  aktual: number;
}

const mockMonitoring: MonitoringRow[] = [
  { id: "1", kategori: "Pupuk", subKategori: "Pupuk NPK", budget: 50000000, aktual: 48500000 },
  { id: "2", kategori: "Pupuk", subKategori: "Pupuk Organik", budget: 12000000, aktual: 9500000 },
  { id: "3", kategori: "Pestisida", subKategori: "Herbisida", budget: 15000000, aktual: 12300000 },
  { id: "4", kategori: "Bibit", subKategori: "Bibit Karet", budget: 30000000, aktual: 27000000 },
  { id: "5", kategori: "Transport", subKategori: "Angkut Komoditas", budget: 20000000, aktual: 18700000 },
  { id: "6", kategori: "Labor", subKategori: "Upah Pemanen", budget: 45000000, aktual: 41200000 },
  { id: "7", kategori: "Operasional Gudang", subKategori: "Listrik & Air", budget: 8000000, aktual: 6800000 },
  { id: "8", kategori: "Lainnya", subKategori: "ATK & Supplies", budget: 5000000, aktual: 5800000 },
];

function formatRp(val: number) {
  return val.toLocaleString("id-ID");
}

function getProgressColor(pct: number) {
  if (pct >= 100) return { bar: "#EF4444", text: "text-red-600" };
  if (pct >= 85) return { bar: "#F59E0B", text: "text-amber-600" };
  return { bar: "#10B981", text: "text-emerald-600" };
}

export default function FinanceBudgetMonitoring() {
  const [bulanFilter, setBulanFilter] = useState("6");
  const [tahunFilter, setTahunFilter] = useState("2026");
  const [kategoriFilter, setKategoriFilter] = useState("Semua");

  const uniqueKategori = ["Semua", ...new Set(mockMonitoring.map((r) => r.kategori))];

  const filtered = mockMonitoring.filter(
    (r) => kategoriFilter === "Semua" || r.kategori === kategoriFilter
  );

  const totalBudget = filtered.reduce((s, r) => s + r.budget, 0);
  const totalAktual = filtered.reduce((s, r) => s + r.aktual, 0);
  const sisaBudget = totalBudget - totalAktual;
  const persentaseRealisasi = totalBudget > 0 ? (totalAktual / totalBudget) * 100 : 0;
  const overBudgetCount = filtered.filter((r) => r.aktual > r.budget).length;

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Budget Monitoring</h1>
        <p className="text-sm text-slate-500">Ringkasan perbandingan Budget vs Realisasi per kategori</p>
      </div>

      {/* Filters */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={bulanFilter}
            onChange={(e) => setBulanFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select
            value={tahunFilter}
            onChange={(e) => setTahunFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={kategoriFilter}
            onChange={(e) => setKategoriFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {uniqueKategori.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: "m-1",
            label: "Total Budget",
            value: `Rp ${formatRp(totalBudget)}`,
            icon: BarChart2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            dot: "bg-blue-500",
          },
          {
            id: "m-2",
            label: "Total Aktual",
            value: `Rp ${formatRp(totalAktual)}`,
            icon: ArrowUpRight,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            dot: "bg-emerald-500",
          },
          {
            id: "m-3",
            label: "Sisa Budget",
            value: `Rp ${formatRp(sisaBudget)}`,
            icon: Wallet,
            color: sisaBudget >= 0 ? "text-amber-600" : "text-red-600",
            bg: sisaBudget >= 0 ? "bg-amber-50" : "bg-red-50",
            dot: sisaBudget >= 0 ? "bg-amber-500" : "bg-red-500",
          },
          {
            id: "m-4",
            label: "Persentase Realisasi",
            value: `${persentaseRealisasi.toFixed(1)}%`,
            icon: AlertTriangle,
            color: persentaseRealisasi >= 100 ? "text-red-600" : persentaseRealisasi >= 85 ? "text-amber-600" : "text-violet-600",
            bg: persentaseRealisasi >= 100 ? "bg-red-50" : persentaseRealisasi >= 85 ? "bg-amber-50" : "bg-violet-50",
            dot: persentaseRealisasi >= 100 ? "bg-red-500" : persentaseRealisasi >= 85 ? "bg-amber-500" : "bg-violet-500",
          },
        ].map((kpi) => (
          <Card key={kpi.id} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`w-2 h-2 rounded-full ${kpi.dot}`} />
              <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{kpi.label}</p>
            <p className="text-xl text-slate-900 font-bold tabular-nums">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {overBudgetCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">
            <span className="font-semibold">{overBudgetCount} sub kategori</span> melebihi budget yang ditetapkan. Segera lakukan evaluasi.
          </p>
        </div>
      )}

      {/* Monitoring Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Kategori</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sub Kategori</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Budget (Rp)</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Aktual (Rp)</th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sisa Budget</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide min-w-[200px]">Persentase Pemakaian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const sisa = row.budget - row.aktual;
                const pct = row.budget > 0 ? (row.aktual / row.budget) * 100 : 0;
                const colorConfig = getProgressColor(pct);
                const isOver = sisa < 0;

                return (
                  <tr key={row.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${isOver ? "bg-red-50/30" : ""}`}>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-medium text-slate-700">
                        {row.kategori}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-slate-700">{row.subKategori}</td>
                    <td className="py-4 px-6 text-right text-sm font-mono text-slate-600">
                      Rp {formatRp(row.budget)}
                    </td>
                    <td className="py-4 px-6 text-right text-sm font-mono font-semibold text-slate-900">
                      Rp {formatRp(row.aktual)}
                    </td>
                    <td className={`py-4 px-6 text-right text-sm font-mono font-semibold ${isOver ? "text-red-600" : "text-emerald-600"}`}>
                      {isOver ? `-` : ""}Rp {formatRp(Math.abs(sisa))}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              backgroundColor: colorConfig.bar,
                            }}
                          />
                        </div>
                        <span className={`text-sm font-mono font-bold w-14 text-right ${colorConfig.text}`}>
                          {pct.toFixed(1)}%
                        </span>
                        {isOver && (
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td colSpan={2} className="py-3 px-6 text-sm font-semibold text-slate-700">Total</td>
                <td className="py-3 px-6 text-right text-sm font-mono font-bold text-slate-700">
                  Rp {formatRp(totalBudget)}
                </td>
                <td className="py-3 px-6 text-right text-sm font-mono font-bold text-slate-900">
                  Rp {formatRp(totalAktual)}
                </td>
                <td className={`py-3 px-6 text-right text-sm font-mono font-bold ${sisaBudget >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {sisaBudget < 0 ? "-" : ""}Rp {formatRp(Math.abs(sisaBudget))}
                </td>
                <td className="py-3 px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(persentaseRealisasi, 100)}%`,
                          backgroundColor: getProgressColor(persentaseRealisasi).bar,
                        }}
                      />
                    </div>
                    <span className={`text-sm font-mono font-bold w-14 text-right ${getProgressColor(persentaseRealisasi).text}`}>
                      {persentaseRealisasi.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-16 text-center">
            <BarChart2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Tidak ada data monitoring</p>
            <p className="text-sm text-slate-400 mt-1">Coba sesuaikan filter</p>
          </div>
        )}
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Di bawah 85% — Aman
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-amber-500 inline-block" />
          85–99% — Perhatian
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full bg-red-500 inline-block" />
          ≥ 100% — Over Budget
        </div>
      </div>
    </div>
  );
}