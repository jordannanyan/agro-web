import { useNavigate } from "react-router";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Truck,
  ClipboardCheck,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export default function WarehouseDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl text-slate-900 mb-1">Warehouse Dashboard</h1>
        <p className="text-sm text-slate-500">
          Fairventures Agroforestry · Warehouse Operations Overview
        </p>
      </div>

      {/* Integration Flow */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Warehouse Integration — alur setelah Procurement
          </span>
        </div>
        <div className="flex items-center flex-wrap gap-1.5">
          {[
            { label: "PR", color: "bg-blue-100 text-blue-700 border-blue-200", external: true },
            { label: "PO / PayReq", color: "bg-emerald-100 text-emerald-700 border-emerald-200", external: true },
            { label: "Stock In", color: "bg-orange-100 text-orange-700 border-orange-200" },
            { label: "Inventory", color: "bg-violet-100 text-violet-700 border-violet-200" },
            { label: "Distribution", color: "bg-teal-100 text-teal-700 border-teal-200" },
            { label: "Field / Farmer", color: "bg-slate-100 text-slate-600 border-slate-200" },
          ].map((step, idx, arr) => (
            <div key={step.label} className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${step.color} ${step.external ? "opacity-50" : ""}`}>
                {step.label}
                {step.external && <span className="ml-1 text-xs opacity-60">(Procurement)</span>}
              </span>
              {idx < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Warehouse membaca data PO dari Procurement (read-only). Modul Procurement tidak berubah.
        </p>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/warehouse/stockin")}>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
            <ClipboardCheck className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">15</p>
          <p className="text-sm text-slate-500">Stock In Records</p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">3 pending verification</p>
        </Card>

        <Card className="p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/warehouse/inventory")}>
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">124</p>
          <p className="text-sm text-slate-500">Stock Items</p>
          <p className="text-xs text-red-600 mt-1.5 font-medium">6 items below minimum</p>
        </Card>

        <Card className="p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/warehouse/distribution")}>
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-3">
            <Truck className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">28</p>
          <p className="text-sm text-slate-500">Distribution Orders</p>
          <p className="text-xs text-amber-600 mt-1.5 font-medium">5 in transit</p>
        </Card>

        <Card className="p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/warehouse/reorder")}>
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl text-slate-900 font-bold mb-0.5">6</p>
          <p className="text-sm text-slate-500">Low Stock Alerts</p>
          <p className="text-xs text-slate-400 mt-1.5">2 critical</p>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Stock In */}
        <Card>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 font-semibold">Recent Stock In</h2>
              <button
                onClick={() => navigate("/warehouse/stockin")}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {[
              { id: "SI-2026-031", item: "NPK Fertilizer", qty: "500 Kg", status: "Complete", color: "emerald" },
              { id: "SI-2026-032", item: "Pesticide Cypermethrin", qty: "20 L", status: "Partial", color: "amber" },
              { id: "SI-2026-033", item: "Hand Sprayer 16L", qty: "8 Unit", status: "Complete", color: "emerald" },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-mono font-semibold text-orange-700">{item.id}</p>
                  <p className="text-xs text-slate-500">{item.item} · {item.qty}</p>
                </div>
                <Badge className={`border bg-${item.color}-50 text-${item.color}-700 border-${item.color}-200`}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Distributions */}
        <Card>
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 font-semibold">Recent Distributions</h2>
              <button
                onClick={() => navigate("/warehouse/distribution")}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {[
              { id: "DO-2026-018", dest: "Desa Sungai Bahar", status: "Delivered", color: "teal" },
              { id: "DO-2026-019", dest: "Desa Rimbo Bujang", status: "In Transit", color: "violet" },
              { id: "DO-2026-020", dest: "Desa Tanjung", status: "Pending", color: "amber" },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-mono font-semibold text-teal-700">{item.id}</p>
                  <p className="text-xs text-slate-500">{item.dest}</p>
                </div>
                <Badge className={`border bg-${item.color}-50 text-${item.color}-700 border-${item.color}-200`}>
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-slate-900 font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/warehouse/stockin/create")}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left"
          >
            <ClipboardCheck className="w-5 h-5 text-emerald-600 mb-2" />
            <p className="text-sm font-semibold text-slate-800">New Stock In</p>
            <p className="text-xs text-slate-500 mt-0.5">Record incoming goods</p>
          </button>

          <button
            onClick={() => navigate("/warehouse/distribution/create")}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all text-left"
          >
            <Truck className="w-5 h-5 text-teal-600 mb-2" />
            <p className="text-sm font-semibold text-slate-800">New Distribution</p>
            <p className="text-xs text-slate-500 mt-0.5">Create distribution order</p>
          </button>

          <button
            onClick={() => navigate("/warehouse/stock-opname")}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-violet-500 hover:bg-violet-50 transition-all text-left"
          >
            <Package className="w-5 h-5 text-violet-600 mb-2" />
            <p className="text-sm font-semibold text-slate-800">Stock Opname</p>
            <p className="text-xs text-slate-500 mt-0.5">Physical stock count</p>
          </button>

          <button
            onClick={() => navigate("/warehouse/reorder")}
            className="p-4 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 transition-all text-left"
          >
            <AlertTriangle className="w-5 h-5 text-red-600 mb-2" />
            <p className="text-sm font-semibold text-slate-800">Reorder Monitoring</p>
            <p className="text-xs text-slate-500 mt-0.5">Check low stock items</p>
          </button>
        </div>
      </Card>
    </div>
  );
}
