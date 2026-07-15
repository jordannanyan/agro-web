import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Plus,
  Eye,
  Download,
  Search,
  Package,
  PackageCheck,
  Truck,
  AlertTriangle,
  ChevronRight,
  ArrowRight,
  TrendingDown,
  BarChart3,
  MapPin,
  ClipboardCheck,
  Boxes,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const stockInList = [
  {
    id: "SI-2026-031",
    relatedPO: "PO-2026-067",
    relatedPR: "PR-2026-041",
    vendor: "Green Fertilizer Co.",
    receivedBy: "Budi Santoso",
    receivedDate: "Jun 1, 2026",
    warehouse: "Gudang Utama – Jambi",
    itemCount: 2,
    totalReceived: 500,
    unit: "Kg",
    status: "Verified",
    condition: "Good",
  },
  {
    id: "SI-2026-032",
    relatedPO: "PO-2026-068",
    relatedPR: "PR-2026-041",
    vendor: "AgroChem Solutions",
    receivedBy: "Rina Marlina",
    receivedDate: "Jun 2, 2026",
    warehouse: "Gudang Lapangan – Sumatra",
    itemCount: 1,
    totalReceived: 20,
    unit: "Liter",
    status: "Received",
    condition: "Good",
  },
  {
    id: "SI-2026-033",
    relatedPO: "PO-2026-071",
    relatedPR: "PR-2026-042",
    vendor: "AgroTech Supply",
    receivedBy: "Ahmad Fauzi",
    receivedDate: "Jun 3, 2026",
    warehouse: "Gudang Utama – Jambi",
    itemCount: 2,
    totalReceived: 8,
    unit: "Unit",
    status: "Draft",
    condition: "Partial",
  },
];

const inventoryItems = [
  {
    id: "STK-001",
    code: "MAT-001",
    name: "NPK Fertilizer",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Kg",
    opening: 1200,
    stockIn: 500,
    stockOut: 300,
    balance: 1400,
    minThreshold: 500,
    lastUpdated: "Jun 3, 2026",
  },
  {
    id: "STK-002",
    code: "MAT-002",
    name: "Pesticide Cypermethrin",
    category: "3_Material",
    warehouse: "Gudang Lapangan – Sumatra",
    unit: "Liter",
    opening: 50,
    stockIn: 20,
    stockOut: 15,
    balance: 55,
    minThreshold: 20,
    lastUpdated: "Jun 2, 2026",
  },
  {
    id: "STK-003",
    code: "MAT-003",
    name: "Planting Sacks Large",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Pcs",
    opening: 800,
    stockIn: 0,
    stockOut: 400,
    balance: 400,
    minThreshold: 300,
    lastUpdated: "Jun 1, 2026",
  },
  {
    id: "STK-004",
    code: "EQP-001",
    name: "Hand Sprayer 16L",
    category: "1_Investment",
    warehouse: "Gudang Utama – Jambi",
    unit: "Unit",
    opening: 5,
    stockIn: 8,
    stockOut: 2,
    balance: 11,
    minThreshold: 3,
    lastUpdated: "Jun 3, 2026",
  },
  {
    id: "STK-005",
    code: "EQP-002",
    name: "Pruning Shears Heavy Duty",
    category: "1_Investment",
    warehouse: "Gudang Lapangan – Sumatra",
    unit: "Pcs",
    opening: 10,
    stockIn: 0,
    stockOut: 7,
    balance: 3,
    minThreshold: 5,
    lastUpdated: "Jun 2, 2026",
  },
];

const distributionOrders = [
  {
    id: "DO-2026-018",
    fromWarehouse: "Gudang Utama – Jambi",
    toField: "Lahan Petani – Desa Sungai Bahar",
    farmer: "Pak Budi (Zone A)",
    items: "NPK Fertilizer 100 Kg, Planting Sacks 50 Pcs",
    itemCount: 2,
    dispatchDate: "Jun 2, 2026",
    receivedDate: "Jun 3, 2026",
    dispatchedBy: "Budi Santoso",
    relatedStockIn: "SI-2026-031",
    status: "Delivered",
  },
  {
    id: "DO-2026-019",
    fromWarehouse: "Gudang Lapangan – Sumatra",
    toField: "Lahan Petani – Desa Rimbo Bujang",
    farmer: "Pak Eko (Zone B)",
    items: "Pesticide Cypermethrin 10 Liter",
    itemCount: 1,
    dispatchDate: "Jun 3, 2026",
    receivedDate: "-",
    dispatchedBy: "Rina Marlina",
    relatedStockIn: "SI-2026-032",
    status: "In Transit",
  },
  {
    id: "DO-2026-020",
    fromWarehouse: "Gudang Utama – Jambi",
    toField: "Lahan Petani – Desa Tanjung",
    farmer: "Pak Sari (Zone C)",
    items: "NPK Fertilizer 50 Kg",
    itemCount: 1,
    dispatchDate: "-",
    receivedDate: "-",
    dispatchedBy: "-",
    relatedStockIn: "SI-2026-031",
    status: "Pending",
  },
];

const stockMovements = [
  { id: "SM-001", date: "Jun 3, 2026 09:12", type: "IN", item: "NPK Fertilizer", qty: 500, unit: "Kg", warehouse: "Gudang Utama – Jambi", ref: "SI-2026-031", pic: "Budi Santoso" },
  { id: "SM-002", date: "Jun 3, 2026 10:45", type: "OUT", item: "NPK Fertilizer", qty: 100, unit: "Kg", warehouse: "Gudang Utama – Jambi", ref: "DO-2026-018", pic: "Budi Santoso" },
  { id: "SM-003", date: "Jun 2, 2026 14:30", type: "IN", item: "Pesticide Cypermethrin", qty: 20, unit: "Liter", warehouse: "Gudang Lapangan – Sumatra", ref: "SI-2026-032", pic: "Rina Marlina" },
  { id: "SM-004", date: "Jun 2, 2026 15:00", type: "OUT", item: "Pesticide Cypermethrin", qty: 10, unit: "Liter", warehouse: "Gudang Lapangan – Sumatra", ref: "DO-2026-019", pic: "Rina Marlina" },
  { id: "SM-005", date: "Jun 1, 2026 08:00", type: "OUT", item: "Planting Sacks Large", qty: 50, unit: "Pcs", warehouse: "Gudang Utama – Jambi", ref: "DO-2026-018", pic: "Budi Santoso" },
  { id: "SM-006", date: "Jun 3, 2026 11:20", type: "IN", item: "Hand Sprayer 16L", qty: 8, unit: "Unit", warehouse: "Gudang Utama – Jambi", ref: "SI-2026-033", pic: "Ahmad Fauzi" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Verified:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    Received:   "bg-blue-50 text-blue-700 border-blue-200",
    Draft:      "bg-slate-100 text-slate-600 border-slate-200",
    Delivered:  "bg-teal-50 text-teal-700 border-teal-200",
    "In Transit":"bg-violet-50 text-violet-700 border-violet-200",
    Pending:    "bg-amber-50 text-amber-700 border-amber-200",
    Good:       "bg-emerald-50 text-emerald-700 border-emerald-200",
    Partial:    "bg-amber-50 text-amber-700 border-amber-200",
    Damaged:    "bg-red-50 text-red-700 border-red-200",
    Normal:     "bg-emerald-50 text-emerald-700 border-emerald-200",
    Low:        "bg-amber-50 text-amber-700 border-amber-200",
    Critical:   "bg-red-50 text-red-700 border-red-200",
  };
  return map[status] || map.Draft;
}

function stockStatus(item: typeof inventoryItems[0]) {
  if (item.balance <= 0) return "Critical";
  if (item.balance < item.minThreshold) return "Low";
  return "Normal";
}

// ─── Warehouse Flow Banner ────────────────────────────────────────────────────

function WarehouseFlow() {
  const steps = [
    { label: "PR", color: "bg-blue-100 text-blue-700 border-blue-200", external: true },
    { label: "PO / PayReq", color: "bg-emerald-100 text-emerald-700 border-emerald-200", external: true },
    { label: "Stock In", color: "bg-orange-100 text-orange-700 border-orange-200", active: true },
    { label: "Stock", color: "bg-violet-100 text-violet-700 border-violet-200", active: true },
    { label: "Distribution", color: "bg-teal-100 text-teal-700 border-teal-200", active: true },
    { label: "Field / Farmer", color: "bg-slate-100 text-slate-600 border-slate-200", active: true },
  ];

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <ArrowRight className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Warehouse Integration — alur setelah Procurement
        </span>
      </div>
      <div className="flex items-center flex-wrap gap-1.5">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${step.color} ${step.external ? "opacity-50" : ""}`}>
              {step.label}
              {step.external && <span className="ml-1 text-xs opacity-60">(Procurement)</span>}
            </span>
            {idx < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-2">
        Warehouse membaca data PO dari Procurement (read-only). Modul Procurement tidak berubah.
      </p>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Warehouse() {
  const navigate = useNavigate();
  const [searchStockIn, setSearchStockIn] = useState("");
  const [searchStock, setSearchStock] = useState("");
  const [searchMovement, setSearchMovement] = useState("");

  const lowStockCount = inventoryItems.filter((i) => stockStatus(i) !== "Normal").length;
  const pendingStockIn = stockinList.filter((g) => g.status === "Draft" || g.status === "Received").length;
  const pendingDO = distributionOrders.filter((d) => d.status === "Pending" || d.status === "In Transit").length;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Warehouse</h1>
        <p className="text-sm text-slate-500">
          Fairventures Agroforestry · Goods Receiving, Inventory & Distribution
        </p>
      </div>

      {/* Integration Flow */}
      <WarehouseFlow />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
            <ClipboardCheck className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{stockinList.length}</p>
          <p className="text-sm text-slate-500">Goods Receipts</p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">{pendingStockIn} pending verification</p>
        </Card>

        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
            <Boxes className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{inventoryItems.length}</p>
          <p className="text-sm text-slate-500">Stock Items</p>
          <p className={`text-xs mt-1.5 font-medium ${lowStockCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {lowStockCount > 0 ? `${lowStockCount} item stok rendah` : "Semua stok normal"}
          </p>
        </Card>

        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
            <Truck className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{distributionOrders.length}</p>
          <p className="text-sm text-slate-500">Distribution Orders</p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">{pendingDO} dalam proses</p>
        </Card>

        <Card className="p-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">{lowStockCount}</p>
          <p className="text-sm text-slate-500">Low Stock Alerts</p>
          <p className="text-xs text-slate-400 mt-1.5">
            {inventoryItems.filter((i) => stockStatus(i) === "Critical").length} critical
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stockin" className="space-y-6">
        <TabsList className="bg-white border border-slate-200">
          <TabsTrigger value="stockin" className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Stock In
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2">
            <Boxes className="w-4 h-4" />
            Stock Inventory
          </TabsTrigger>
          <TabsTrigger value="distribution" className="gap-2">
            <Truck className="w-4 h-4" />
            Distribution Orders
          </TabsTrigger>
          <TabsTrigger value="movement" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Stock Movement
          </TabsTrigger>
        </TabsList>

        {/* ── Goods Receiving Tab ── */}
        <TabsContent value="stockin">
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-semibold mb-1">Stock In Records</h2>
                <p className="text-sm text-slate-500">
                  Penerimaan barang dari vendor berdasarkan Purchase Order atau Payment Request
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Cari Stock In..." className="pl-9 w-56"
                    value={searchStockIn} onChange={(e) => setSearchStockIn(e.target.value)} />
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => navigate("/warehouse/stockin/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Stock In
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">SI Number</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Related PO</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Vendor</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Warehouse</th>
                    <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Received Date</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Condition</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockinList
                    .filter((g) =>
                      searchStockIn === "" ||
                      g.id.toLowerCase().includes(searchStockIn.toLowerCase()) ||
                      g.vendor.toLowerCase().includes(searchStockIn.toLowerCase()) ||
                      g.relatedPO.toLowerCase().includes(searchStockIn.toLowerCase())
                    )
                    .map((stockin) => (
                      <tr key={stockin.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-4 px-6 text-sm font-mono font-semibold text-orange-700">{stockin.id}</td>
                        <td className="py-4 px-6 text-sm font-mono text-emerald-600 hover:underline cursor-pointer">
                          {stockin.relatedPO}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-900">{stockin.vendor}</td>
                        <td className="py-4 px-6 text-sm text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            {stockin.warehouse}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {stockin.itemCount} item
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600">{stockin.receivedDate}</td>
                        <td className="py-4 px-6">
                          <Badge className={`border ${getStatusBadge(stockin.condition)}`}>{stockin.condition}</Badge>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={`border ${getStatusBadge(stockin.status)}`}>{stockin.status}</Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/warehouse/stockin/${stockin.id}`)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Stock Inventory Tab ── */}
        <TabsContent value="inventory">
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-semibold mb-1">Stock Inventory</h2>
                <p className="text-sm text-slate-500">Saldo stok real-time per item dan gudang</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Cari item..." className="pl-9 w-56"
                  value={searchStock} onChange={(e) => setSearchStock(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Code</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Item Name</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Warehouse</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Opening</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Stock In</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Stock Out</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Balance</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Min</th>
                    <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems
                    .filter((i) =>
                      searchStock === "" ||
                      i.name.toLowerCase().includes(searchStock.toLowerCase()) ||
                      i.code.toLowerCase().includes(searchStock.toLowerCase())
                    )
                    .map((item) => {
                      const status = stockStatus(item);
                      return (
                        <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${status === "Critical" ? "bg-red-50/30" : status === "Low" ? "bg-amber-50/20" : ""}`}>
                          <td className="py-4 px-6 text-sm font-mono text-slate-500">{item.code}</td>
                          <td className="py-4 px-6 text-sm font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              {status !== "Normal" && (
                                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${status === "Critical" ? "text-red-500" : "text-amber-500"}`} />
                              )}
                              {item.name}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500">{item.category}</td>
                          <td className="py-4 px-6 text-sm text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              {item.warehouse}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-slate-500">
                            {item.opening.toLocaleString()} {item.unit}
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-emerald-700 font-semibold">
                            +{item.stockIn.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-red-600 font-semibold">
                            -{item.stockOut.toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right font-bold text-slate-900">
                            {item.balance.toLocaleString()} {item.unit}
                          </td>
                          <td className="py-4 px-4 text-sm font-mono text-right text-slate-400">
                            {item.minThreshold.toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-center">
                            <Badge className={`border ${getStatusBadge(status)}`}>{status}</Badge>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500">{item.lastUpdated}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Distribution Orders Tab ── */}
        <TabsContent value="distribution">
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-semibold mb-1">Distribution Orders</h2>
                <p className="text-sm text-slate-500">
                  Pengiriman barang dari gudang ke lahan petani / operasional lapangan
                </p>
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => navigate("/warehouse/distribution/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Create Distribution
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">DO Number</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">From Warehouse</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Destination / Farmer</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Items</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Dispatch Date</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Source Stock In</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {distributionOrders.map((do_) => (
                    <tr key={do_.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-4 px-6 text-sm font-mono font-semibold text-teal-700">{do_.id}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {do_.fromWarehouse}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-900">
                        <div>
                          <p className="font-medium">{do_.farmer}</p>
                          <p className="text-xs text-slate-400">{do_.toField}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600">
                        <div>
                          <p className="truncate max-w-[200px]">{do_.items}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{do_.itemCount} item</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600">{do_.dispatchDate}</td>
                      <td className="py-4 px-6 text-sm font-mono text-orange-600 hover:underline cursor-pointer">
                        {do_.relatedStockIn}
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`border ${getStatusBadge(do_.status)}`}>{do_.status}</Badge>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost"><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Stock Movement Tab ── */}
        <TabsContent value="movement">
          <Card>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-slate-900 font-semibold mb-1">Stock Movement Log</h2>
                <p className="text-sm text-slate-500">Riwayat seluruh transaksi masuk dan keluar gudang</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Cari item / referensi..." className="pl-9 w-64"
                  value={searchMovement} onChange={(e) => setSearchMovement(e.target.value)} />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Date & Time</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Type</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Item</th>
                    <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Qty</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Warehouse</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">Reference</th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">PIC</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements
                    .filter((m) =>
                      searchMovement === "" ||
                      m.item.toLowerCase().includes(searchMovement.toLowerCase()) ||
                      m.ref.toLowerCase().includes(searchMovement.toLowerCase())
                    )
                    .map((mov) => (
                      <tr key={mov.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-4 px-6 text-sm font-mono text-slate-500">{mov.date}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            mov.type === "IN"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {mov.type === "IN" ? "▲ IN" : "▼ OUT"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm font-semibold text-slate-900">{mov.item}</td>
                        <td className="py-4 px-6 text-sm font-mono text-right font-semibold">
                          <span className={mov.type === "IN" ? "text-emerald-700" : "text-red-600"}>
                            {mov.type === "IN" ? "+" : "-"}{mov.qty.toLocaleString()} {mov.unit}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600">{mov.warehouse}</td>
                        <td className="py-4 px-6 text-sm font-mono text-blue-600 hover:underline cursor-pointer">
                          {mov.ref}
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-600">{mov.pic}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
