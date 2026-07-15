import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  ShoppingCart,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Package,
  Truck,
  Building2,
  Lightbulb,
  ChevronRight,
  FileText,
  AlertTriangle,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Data ────────────────────────────────────────────────────────────────────

const farmerPayments = [
  { farmer: "Pak Budi", totalCost: 45000000, paid: 30000000, remaining: 15000000, installments: "3/6", status: "On Track", nextDue: "2026-06-15" },
  { farmer: "Ibu Sri", totalCost: 38000000, paid: 38000000, remaining: 0, installments: "6/6", status: "Completed", nextDue: "-" },
  { farmer: "Pak Agus", totalCost: 52000000, paid: 20000000, remaining: 32000000, installments: "2/6", status: "Overdue", nextDue: "2026-05-20" },
  { farmer: "Pak Dedi", totalCost: 28000000, paid: 14000000, remaining: 14000000, installments: "3/6", status: "On Track", nextDue: "2026-06-10" },
  { farmer: "Ibu Sari", totalCost: 35000000, paid: 28000000, remaining: 7000000, installments: "5/6", status: "On Track", nextDue: "2026-06-01" },
  { farmer: "Pak Joko", totalCost: 42000000, paid: 14000000, remaining: 28000000, installments: "2/6", status: "Overdue", nextDue: "2026-05-15" },
];

const procurementTrend = [
  { month: "Jan", fertilizer: 120, pesticide: 45, seeds: 38, equipment: 62, logistics: 28 },
  { month: "Feb", fertilizer: 108, pesticide: 52, seeds: 42, equipment: 55, logistics: 31 },
  { month: "Mar", fertilizer: 135, pesticide: 48, seeds: 50, equipment: 70, logistics: 35 },
  { month: "Apr", fertilizer: 142, pesticide: 60, seeds: 45, equipment: 58, logistics: 29 },
  { month: "May", fertilizer: 168, pesticide: 55, seeds: 52, equipment: 75, logistics: 42 },
  { month: "Jun", fertilizer: 155, pesticide: 62, seeds: 48, equipment: 68, logistics: 38 },
];

const cashFlowData = [
  { month: "Jan", inflow: 385, outflow: 298, net: 87 },
  { month: "Feb", inflow: 362, outflow: 285, net: 77 },
  { month: "Mar", inflow: 420, outflow: 340, net: 80 },
  { month: "Apr", inflow: 408, outflow: 318, net: 90 },
  { month: "May", inflow: 452, outflow: 352, net: 100 },
  { month: "Jun", inflow: 478, outflow: 370, net: 108 },
];

const supplierCostBreakdown = [
  { name: "PT Agro Mandiri", value: 312, color: "#10B981" },
  { name: "CV Subur Jaya", value: 248, color: "#0EA5E9" },
  { name: "PT Tani Makmur", value: 195, color: "#8B5CF6" },
  { name: "UD Sumber Hasil", value: 142, color: "#F59E0B" },
  { name: "Others", value: 103, color: "#94A3B8" },
];

const budgetCategories = [
  { id: "b1", label: "Operational Procurement", used: 420, total: 600, color: "#10B981", icon: ShoppingCart },
  { id: "b2", label: "Warehouse & Logistics", used: 185, total: 250, color: "#0EA5E9", icon: Building2 },
  { id: "b3", label: "Distribution & Delivery", used: 148, total: 200, color: "#8B5CF6", icon: Truck },
  { id: "b4", label: "Operational Overhead", used: 92, total: 150, color: "#F59E0B", icon: Zap },
];

const pendingPayments = [
  { id: "INV-2026-0841", supplier: "PT Agro Mandiri", amount: 84500000, dueDate: "2026-06-05", type: "Fertilizer", status: "Pending Approval", daysLeft: 8 },
  { id: "INV-2026-0840", supplier: "CV Subur Jaya", amount: 52300000, dueDate: "2026-06-02", type: "Pesticide", status: "Overdue", daysLeft: -2 },
  { id: "INV-2026-0838", supplier: "PT Tani Makmur", amount: 31800000, dueDate: "2026-06-10", type: "Seeds", status: "Scheduled", daysLeft: 13 },
  { id: "INV-2026-0837", supplier: "UD Sumber Hasil", amount: 28600000, dueDate: "2026-05-31", type: "Equipment", status: "Overdue", daysLeft: -3 },
  { id: "INV-2026-0835", supplier: "PT Agro Mandiri", amount: 19200000, dueDate: "2026-06-15", type: "Packaging", status: "Pending Approval", daysLeft: 18 },
];

const executiveInsights = [
  {
    id: "ins-1",
    type: "warning",
    icon: TrendingUp,
    title: "Procurement Spending Up 18%",
    body: "Fertilizer procurement surged Rp 168M this month driven by seasonal urea demand. Q2 budget headroom: Rp 180M.",
    tag: "Procurement",
    color: "amber",
  },
  {
    id: "ins-2",
    type: "positive",
    icon: TrendingDown,
    title: "Warehouse Cost Decreased 7%",
    body: "Consolidated shipment strategy reduced warehouse handling fees by Rp 18M vs April. Trend sustainable.",
    tag: "Warehouse",
    color: "emerald",
  },
  {
    id: "ins-3",
    type: "alert",
    icon: AlertTriangle,
    title: "Anomaly: Region B Distribution",
    body: "Distribution expense in Region B exceeded monthly baseline by 23%. Root cause: unplanned last-mile rerouting.",
    tag: "Distribution",
    color: "sky",
  },
  {
    id: "ins-4",
    type: "positive",
    icon: Activity,
    title: "Supplier Payment Health 91%",
    body: "91% of outstanding supplier invoices are on-schedule. 2 overdue invoices totalling Rp 80.9M require immediate action.",
    tag: "Finance",
    color: "purple",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}K`;
  return `Rp ${n.toLocaleString()}`;
};

const fmtShort = (v: number) => `${v}M`;

const tooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #E2E8F0",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  fontSize: "12px",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-slate-900" style={{ fontSize: 15, fontWeight: 600 }}>{title}</h3>
        {subtitle && <p className="text-slate-500 mt-0.5" style={{ fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Badge({ label, variant }: { label: string; variant: "emerald" | "sky" | "amber" | "red" | "slate" | "purple" }) {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  }[variant];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border ${cls}`} style={{ fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  );
}

function MiniStat({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-slate-500" style={{ fontSize: 12 }}>{label}</span>
      <div className="flex items-center gap-1">
        {up !== undefined && (
          up
            ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            : <ArrowDownRight className="w-3 h-3 text-red-400" />
        )}
        <span className="text-slate-800 tabular-nums" style={{ fontSize: 12, fontWeight: 600 }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Financial() {
  const totalOutstanding = farmerPayments.reduce((s, p) => s + p.remaining, 0);
  const totalCollected = farmerPayments.reduce((s, p) => s + p.paid, 0);
  const overdueCount = farmerPayments.filter((p) => p.status === "Overdue").length;
  const totalProcurement = procurementTrend.reduce((s, m) => s + m.fertilizer + m.pesticide + m.seeds + m.equipment + m.logistics, 0);
  const pendingInvoiceTotal = pendingPayments.reduce((s, p) => s + p.amount, 0);
  const totalBudgetUsed = budgetCategories.reduce((s, b) => s + b.used, 0);
  const totalBudget = budgetCategories.reduce((s, b) => s + b.total, 0);

  return (
    <div className="space-y-8">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full" style={{ fontWeight: 600 }}>
              Finance Intelligence
            </span>
          </div>
          <h1 className="text-slate-900 mb-1" style={{ fontSize: 26, fontWeight: 700 }}>Executive Finance Overview</h1>
          <p className="text-slate-500" style={{ fontSize: 14 }}>
            Supply chain financial performance · May 2026 · AgroSupply Operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-slate-500" style={{ fontSize: 11 }}>Last updated</p>
            <p className="text-slate-700" style={{ fontSize: 12, fontWeight: 600 }}>Today, 08:42 WIB</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors" style={{ fontSize: 13, fontWeight: 500 }}>
            <FileText className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Executive KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            id: "kpi-1",
            label: "Total Procurement",
            value: `Rp ${totalProcurement}M`,
            delta: "+18%",
            up: true,
            sub: "vs last month",
            icon: ShoppingCart,
            dot: "bg-emerald-500",
          },
          {
            id: "kpi-2",
            label: "Operational Cost",
            value: "Rp 352M",
            delta: "-7%",
            up: false,
            sub: "May 2026",
            icon: Zap,
            dot: "bg-sky-500",
          },
          {
            id: "kpi-3",
            label: "Outstanding Payments",
            value: fmt(totalOutstanding),
            delta: `${overdueCount} overdue`,
            up: false,
            sub: "farmer installments",
            icon: Clock,
            dot: "bg-amber-500",
          },
          {
            id: "kpi-4",
            label: "Budget Utilization",
            value: `${Math.round((totalBudgetUsed / totalBudget) * 100)}%`,
            delta: "On track",
            up: true,
            sub: `Rp ${totalBudgetUsed}M / Rp ${totalBudget}M`,
            icon: BarChart2,
            dot: "bg-violet-500",
          },
          {
            id: "kpi-5",
            label: "Distribution Expense",
            value: "Rp 148M",
            delta: "+5%",
            up: false,
            sub: "incl. Region B",
            icon: Truck,
            dot: "bg-rose-400",
          },
          {
            id: "kpi-6",
            label: "Supplier Health",
            value: "91%",
            delta: "2 overdue",
            up: false,
            sub: `${pendingPayments.length} invoices`,
            icon: Building2,
            dot: "bg-teal-500",
          },
        ].map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/60 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className={`w-2 h-2 rounded-full ${kpi.dot}`} />
              <kpi.icon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-1 truncate" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{kpi.label}</p>
            <p className="text-slate-900 tabular-nums mb-2" style={{ fontSize: 20, fontWeight: 700 }}>{kpi.value}</p>
            <div className="flex items-center gap-1.5">
              {kpi.up
                ? <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                : <ArrowDownRight className="w-3 h-3 text-amber-500" />}
              <span className={`tabular-nums ${kpi.up ? "text-emerald-600" : "text-amber-600"}`} style={{ fontSize: 11, fontWeight: 600 }}>{kpi.delta}</span>
              <span className="text-slate-400" style={{ fontSize: 11 }}>· {kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row 1: Procurement Trend + Supplier Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Procurement Spending Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
          <SectionHeader
            title="Procurement Cost Analytics"
            subtitle="Monthly spending by category (Rp Million)"
            action={
              <Badge label="Live Data" variant="emerald" />
            }
          />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={procurementTrend} barSize={10} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`Rp ${v}M`, ""]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="fertilizer" name="Fertilizer" fill="#10B981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pesticide" name="Pesticide" fill="#0EA5E9" radius={[3, 3, 0, 0]} />
              <Bar dataKey="seeds" name="Seeds" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="equipment" name="Equipment" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="logistics" name="Logistics" fill="#94A3B8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Supplier Cost Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
          <SectionHeader title="Supplier Cost Share" subtitle="Cumulative YTD (Rp Million)" />
          <div className="flex-1 flex flex-col justify-between">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={supplierCostBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {supplierCostBreakdown.map((entry, i) => (
                    <Cell key={`cell-supplier-${i}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`Rp ${v}M`, ""]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {supplierCostBreakdown.map((s, i) => (
                <div key={`sleg-${i}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-slate-600 truncate" style={{ fontSize: 11 }}>{s.name}</span>
                  </div>
                  <span className="text-slate-800 tabular-nums" style={{ fontSize: 11, fontWeight: 600 }}>Rp {s.value}M</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row 2: Cash Flow + Budget Monitoring ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cash Flow Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionHeader
            title="Cash Flow Overview"
            subtitle="Monthly inflow vs outflow (Rp Million)"
            action={<Badge label="H1 2026" variant="sky" />}
          />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cashFlowData}>
              <defs>
                <linearGradient id="gradInflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOutflow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.10} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" stroke="#94A3B8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11, fontFamily: "DM Mono, monospace" }} axisLine={false} tickLine={false} tickFormatter={fmtShort} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`Rp ${v}M`, ""]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#10B981" strokeWidth={2} fill="url(#gradInflow)" dot={false} />
              <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#0EA5E9" strokeWidth={2} fill="url(#gradOutflow)" dot={false} />
              <Line type="monotone" dataKey="net" name="Net Cash" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 3" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Monitoring */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <SectionHeader
            title="Budget Utilization Monitor"
            subtitle="Operational budget consumption by department"
            action={<Badge label="May 2026" variant="slate" />}
          />
          <div className="space-y-5">
            {budgetCategories.map((cat) => {
              const pct = Math.round((cat.used / cat.total) * 100);
              const isHigh = pct >= 80;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      <span className="text-slate-700" style={{ fontSize: 13, fontWeight: 500 }}>{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 tabular-nums" style={{ fontSize: 11 }}>Rp {cat.used}M / Rp {cat.total}M</span>
                      <span
                        className="tabular-nums"
                        style={{ fontSize: 12, fontWeight: 700, color: isHigh ? "#F59E0B" : cat.color }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: isHigh ? "#F59E0B" : cat.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Budget summary */}
          <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4">
            <div>
              <p className="text-slate-400 mb-1" style={{ fontSize: 11 }}>Total Budget</p>
              <p className="text-slate-800 tabular-nums" style={{ fontSize: 14, fontWeight: 700 }}>Rp {totalBudget}M</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1" style={{ fontSize: 11 }}>Utilized</p>
              <p className="text-emerald-600 tabular-nums" style={{ fontSize: 14, fontWeight: 700 }}>Rp {totalBudgetUsed}M</p>
            </div>
            <div>
              <p className="text-slate-400 mb-1" style={{ fontSize: 11 }}>Remaining</p>
              <p className="text-slate-800 tabular-nums" style={{ fontSize: 14, fontWeight: 700 }}>Rp {totalBudget - totalBudgetUsed}M</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Queue + Executive Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Pending Supplier Payments */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200">
          <div className="p-6 border-b border-slate-100 flex items-start justify-between">
            <div>
              <h3 className="text-slate-900" style={{ fontSize: 15, fontWeight: 600 }}>Supplier Payment Queue</h3>
              <p className="text-slate-500 mt-0.5" style={{ fontSize: 13 }}>
                Pending invoices · Total {fmt(pendingInvoiceTotal)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={`${pendingPayments.filter(p => p.status === "Overdue").length} Overdue`} variant="red" />
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {pendingPayments.map((inv) => {
              const isOverdue = inv.status === "Overdue";
              const isPending = inv.status === "Pending Approval";
              return (
                <div key={inv.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? "bg-red-50" : isPending ? "bg-amber-50" : "bg-emerald-50"}`}>
                    {isOverdue
                      ? <AlertCircle className="w-4 h-4 text-red-500" />
                      : isPending
                      ? <Clock className="w-4 h-4 text-amber-500" />
                      : <CheckCircle className="w-4 h-4 text-emerald-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-slate-800 truncate" style={{ fontSize: 13, fontWeight: 600 }}>{inv.supplier}</span>
                      <span className="text-slate-400" style={{ fontSize: 11 }}>·</span>
                      <span className="text-slate-500" style={{ fontSize: 11 }}>{inv.id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400" style={{ fontSize: 11 }}>{inv.type}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400" style={{ fontSize: 11 }}>Due {inv.dueDate}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-slate-900 tabular-nums" style={{ fontSize: 13, fontWeight: 700 }}>{fmt(inv.amount)}</p>
                    <div className="mt-1">
                      <Badge
                        label={isOverdue ? `${Math.abs(inv.daysLeft)}d overdue` : inv.status}
                        variant={isOverdue ? "red" : isPending ? "amber" : "emerald"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-4 border-t border-slate-100">
            <button className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 transition-colors" style={{ fontSize: 13, fontWeight: 500 }}>
              View all invoices <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Executive Insights */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <div>
              <h3 className="text-slate-900" style={{ fontSize: 15, fontWeight: 600 }}>Executive Insights</h3>
              <p className="text-slate-400" style={{ fontSize: 11 }}>AI-generated · May 28, 2026</p>
            </div>
          </div>
          <div className="space-y-3 flex-1">
            {executiveInsights.map((ins) => {
              const accent = {
                amber: { bg: "bg-amber-50", border: "border-amber-100", dot: "bg-amber-400", tag: "amber" as const },
                emerald: { bg: "bg-emerald-50", border: "border-emerald-100", dot: "bg-emerald-400", tag: "emerald" as const },
                sky: { bg: "bg-sky-50", border: "border-sky-100", dot: "bg-sky-400", tag: "sky" as const },
                purple: { bg: "bg-violet-50", border: "border-violet-100", dot: "bg-violet-400", tag: "purple" as const },
              }[ins.color];
              return (
                <div key={ins.id} className={`rounded-xl border p-3.5 ${accent.bg} ${accent.border}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${accent.dot}`} />
                    <div>
                      <p className="text-slate-800 mb-1" style={{ fontSize: 12, fontWeight: 600 }}>{ins.title}</p>
                      <p className="text-slate-600" style={{ fontSize: 11, lineHeight: 1.5 }}>{ins.body}</p>
                      <div className="mt-2">
                        <Badge label={ins.tag} variant={accent.tag} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Financial Health Metrics ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-slate-900" style={{ fontSize: 15, fontWeight: 600 }}>Financial Health Overview</h3>
            <p className="text-slate-500 mt-0.5" style={{ fontSize: 13 }}>Key operational performance metrics · H1 2026</p>
          </div>
          <Badge label="Q2 Report" variant="slate" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { id: "fh-1", label: "Cash Flow Efficiency", value: "28.5%", sub: "Net margin on operations", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
            { id: "fh-2", label: "Procurement ROI", value: "3.2x", sub: "Output value per Rp spent", icon: TrendingUp, color: "text-sky-600", bg: "bg-sky-50" },
            { id: "fh-3", label: "Supplier Performance", value: "94.1%", sub: "On-time delivery rate", icon: Building2, color: "text-violet-600", bg: "bg-violet-50" },
            { id: "fh-4", label: "Cost per Unit", value: "Rp 8,240", sub: "Average per kg distributed", icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
          ].map((m) => (
            <div key={m.id} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center flex-shrink-0`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div>
                <p className="text-slate-900 tabular-nums" style={{ fontSize: 22, fontWeight: 700 }}>{m.value}</p>
                <p className="text-slate-700 mt-0.5" style={{ fontSize: 12, fontWeight: 500 }}>{m.label}</p>
                <p className="text-slate-400 mt-0.5" style={{ fontSize: 11 }}>{m.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Mini chart strip */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-slate-500 mb-4" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Net Cash Flow Trend</p>
          <ResponsiveContainer width="100%" height={80}>
            <LineChart data={cashFlowData}>
              <XAxis dataKey="month" stroke="#CBD5E1" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`Rp ${v}M`, "Net"]} />
              <Line type="monotone" dataKey="net" stroke="#10B981" strokeWidth={2.5} dot={{ fill: "#10B981", r: 3, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Farmer Installments Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-slate-900" style={{ fontSize: 15, fontWeight: 600 }}>Farmer Installment Tracking</h3>
            <p className="text-slate-500 mt-0.5" style={{ fontSize: 13 }}>
              {farmerPayments.length} active accounts · Total collected {fmt(totalCollected)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge label={`${overdueCount} Overdue`} variant="red" />
            <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-colors"
              style={{ fontSize: 13 }}
            >
              <option>All Status</option>
              <option>On Track</option>
              <option>Overdue</option>
              <option>Completed</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/70">
                <th className="text-left py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Farmer</th>
                <th className="text-right py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Total</th>
                <th className="text-right py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Paid</th>
                <th className="text-right py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Remaining</th>
                <th className="text-center py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Terms</th>
                <th className="text-center py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Next Due</th>
                <th className="text-center py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Status</th>
                <th className="py-3 px-6 text-slate-500" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {farmerPayments.map((payment) => {
                const progress = (payment.paid / payment.totalCost) * 100;
                const isOverdue = payment.status === "Overdue";
                const isDone = payment.status === "Completed";
                return (
                  <tr key={`payment-${payment.farmer}`} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                        <span className="text-slate-800" style={{ fontSize: 13, fontWeight: 500 }}>{payment.farmer}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right text-slate-800 tabular-nums" style={{ fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                      {fmt(payment.totalCost)}
                    </td>
                    <td className="py-4 px-6 text-right text-emerald-600 tabular-nums" style={{ fontSize: 13, fontFamily: "DM Mono, monospace", fontWeight: 600 }}>
                      {fmt(payment.paid)}
                    </td>
                    <td className="py-4 px-6 text-right text-slate-700 tabular-nums" style={{ fontSize: 13, fontFamily: "DM Mono, monospace" }}>
                      {payment.remaining > 0 ? fmt(payment.remaining) : "—"}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-500 tabular-nums" style={{ fontSize: 12, fontFamily: "DM Mono, monospace" }}>
                      {payment.installments}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-500" style={{ fontSize: 12 }}>
                      {payment.nextDue}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <Badge
                        label={payment.status}
                        variant={isDone ? "emerald" : isOverdue ? "red" : "sky"}
                      />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: isOverdue ? "#F59E0B" : isDone ? "#10B981" : "#0EA5E9",
                            }}
                          />
                        </div>
                        <span className="text-slate-500 tabular-nums w-10 text-right" style={{ fontSize: 11, fontFamily: "DM Mono, monospace" }}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <MiniStat label="Total collected" value={fmt(totalCollected)} up={true} />
            <MiniStat label="Outstanding" value={fmt(totalOutstanding)} up={false} />
          </div>
          <div className="flex items-center gap-2">
            {[
              { id: "sum-1", dot: "bg-sky-400", label: "On Track" },
              { id: "sum-2", dot: "bg-amber-400", label: "Overdue" },
              { id: "sum-3", dot: "bg-emerald-400", label: "Completed" },
            ].map((l) => (
              <div key={l.id} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${l.dot}`} />
                <span className="text-slate-500" style={{ fontSize: 11 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
