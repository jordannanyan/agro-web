import { useMemo } from "react";
import {
  DollarSign, TrendingUp, Users, Sprout, ShoppingCart, Factory,
  AlertTriangle, ArrowRight, FileText, CreditCard, Building2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Link } from "react-router";
import { Card } from "../components/ui/card";
import { useApi } from "../lib/hooks";
import { useAuth } from "../store/AuthContext";
import { isEntityBound } from "../lib/permissions";

interface DashboardData {
  /** Which entity these figures cover; all_entities when the viewer sees every PT. */
  scope?: { entity_id: number | null; all_entities: boolean };
  kpis: {
    farmers: number; plots: number;
    purchasing_qty: number; purchasing_value: number;
    selling_revenue: number; open_processing: number;
    pending_pr: number; pending_po: number; outstanding_total: number;
  };
  purchasing_by_scheme: { scheme: string; count: number; qty: number; value: number }[];
  trend: { period: string; purchasing_value: number; selling_revenue: number }[];
}

const fmtRp = (n: number) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
const fmtShort = (n: number) => {
  const v = Number(n || 0);
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}M`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}jt`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}rb`;
  return String(v);
};

const SCHEME_META: Record<string, { label: string; cls: string; bar: string }> = {
  BeliPutus:     { label: "Beli Putus",     cls: "text-blue-700",    bar: "bg-blue-500" },
  PreFinance:    { label: "Pre-Finance",    cls: "text-amber-700",   bar: "bg-amber-500" },
  ProfitSharing: { label: "Profit Sharing", cls: "text-emerald-700", bar: "bg-emerald-500" },
};

export default function ExecutiveDashboard() {
  const { data, loading, error } = useApi<DashboardData>("dashboard/executive");
  const { user } = useAuth();
  const k = data?.kpis;
  const bound = isEntityBound(user);

  const trend = useMemo(
    () => (data?.trend || []).map((t) => ({
      period: t.period, Pembelian: Number(t.purchasing_value || 0), Penjualan: Number(t.selling_revenue || 0),
    })),
    [data]
  );
  const schemeMax = Math.max(1, ...(data?.purchasing_by_scheme || []).map((s) => Number(s.value)));

  const kpiCards = [
    { label: "Nilai Pembelian", value: fmtRp(k?.purchasing_value ?? 0), icon: ShoppingCart, color: "text-blue-700", bg: "bg-blue-50" },
    { label: "Revenue Penjualan", value: fmtRp(k?.selling_revenue ?? 0), icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Outstanding Petani", value: fmtRp(k?.outstanding_total ?? 0), icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50" },
    { label: "Volume Beli (Kg)", value: Number(k?.purchasing_qty ?? 0).toLocaleString("id-ID"), icon: Sprout, color: "text-violet-700", bg: "bg-violet-50" },
  ];

  const stats = [
    { label: "Petani", value: k?.farmers ?? 0, icon: Users },
    { label: "Plot", value: k?.plots ?? 0, icon: Sprout },
    { label: "Processing Terbuka", value: k?.open_processing ?? 0, icon: Factory },
  ];

  const actions = [
    { count: k?.pending_pr ?? 0, label: "PR menunggu approval", to: "/procurement/purchase-request", icon: FileText, cls: "text-blue-600 bg-blue-50" },
    { count: k?.pending_po ?? 0, label: "PO menunggu approval", to: "/procurement/purchase-order", icon: FileText, cls: "text-violet-600 bg-violet-50" },
  ].filter((a) => a.count > 0);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Executive Dashboard</h1>
        <p className="text-sm text-slate-500">Ringkasan operasional lintas modul — data real-time</p>
        {/* The figures are entity-scoped, so the page says whose they are. */}
        <span className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
          bound ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
          <Building2 className="w-3.5 h-3.5" />
          {bound
            ? `Data ${user?.entity?.entities_name || `Entity #${user?.entity_id}`}`
            : "Gabungan semua entitas"}
        </span>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiCards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{c.label}</p>
            <p className={`text-xl font-bold tabular-nums ${loading ? "text-slate-300" : c.color}`}>{loading ? "…" : c.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-slate-900 font-semibold">Tren Pembelian vs Penjualan</h2>
              <p className="text-xs text-slate-400">6 periode terakhir</p>
            </div>
          </div>
          <div className="h-72">
            {trend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">{loading ? "Memuat…" : "Belum ada data"}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gPur" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gSel" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: "#94a3b8" }} width={44} />
                  <Tooltip formatter={(v: any) => fmtRp(Number(v))} />
                  <Legend />
                  <Area type="monotone" dataKey="Pembelian" stroke="#3b82f6" fill="url(#gPur)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Penjualan" stroke="#10b981" fill="url(#gSel)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Purchasing by scheme */}
        <Card className="p-5">
          <h2 className="text-slate-900 font-semibold mb-1">Pembelian per Skema</h2>
          <p className="text-xs text-slate-400 mb-4">Nilai total per skema</p>
          <div className="space-y-4">
            {(data?.purchasing_by_scheme || []).map((s) => {
              const m = SCHEME_META[s.scheme] ?? { label: s.scheme, cls: "text-slate-700", bar: "bg-slate-400" };
              return (
                <div key={s.scheme}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-medium ${m.cls}`}>{m.label}</span>
                    <span className="text-sm font-mono text-slate-600">{fmtRp(s.value)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${(Number(s.value) / schemeMax) * 100}%` }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{s.count} transaksi · {Number(s.qty).toLocaleString("id-ID")} Kg</p>
                </div>
              );
            })}
            {(!data?.purchasing_by_scheme || data.purchasing_by_scheme.length === 0) && (
              <p className="text-sm text-slate-400 text-center py-6">{loading ? "Memuat…" : "Belum ada pembelian"}</p>
            )}
          </div>
        </Card>
      </div>

      {/* Secondary stats + actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-slate-900 font-semibold mb-4">Ringkasan Master</h2>
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <s.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-slate-900 font-semibold">Perlu Tindakan</h2>
          </div>
          <div className="space-y-2">
            {actions.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">Tidak ada approval tertunda 🎉</p>}
            {actions.map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors group">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.cls}`}><a.icon className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{a.count} {a.label}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
              </Link>
            ))}
            <Link to="/prefinance/outstanding" className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-amber-600 bg-amber-50"><CreditCard className="w-4 h-4" /></div>
              <div className="flex-1"><p className="text-sm font-semibold text-slate-900">{fmtRp(k?.outstanding_total ?? 0)} outstanding petani</p></div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
