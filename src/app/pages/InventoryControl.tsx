import { useState } from "react";
import {
  Package,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Plus,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  X,
  CheckCircle,
  Warehouse,
  Users,
  Leaf,
  BarChart2,
  ShoppingCart,
  Filter,
  Eye,
  ClipboardList,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useInventory } from "../store/InventoryContext";
import type { InventoryItem } from "../store/InventoryContext";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stockStatus(item: InventoryItem): "Safe" | "Low" | "Critical" {
  const ratio = item.remaining / item.minThreshold;
  if (ratio <= 0.5) return "Critical";
  if (ratio <= 1.0) return "Low";
  return "Safe";
}

const STATUS_CLS: Record<string, string> = {
  Safe: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Low: "bg-amber-50 text-amber-700 border border-amber-200",
  Critical: "bg-red-50 text-red-700 border border-red-200",
};

const TX_CLS: Record<string, string> = {
  "Stock In": "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Distribution: "bg-sky-50 text-sky-700 border border-sky-200",
  Adjustment: "bg-amber-50 text-amber-700 border border-amber-200",
  Return: "bg-purple-50 text-purple-700 border border-purple-200",
};

const TREND_DATA = [
  { date: "May 20", stockIn: 500, stockOut: 320 },
  { date: "May 21", stockIn: 0,   stockOut: 450 },
  { date: "May 22", stockIn: 800, stockOut: 280 },
  { date: "May 23", stockIn: 0,   stockOut: 390 },
  { date: "May 24", stockIn: 600, stockOut: 510 },
  { date: "May 25", stockIn: 0,   stockOut: 220 },
  { date: "May 26", stockIn: 1200,stockOut: 375 },
  { date: "May 27", stockIn: 0,   stockOut: 490 },
];

const AREA_DIST = [
  { area: "Kebun Utara",  value: 425 },
  { area: "Kebun Selatan",value: 275 },
  { area: "Kebun Timur",  value: 320 },
  { area: "Kebun Barat",  value: 200 },
  { area: "Kebun Tengah", value: 100 },
];

const PIC_LIST = ["Budi Santoso", "Rina Marlina", "Dika Pratama", "Sari Wulandari", "Ahmad Fauzi"];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InventoryControl() {
  const { items, transactions, distributions, addStockIn, addDistribution } = useInventory();

  const [activeTab, setActiveTab] = useState<
    "overview" | "stockin" | "distribution" | "ledger" | "farmers"
  >("overview");
  const [searchLedger, setSearchLedger] = useState("");
  const [showDistForm, setShowDistForm] = useState(false);
  const [showStockInForm, setShowStockInForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Derived KPIs
  const totalRemaining = items.reduce((s, i) => s + i.remaining, 0);
  const totalIn = items.reduce((s, i) => s + i.stockIn, 0);
  const totalOut = items.reduce((s, i) => s + i.stockOut, 0);
  const criticalCount = items.filter((i) => stockStatus(i) === "Critical").length;
  const lowCount = items.filter((i) => stockStatus(i) === "Low").length;
  const variance = totalIn - totalOut;

  const alerts = [
    ...items
      .filter((i) => stockStatus(i) === "Critical")
      .map((i) => ({
        type: "critical" as const,
        msg: `${i.item} — stock critical (${i.remaining} ${i.unit} remaining)`,
        sub: `Min threshold: ${i.minThreshold} ${i.unit} · ${i.warehouse}`,
      })),
    ...items
      .filter((i) => stockStatus(i) === "Low")
      .map((i) => ({
        type: "warning" as const,
        msg: `${i.item} — stock below minimum (${i.remaining} ${i.unit})`,
        sub: `Min threshold: ${i.minThreshold} ${i.unit} · ${i.warehouse}`,
      })),
    {
      type: "info" as const,
      msg: "Distribution rate unusually high — Kebun Timur area",
      sub: "120 L Pestisida Organik distributed in single transaction",
    },
    {
      type: "warning" as const,
      msg: "Inventory variance detected — Warehouse C",
      sub: "Stock opname mismatch: -30 L Fungisida Premium",
    },
  ];

  const filteredLedger = transactions.filter(
    (t) =>
      t.item.toLowerCase().includes(searchLedger.toLowerCase()) ||
      t.id.toLowerCase().includes(searchLedger.toLowerCase()) ||
      (t.farmerName ?? "").toLowerCase().includes(searchLedger.toLowerCase())
  );

  // Farmer summary
  const farmerSummary = distributions.reduce<
    Record<string, { name: string; items: Record<string, { qty: number; unit: string; dates: string[] }>; lastPIC: string }>
  >((acc, d) => {
    if (!acc[d.farmerName]) acc[d.farmerName] = { name: d.farmerName, items: {}, lastPIC: d.pic };
    if (!acc[d.farmerName].items[d.item])
      acc[d.farmerName].items[d.item] = { qty: 0, unit: d.unit, dates: [] };
    acc[d.farmerName].items[d.item].qty += d.quantity;
    acc[d.farmerName].items[d.item].dates.push(d.date);
    acc[d.farmerName].lastPIC = d.pic;
    return acc;
  }, {});

  function flash(msg: string, isError = false) {
    if (isError) { setFormError(msg); setTimeout(() => setFormError(null), 4000); }
    else { setFormSuccess(msg); setTimeout(() => setFormSuccess(null), 4000); }
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Toast */}
      {(formSuccess || formError) && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-3 ${
            formSuccess
              ? "bg-white border-emerald-200 text-emerald-800"
              : "bg-white border-red-200 text-red-800"
          }`}
        >
          {formSuccess ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          {formSuccess || formError}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl text-gray-900 mb-1">Inventory Control</h1>
          <p className="text-sm text-gray-500">
            Stock movement, distribution tracking & farmer usage · Last sync: May 27, 2026 09:15
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStockInForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-[#1B5E40] text-[#1B5E40] rounded-lg hover:bg-[#f0faf5] transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
            Stock In
          </button>
          <button
            onClick={() => setShowDistForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#1B5E40] text-white rounded-lg hover:bg-[#154d34] transition-colors shadow-sm"
          >
            <ArrowUp className="w-4 h-4" />
            New Distribution
          </button>
          <button className="p-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: "Total Stock Balance",
            value: totalRemaining.toLocaleString(),
            sub: "units remaining",
            icon: Package,
            accent: "#1B5E40",
            bg: "#f0faf5",
            trend: null,
          },
          {
            label: "Total Stock In",
            value: totalIn.toLocaleString(),
            sub: "units received",
            icon: ArrowDown,
            accent: "#1d4ed8",
            bg: "#eff6ff",
            trend: "↑ from procurement",
          },
          {
            label: "Total Distributed",
            value: totalOut.toLocaleString(),
            sub: "units to field",
            icon: ArrowUp,
            accent: "#0369a1",
            bg: "#f0f9ff",
            trend: null,
          },
          {
            label: "Net Movement",
            value: variance >= 0 ? `+${variance.toLocaleString()}` : variance.toLocaleString(),
            sub: "In minus Out",
            icon: BarChart2,
            accent: variance >= 0 ? "#15803d" : "#b91c1c",
            bg: variance >= 0 ? "#f0fdf4" : "#fef2f2",
            trend: null,
          },
          {
            label: "Critical Stock",
            value: criticalCount.toString(),
            sub: "items below 50% min",
            icon: AlertCircle,
            accent: "#b91c1c",
            bg: "#fef2f2",
            trend: "Needs reorder",
          },
          {
            label: "Low Stock",
            value: lowCount.toString(),
            sub: "items below minimum",
            icon: AlertTriangle,
            accent: "#b45309",
            bg: "#fffbeb",
            trend: "Monitor closely",
          },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
                style={{ background: c.bg }}
              >
                <Icon className="w-4 h-4" style={{ color: c.accent }} />
              </div>
              <p className="text-xl text-gray-900 mb-0.5">{c.value}</p>
              <p className="text-xs text-gray-500 leading-tight mb-1">{c.label}</p>
              {c.trend && (
                <p className="text-xs" style={{ color: c.accent }}>
                  {c.trend}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Stock Flow Visualization ── */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-[#1B5E40]" />
          <h3 className="text-gray-900">Inventory Flow Pipeline</h3>
          <span className="text-xs text-gray-400 ml-1">Real-time stock movement chain</span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="flex items-stretch gap-0 min-w-max">
            {[
              {
                label: "Procurement / PO",
                sub: "Purchase Order",
                icon: ShoppingCart,
                val: `${items.reduce((s, i) => s + i.stockIn, 0).toLocaleString()} units`,
                color: "#1d4ed8",
                bg: "#eff6ff",
              },
              {
                label: "Warehouse Stock In",
                sub: "Goods Receipt",
                icon: Warehouse,
                val: `${items.length} SKUs`,
                color: "#0369a1",
                bg: "#f0f9ff",
              },
              {
                label: "Inventory Available",
                sub: "Current Balance",
                icon: Package,
                val: `${totalRemaining.toLocaleString()} units`,
                color: "#1B5E40",
                bg: "#f0faf5",
                highlight: true,
              },
              {
                label: "Operational Dist.",
                sub: "Field Distribution",
                icon: ClipboardList,
                val: `${distributions.length} records`,
                color: "#0369a1",
                bg: "#f0f9ff",
              },
              {
                label: "Farmer / Land Use",
                sub: "End Usage",
                icon: Users,
                val: `${Object.keys(farmerSummary).length} farmers`,
                color: "#15803d",
                bg: "#f0fdf4",
              },
              {
                label: "Stock Auto-Reduced",
                sub: "Post-Distribution",
                icon: Leaf,
                val: `${totalOut.toLocaleString()} units out`,
                color: "#6B8E23",
                bg: "#f7fee7",
              },
            ].map((step, i, arr) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center">
                  <div
                    className={`flex flex-col items-center w-36 p-3 rounded-xl border ${
                      step.highlight
                        ? "border-[#1B5E40] shadow-sm"
                        : "border-gray-100"
                    }`}
                    style={{ background: step.bg }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                      style={{ background: "white" }}
                    >
                      <Icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    <p className="text-xs text-center leading-tight mb-0.5" style={{ color: step.color }}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-400 text-center leading-tight mb-2">
                      {step.sub}
                    </p>
                    <p className="text-sm text-gray-900">{step.val}</p>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="flex flex-col items-center justify-center w-8 flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {alerts.slice(0, 4).map((a, i) => (
            <div
              key={`alert-${a.type}-${i}`}
              className={`rounded-xl px-4 py-3 border flex items-start gap-3 ${
                a.type === "critical"
                  ? "bg-red-50 border-red-200"
                  : a.type === "warning"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-sky-50 border-sky-100"
              }`}
            >
              <AlertCircle
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  a.type === "critical"
                    ? "text-red-600"
                    : a.type === "warning"
                    ? "text-amber-600"
                    : "text-sky-600"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    a.type === "critical"
                      ? "text-red-800"
                      : a.type === "warning"
                      ? "text-amber-800"
                      : "text-sky-800"
                  }`}
                >
                  {a.msg}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{a.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6 overflow-x-auto">
          {(
            [
              { key: "overview", label: "Overview" },
              { key: "stockin", label: "Stock In" },
              { key: "distribution", label: "Distribution" },
              { key: "ledger", label: "Movement Ledger" },
              { key: "farmers", label: "Farmer History" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-[#1B5E40] text-[#1B5E40]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB: OVERVIEW
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-gray-900 mb-0.5">Stock Movement Trend</h3>
                  <p className="text-sm text-gray-500">Daily Stock In vs Stock Out · May 2026</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-[#1B5E40] inline-block" />
                    Stock In
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 rounded-sm bg-[#6B8E23] inline-block" />
                    Stock Out
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={TREND_DATA}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B5E40" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#1B5E40" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6B8E23" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6B8E23" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="stockIn" stroke="#1B5E40" strokeWidth={2} fill="url(#gIn)" name="Stock In" />
                  <Area type="monotone" dataKey="stockOut" stroke="#6B8E23" strokeWidth={2} fill="url(#gOut)" name="Stock Out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <h3 className="text-gray-900 mb-1">Distribution by Area</h3>
              <p className="text-sm text-gray-500 mb-4">Units distributed · May 2026</p>
              <ResponsiveContainer width="100%" height={175}>
                <BarChart data={AREA_DIST} layout="vertical" barSize={10}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="area" type="category" width={90} stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v} units`, "Distributed"]}
                  />
                  <Bar dataKey="value" fill="#2F6B4F" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total distributed</span>
                  <span className="text-gray-900">
                    {AREA_DIST.reduce((s, a) => s + a.value, 0)} units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <InventoryTable items={items} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: STOCK IN
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "stockin" && (
        <div className="space-y-6">
          {/* Stock In summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Total Received This Month", value: `${totalIn.toLocaleString()} units`, icon: ArrowDown, color: "#1B5E40", bg: "#f0faf5" },
              { label: "Stock In Transactions", value: transactions.filter((t) => t.type === "Stock In").length.toString(), icon: ClipboardList, color: "#1d4ed8", bg: "#eff6ff" },
              { label: "PO References Linked", value: transactions.filter((t) => t.poRef).length.toString(), icon: ShoppingCart, color: "#0369a1", bg: "#f0f9ff" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: c.bg }}>
                    <Icon className="w-4 h-4" style={{ color: c.color }} />
                  </div>
                  <p className="text-xl text-gray-900 mb-1">{c.value}</p>
                  <p className="text-sm text-gray-500">{c.label}</p>
                </div>
              );
            })}
          </div>

          {/* Stock In form inline */}
          <StockInForm
            items={items}
            onSubmit={(payload) => {
              addStockIn(payload);
              flash(`Stock In recorded: ${payload.quantity} units added to ${items.find(i => i.id === payload.itemId)?.item}`);
            }}
          />

          {/* Stock In history */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 mb-0.5">Stock In History</h3>
              <p className="text-sm text-gray-500">Recent incoming stock transactions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {["Transaction ID", "Date", "Item", "Qty In", "Warehouse", "PIC", "PO Ref"].map((h) => (
                      <th key={h} className="py-3 px-5 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {transactions
                    .filter((t) => t.type === "Stock In")
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-5 text-sm text-gray-900">{t.id}</td>
                        <td className="py-3.5 px-5 text-sm text-gray-600">{t.date}</td>
                        <td className="py-3.5 px-5 text-sm text-gray-900">{t.item}</td>
                        <td className="py-3.5 px-5 text-sm">
                          <span className="text-emerald-700 font-medium">+{t.in.toLocaleString()}</span>
                        </td>
                        <td className="py-3.5 px-5 text-sm text-gray-600">{t.warehouse}</td>
                        <td className="py-3.5 px-5 text-sm text-gray-600">{t.pic}</td>
                        <td className="py-3.5 px-5 text-sm text-gray-500">{t.poRef ?? "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: DISTRIBUTION
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "distribution" && (
        <div className="space-y-6">
          {/* Distribution summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Distributions", value: distributions.length, icon: ClipboardList, color: "#1B5E40", bg: "#f0faf5" },
              { label: "Total Units Out", value: `${totalOut.toLocaleString()}`, icon: ArrowUp, color: "#0369a1", bg: "#f0f9ff" },
              { label: "Farmers Receiving", value: Object.keys(farmerSummary).length, icon: Users, color: "#6B8E23", bg: "#f7fee7" },
              { label: "Active PIC", value: PIC_LIST.length, icon: Eye, color: "#7c3aed", bg: "#f5f3ff" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: c.bg }}>
                    <Icon className="w-4 h-4" style={{ color: c.color }} />
                  </div>
                  <p className="text-xl text-gray-900 mb-1">{c.value}</p>
                  <p className="text-sm text-gray-500">{c.label}</p>
                </div>
              );
            })}
          </div>

          {/* Stock preview for selected items */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-gray-900 mb-4">Current Stock Snapshot — Auto-Reduction Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {items.slice(0, 4).map((item) => {
                const pct = Math.min(100, Math.round((item.remaining / (item.initialStock + item.stockIn)) * 100));
                const status = stockStatus(item);
                return (
                  <div key={item.id} className="rounded-lg border border-gray-100 p-4 bg-gray-50/40">
                    <p className="text-sm text-gray-900 mb-1 truncate">{item.item}</p>
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-lg text-gray-900">{item.remaining.toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{item.unit} remaining</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_CLS[status]}`}>
                        {status}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: status === "Critical" ? "#dc2626" : status === "Low" ? "#d97706" : "#1B5E40",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-gray-400">
                      <span>Initial: {item.initialStock.toLocaleString()}</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Distribution form inline */}
          <DistributionForm
            items={items}
            distributions={distributions}
            onSubmit={(payload) => {
              const ok = addDistribution(payload);
              if (ok) {
                flash(`Distribution recorded: ${payload.quantity} units to ${payload.farmerName}`);
              } else {
                flash("Insufficient stock for this distribution.", true);
              }
            }}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: MOVEMENT LEDGER
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-gray-900 mb-0.5">Inventory Movement Ledger</h3>
                <p className="text-sm text-gray-500">
                  Complete stock transaction history — SAP-style ledger
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchLedger}
                    onChange={(e) => setSearchLedger(e.target.value)}
                    placeholder="Search item, ID, farmer…"
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1B5E40] focus:bg-white transition-all w-52"
                  />
                </div>
                <button className="p-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left sticky top-0">
                    {[
                      "Date", "Tx ID", "Type", "Item", "Warehouse",
                      "IN", "OUT", "Balance", "PIC", "Farmer / Land",
                    ].map((h) => (
                      <th key={h} className="py-3 px-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredLedger.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{t.date}</td>
                      <td className="py-3 px-4 text-gray-900 font-mono text-xs">{t.id}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2.5 py-1 rounded-md border ${TX_CLS[t.type]}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 max-w-[180px] truncate">{t.item}</td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{t.warehouse}</td>
                      <td className="py-3 px-4">
                        {t.in > 0 ? (
                          <span className="text-emerald-700 font-medium">+{t.in.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {t.out > 0 ? (
                          <span className="text-red-600 font-medium">−{t.out.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-900">{t.balance.toLocaleString()}</td>
                      <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{t.pic}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs max-w-[160px]">
                        {t.farmerName ? (
                          <span>
                            {t.farmerName}
                            {t.land && <span className="block text-gray-400 truncate">{t.land}</span>}
                          </span>
                        ) : t.poRef ? (
                          <span className="text-blue-600">{t.poRef}</span>
                        ) : (
                          t.notes ?? "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">{filteredLedger.length} records</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 rounded-sm bg-emerald-100 border border-emerald-200" />
                  Stock In
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 rounded-sm bg-sky-100 border border-sky-200" />
                  Distribution
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 rounded-sm bg-amber-100 border border-amber-200" />
                  Adjustment
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB: FARMER HISTORY
      ═══════════════════════════════════════════════════════════ */}
      {activeTab === "farmers" && (
        <div className="space-y-6">
          {/* Farmer cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.values(farmerSummary).map((farmer) => {
              const totalItems = Object.keys(farmer.items).length;
              const totalQty = Object.values(farmer.items).reduce((s, v) => s + v.qty, 0);
              return (
                <div
                  key={`farmer-${farmer.name}`}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f0faf5] border border-[#c6e8d8] flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#1B5E40]" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{farmer.name}</p>
                        <p className="text-xs text-gray-400">PIC: {farmer.lastPIC}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                      {totalItems} item{totalItems > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(farmer.items).map(([itemName, data]) => (
                      <div key={itemName} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-600 truncate max-w-[180px]">{itemName}</span>
                        <span className="text-gray-900 ml-2 flex-shrink-0">
                          {data.qty.toLocaleString()} {data.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Total received</span>
                    <span className="text-sm text-gray-900">{totalQty.toLocaleString()} units</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full farmer distribution table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900 mb-0.5">Farmer Distribution Audit Log</h3>
              <p className="text-sm text-gray-500">
                Complete traceability — fertilizer & pesticide usage per farmer
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {[
                      "Dist. ID", "Date", "Farmer", "Land / Plot",
                      "Commodity Area", "Item", "Qty", "PIC", "Notes",
                    ].map((h) => (
                      <th key={h} className="py-3 px-5 text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {distributions.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-5 text-gray-900 font-mono text-xs">{d.id}</td>
                      <td className="py-3.5 px-5 text-gray-600 whitespace-nowrap">{d.date}</td>
                      <td className="py-3.5 px-5 text-gray-900">{d.farmerName}</td>
                      <td className="py-3.5 px-5 text-gray-600">{d.land}</td>
                      <td className="py-3.5 px-5 text-gray-600 text-xs">{d.commodityArea}</td>
                      <td className="py-3.5 px-5 text-gray-900 max-w-[160px] truncate">{d.item}</td>
                      <td className="py-3.5 px-5 text-gray-900">
                        {d.quantity.toLocaleString()} {d.unit}
                      </td>
                      <td className="py-3.5 px-5 text-gray-600 whitespace-nowrap">{d.pic}</td>
                      <td className="py-3.5 px-5 text-gray-500 text-xs max-w-[160px] truncate">
                        {d.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">{distributions.length} distribution records</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showStockInForm && (
        <Modal title="Stock In Transaction" onClose={() => setShowStockInForm(false)}>
          <StockInForm
            items={items}
            onSubmit={(payload) => {
              addStockIn(payload);
              setShowStockInForm(false);
              flash(`Stock In recorded: ${payload.quantity} units added to ${items.find(i => i.id === payload.itemId)?.item}`);
            }}
          />
        </Modal>
      )}
      {showDistForm && (
        <Modal title="New Distribution Transaction" onClose={() => setShowDistForm(false)}>
          <DistributionForm
            items={items}
            distributions={distributions}
            onSubmit={(payload) => {
              const ok = addDistribution(payload);
              if (ok) {
                setShowDistForm(false);
                flash(`Distribution recorded: ${payload.quantity} units to ${payload.farmerName}`);
              } else {
                flash("Insufficient stock for this distribution.", true);
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Sub: Inventory Table ─────────────────────────────────────────────────────

function InventoryTable({ items }: { items: InventoryItem[] }) {
  const [search, setSearch] = useState("");
  const filtered = items.filter(
    (i) =>
      i.item.toLowerCase().includes(search.toLowerCase()) ||
      i.warehouse.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-gray-900 mb-0.5">Stock Balance Register</h3>
          <p className="text-sm text-gray-500">Real-time inventory balance with auto-reduction</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1B5E40] focus:bg-white transition-all w-52"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left sticky top-0">
              {["Item", "Category", "Warehouse", "Initial", "Stock In", "Stock Out", "Balance", "Min Threshold", "Status", "Updated"].map((h) => (
                <th key={h} className="py-3 px-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((item) => {
              const status = stockStatus(item);
              const pct = Math.min(100, Math.round((item.remaining / (item.initialStock + item.stockIn)) * 100));
              return (
                <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="text-gray-900">{item.item}</p>
                    <p className="text-xs text-gray-400">{item.id}</p>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{item.category}</td>
                  <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">{item.warehouse}</td>
                  <td className="py-3.5 px-4 text-gray-600 text-right whitespace-nowrap">
                    {item.initialStock.toLocaleString()} {item.unit}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="text-emerald-700">+{item.stockIn.toLocaleString()}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span className="text-red-600">−{item.stockOut.toLocaleString()}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-gray-900 text-right whitespace-nowrap">
                      {item.remaining.toLocaleString()} {item.unit}
                    </p>
                    <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden w-20 ml-auto">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: status === "Critical" ? "#dc2626" : status === "Low" ? "#d97706" : "#1B5E40",
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-500 text-right whitespace-nowrap">
                    {item.minThreshold.toLocaleString()} {item.unit}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-xs px-2.5 py-1 rounded-md border ${STATUS_CLS[status]}`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">{item.lastUpdate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Sub: Modal Wrapper ───────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Sub: Stock In Form ────────────────────────────────────────────────────────

function StockInForm({
  items,
  onSubmit,
}: {
  items: InventoryItem[];
  onSubmit: (p: { itemId: string; quantity: number; warehouse: string; pic: string; poRef?: string; notes?: string }) => void;
}) {
  const [form, setForm] = useState({
    itemId: items[0]?.id ?? "",
    quantity: "",
    warehouse: "",
    pic: PIC_LIST[0],
    poRef: "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const selectedItem = items.find((i) => i.id === form.itemId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.itemId || !form.quantity || !form.warehouse) return;
    onSubmit({
      itemId: form.itemId,
      quantity: parseInt(form.quantity),
      warehouse: form.warehouse || selectedItem?.warehouse || "",
      pic: form.pic,
      poRef: form.poRef || undefined,
      notes: form.notes || undefined,
    });
    setSubmitted(true);
    setTimeout(() => {
      setForm({ itemId: items[0]?.id ?? "", quantity: "", warehouse: "", pic: PIC_LIST[0], poRef: "", notes: "" });
      setSubmitted(false);
    }, 1500);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#f0faf5] border border-[#c6e8d8] flex items-center justify-center">
          <ArrowDown className="w-4 h-4 text-[#1B5E40]" />
        </div>
        <div>
          <h3 className="text-gray-900">Stock In — Goods Receipt</h3>
          <p className="text-xs text-gray-500">Record incoming stock from procurement / supplier</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Item / SKU" required>
            <select
              value={form.itemId}
              onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value, warehouse: items.find(i => i.id === e.target.value)?.warehouse ?? "" }))}
              className={inputCls}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.item} ({i.warehouse})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Quantity" required>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                placeholder="e.g. 500"
                className={inputCls}
                required
              />
              {selectedItem && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  {selectedItem.unit}
                </span>
              )}
            </div>
          </FormField>

          <FormField label="Warehouse Destination" required>
            <input
              type="text"
              value={form.warehouse || selectedItem?.warehouse || ""}
              onChange={(e) => setForm((f) => ({ ...f, warehouse: e.target.value }))}
              placeholder="e.g. Warehouse A"
              className={inputCls}
              required
            />
          </FormField>

          <FormField label="Receiving PIC" required>
            <select
              value={form.pic}
              onChange={(e) => setForm((f) => ({ ...f, pic: e.target.value }))}
              className={inputCls}
            >
              {PIC_LIST.map((p, idx) => <option key={`pic-${idx}`}>{p}</option>)}
            </select>
          </FormField>

          <FormField label="PO Reference">
            <input
              type="text"
              value={form.poRef}
              onChange={(e) => setForm((f) => ({ ...f, poRef: e.target.value }))}
              placeholder="e.g. PO-2026-041"
              className={inputCls}
            />
          </FormField>
        </div>

        <FormField label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Additional notes…"
            rows={2}
            className={inputCls + " resize-none"}
          />
        </FormField>

        {selectedItem && form.quantity && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
            <p className="text-emerald-800 mb-1">Stock calculation preview</p>
            <div className="flex items-center gap-3 text-emerald-700">
              <span>Current: {selectedItem.remaining.toLocaleString()} {selectedItem.unit}</span>
              <span className="text-emerald-400">+</span>
              <span>{parseInt(form.quantity || "0").toLocaleString()} {selectedItem.unit}</span>
              <span className="text-emerald-400">=</span>
              <span className="font-medium">{(selectedItem.remaining + parseInt(form.quantity || "0")).toLocaleString()} {selectedItem.unit}</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            submitted
              ? "bg-emerald-500 text-white"
              : "bg-[#1B5E40] hover:bg-[#154d34] text-white"
          }`}
        >
          {submitted ? (
            <><CheckCircle className="w-4 h-4" /> Recorded Successfully</>
          ) : (
            <><Plus className="w-4 h-4" /> Record Stock In</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Sub: Distribution Form ────────────────────────────────────────────────────

function DistributionForm({
  items,
  distributions,
  onSubmit,
}: {
  items: InventoryItem[];
  distributions: { id: string }[];
  onSubmit: (p: {
    farmerName: string; land: string; commodityArea: string;
    itemId: string; quantity: number; pic: string; notes: string; date: string;
  }) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    date: today,
    farmerName: "",
    land: "",
    commodityArea: "",
    itemId: items[0]?.id ?? "",
    quantity: "",
    pic: PIC_LIST[0],
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const selectedItem = items.find((i) => i.id === form.itemId);
  const qty = parseInt(form.quantity || "0");
  const remainingAfter = selectedItem ? selectedItem.remaining - qty : 0;
  const insufficient = selectedItem ? qty > selectedItem.remaining : false;

  const nextId = `DIST-2026-${String(distributions.length + 1).padStart(3, "0")}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.farmerName || !form.land || !form.quantity || insufficient) return;
    onSubmit({
      farmerName: form.farmerName,
      land: form.land,
      commodityArea: form.commodityArea,
      itemId: form.itemId,
      quantity: qty,
      pic: form.pic,
      notes: form.notes,
      date: new Date(form.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });
    setSubmitted(true);
    setTimeout(() => {
      setForm({ date: today, farmerName: "", land: "", commodityArea: "", itemId: items[0]?.id ?? "", quantity: "", pic: PIC_LIST[0], notes: "" });
      setSubmitted(false);
    }, 1500);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center">
          <ArrowUp className="w-4 h-4 text-sky-700" />
        </div>
        <div>
          <h3 className="text-gray-900">Operational Distribution Form</h3>
          <p className="text-xs text-gray-500">Record stock-out for farmer / field distribution</p>
        </div>
        <span className="ml-auto text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded font-mono">
          {nextId}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section: Transaction Info */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Transaction Details
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Distribution Date" required>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
                required
              />
            </FormField>
            <FormField label="Operational PIC" required>
              <select
                value={form.pic}
                onChange={(e) => setForm((f) => ({ ...f, pic: e.target.value }))}
                className={inputCls}
              >
                {PIC_LIST.map((p, idx) => <option key={`pic-${idx}`}>{p}</option>)}
              </select>
            </FormField>
          </div>
        </div>

        {/* Section: Recipient */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Recipient Information
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Farmer Name" required>
              <input
                type="text"
                value={form.farmerName}
                onChange={(e) => setForm((f) => ({ ...f, farmerName: e.target.value }))}
                placeholder="e.g. Pak Sumarno"
                className={inputCls}
                required
              />
            </FormField>
            <FormField label="Land / Plot" required>
              <input
                type="text"
                value={form.land}
                onChange={(e) => setForm((f) => ({ ...f, land: e.target.value }))}
                placeholder="e.g. Blok A-12"
                className={inputCls}
                required
              />
            </FormField>
            <FormField label="Commodity / Area">
              <input
                type="text"
                value={form.commodityArea}
                onChange={(e) => setForm((f) => ({ ...f, commodityArea: e.target.value }))}
                placeholder="e.g. Kebun Utara – 12 Ha"
                className={inputCls}
              />
            </FormField>
          </div>
        </div>

        {/* Section: Item */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
            Item Details
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Item Name" required>
              <select
                value={form.itemId}
                onChange={(e) => setForm((f) => ({ ...f, itemId: e.target.value, quantity: "" }))}
                className={inputCls}
              >
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.item} — {i.remaining.toLocaleString()} {i.unit} avail.
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Quantity" required>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={selectedItem?.remaining}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 50"
                  className={`${inputCls} ${insufficient ? "border-red-300 focus:ring-red-400" : ""}`}
                  required
                />
                {selectedItem && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    {selectedItem.unit}
                  </span>
                )}
              </div>
            </FormField>
          </div>
        </div>

        <FormField label="Notes / Activity Description">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. Pemupukan dasar tanaman kopi fase vegetatif"
            rows={2}
            className={inputCls + " resize-none"}
          />
        </FormField>

        {/* Auto-reduction preview */}
        {selectedItem && form.quantity && (
          <div
            className={`rounded-lg border p-4 text-sm ${
              insufficient
                ? "bg-red-50 border-red-200"
                : "bg-[#f0faf5] border-emerald-200"
            }`}
          >
            <p className={`mb-2 font-medium ${insufficient ? "text-red-800" : "text-emerald-800"}`}>
              {insufficient ? "⚠ Insufficient stock" : "Stock auto-reduction preview"}
            </p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Current Stock ({selectedItem.item})</span>
                <span className="text-gray-900">{selectedItem.remaining.toLocaleString()} {selectedItem.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">− Distributed</span>
                <span className="text-red-600">−{qty.toLocaleString()} {selectedItem.unit}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                <span className="font-medium text-gray-700">= Remaining Stock</span>
                <span className={`font-medium ${insufficient ? "text-red-700" : "text-emerald-700"}`}>
                  {remainingAfter.toLocaleString()} {selectedItem.unit}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={insufficient}
          className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            submitted
              ? "bg-emerald-500 text-white"
              : insufficient
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-[#1B5E40] hover:bg-[#154d34] text-white"
          }`}
        >
          {submitted ? (
            <><CheckCircle className="w-4 h-4" /> Distribution Recorded</>
          ) : (
            <><ArrowUp className="w-4 h-4" /> Submit Distribution & Reduce Stock</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Micro helpers ─────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1B5E40] focus:bg-white transition-all";

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
