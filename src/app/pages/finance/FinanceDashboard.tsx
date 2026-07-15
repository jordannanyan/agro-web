import { useState } from "react";
import { BarChart2, TrendingUp, TrendingDown, Wallet, Link as LinkIcon } from "lucide-react";
import { Link } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "../../components/ui/card";

const budgetVsActualData = [
  { bulan: "Jan", budget: 450, aktual: 380 },
  { bulan: "Feb", budget: 420, aktual: 395 },
  { bulan: "Mar", budget: 480, aktual: 460 },
  { bulan: "Apr", budget: 500, aktual: 430 },
  { bulan: "Mei", budget: 520, aktual: 510 },
  { bulan: "Jun", budget: 490, aktual: 345 },
];

const MONTHS = ["Januari", "Februari", "Maret","April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const YEARS = ["2026","2025","2024"];

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  fontSize: "12px",
};

export default function FinanceDashboard() {
  const [bulan, setBulan] = useState("6");
  const [tahun, setTahun] = useState("2026");

  const totalBudget = budgetVsActualData.reduce((s, d) => s + d.budget, 0);
  const totalAktual = budgetVsActualData.reduce((s, d) => s + d.aktual, 0);
  const sisaBudget = totalBudget - totalAktual;
  const persentaseRealisasi = totalBudget > 0 ? ((totalAktual / totalBudget) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl text-slate-900 mb-1">Dashboard Finance</h1>
          <p className="text-sm text-slate-500">
            Ringkasan Budget, Realisasi, dan Sisa Budget operasional PPIC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={String(i + 1)}>{m}</option>
            ))}
          </select>
          <select
            value={tahun}
            onChange={(e) => setTahun(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: "kpi-1",
            label: "Total Budget",
            value: `Rp ${totalBudget}M`,
            sub: "Anggaran periode ini",
            icon: BarChart2,
            color: "text-blue-600",
            bg: "bg-blue-50",
            dot: "bg-blue-500",
          },
          {
            id: "kpi-2",
            label: "Total Aktual",
            value: `Rp ${totalAktual}M`,
            sub: "Realisasi s.d. sekarang",
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            dot: "bg-emerald-500",
          },
          {
            id: "kpi-3",
            label: "Sisa Budget",
            value: `Rp ${sisaBudget}M`,
            sub: "Budget belum terpakai",
            icon: Wallet,
            color: "text-amber-600",
            bg: "bg-amber-50",
            dot: "bg-amber-500",
          },
          {
            id: "kpi-4",
            label: "Persentase Realisasi",
            value: `${persentaseRealisasi}%`,
            sub: "Aktual / Budget × 100%",
            icon: TrendingDown,
            color: "text-violet-600",
            bg: "bg-violet-50",
            dot: "bg-violet-500",
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
            <p className="text-2xl text-slate-900 font-bold tabular-nums mb-1">{kpi.value}</p>
            <p className="text-xs text-slate-400">{kpi.sub}</p>
          </Card>
        ))}
      </div>

      {/* Budget vs Aktual Chart */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-slate-900 font-semibold">Budget vs Aktual per Bulan</h3>
            <p className="text-sm text-slate-500 mt-0.5">Perbandingan anggaran dan realisasi (Rp Juta)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={budgetVsActualData} barSize={20} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="bulan" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`Rp ${v}M`, ""]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="budget" name="Budget" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="aktual" name="Aktual" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Kelola Budget", desc: "Buat dan edit anggaran per kategori", path: "/financial/budget", color: "border-blue-200 hover:border-blue-300 hover:bg-blue-50/50" },
          { label: "Import Aktual", desc: "Upload data realisasi dari Finance", path: "/financial/actual", color: "border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50" },
          { label: "Budget Monitoring", desc: "Monitor realisasi vs anggaran detail", path: "/financial/monitoring", color: "border-violet-200 hover:border-violet-300 hover:bg-violet-50/50" },
        ].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block p-5 rounded-2xl border bg-white transition-all ${item.color}`}
          >
            <p className="text-slate-900 font-semibold mb-1">{item.label}</p>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
