import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Search,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Save,
  Send,
  Package,
  ChevronDown,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

interface StockOpnameItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  warehouse: string;
  unit: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  status: "Match" | "Shortage" | "Excess";
  notes: string;
  lastUpdated: string;
}

const mockOpnameData: StockOpnameItem[] = [
  {
    id: "OP-001",
    itemCode: "MAT-001",
    itemName: "NPK Fertilizer 15-15-15",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Kg",
    systemStock: 1400,
    physicalStock: 1400,
    difference: 0,
    status: "Match",
    notes: "",
    lastUpdated: "2026-06-03",
  },
  {
    id: "OP-002",
    itemCode: "MAT-002",
    itemName: "Pesticide Cypermethrin 100EC",
    category: "3_Material",
    warehouse: "Gudang Lapangan – Sumatra",
    unit: "Liter",
    systemStock: 55,
    physicalStock: 50,
    difference: -5,
    status: "Shortage",
    notes: "1 jerigen bocor",
    lastUpdated: "2026-06-02",
  },
  {
    id: "OP-003",
    itemCode: "MAT-003",
    itemName: "Planting Sacks Large",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Pcs",
    systemStock: 400,
    physicalStock: 410,
    difference: 10,
    status: "Excess",
    notes: "Ditemukan 10 pcs di area storage lain",
    lastUpdated: "2026-06-01",
  },
  {
    id: "OP-004",
    itemCode: "EQP-001",
    itemName: "Hand Sprayer 16L",
    category: "1_Investment",
    warehouse: "Gudang Utama – Jambi",
    unit: "Unit",
    systemStock: 11,
    physicalStock: 11,
    difference: 0,
    status: "Match",
    notes: "",
    lastUpdated: "2026-06-03",
  },
  {
    id: "OP-005",
    itemCode: "EQP-002",
    itemName: "Pruning Shears Heavy Duty",
    category: "1_Investment",
    warehouse: "Gudang Lapangan – Sumatra",
    unit: "Pcs",
    systemStock: 3,
    physicalStock: 2,
    difference: -1,
    status: "Shortage",
    notes: "1 unit rusak parah, sudah dibuang",
    lastUpdated: "2026-06-02",
  },
  {
    id: "OP-006",
    itemCode: "MAT-004",
    itemName: "Organic Compost",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Kg",
    systemStock: 2000,
    physicalStock: 2000,
    difference: 0,
    status: "Match",
    notes: "",
    lastUpdated: "2026-06-02",
  },
];

const WAREHOUSES = ["All Warehouses", "Gudang Utama – Jambi", "Gudang Lapangan – Sumatra", "Gudang Lapangan – Sarolangun"];
const STATUS_FILTER = ["All Status", "Match", "Shortage", "Excess"];

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Match: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Shortage: "bg-red-50 text-red-700 border-red-200",
    Excess: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return map[status] || map.Match;
}

function getStatusIcon(status: string) {
  if (status === "Match") return <CheckCircle className="w-4 h-4 text-emerald-600" />;
  if (status === "Shortage") return <XCircle className="w-4 h-4 text-red-600" />;
  return <AlertTriangle className="w-4 h-4 text-amber-600" />;
}

export default function StockOpname() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All Warehouses");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [opnameData, setOpnameData] = useState(mockOpnameData);
  const [isEditMode, setIsEditMode] = useState(false);

  const filteredData = opnameData.filter((item) => {
    const matchSearch =
      search === "" ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase());

    const matchWarehouse = selectedWarehouse === "All Warehouses" || item.warehouse === selectedWarehouse;
    const matchStatus = selectedStatus === "All Status" || item.status === selectedStatus;

    return matchSearch && matchWarehouse && matchStatus;
  });

  const updatePhysicalStock = (id: string, value: number) => {
    setOpnameData((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const diff = value - item.systemStock;
          let status: "Match" | "Shortage" | "Excess" = "Match";
          if (diff < 0) status = "Shortage";
          else if (diff > 0) status = "Excess";

          return {
            ...item,
            physicalStock: value,
            difference: diff,
            status,
          };
        }
        return item;
      })
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setOpnameData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, notes } : item))
    );
  };

  const totalItems = filteredData.length;
  const matchCount = filteredData.filter((i) => i.status === "Match").length;
  const shortageCount = filteredData.filter((i) => i.status === "Shortage").length;
  const excessCount = filteredData.filter((i) => i.status === "Excess").length;

  const handleSubmitOpname = () => {
    alert("Stock Opname submitted! Adjustments will be created for discrepancies.");
    setIsEditMode(false);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate("/warehouse")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-2xl text-slate-900">Stock Opname</h1>
          </div>
          <p className="text-sm text-slate-500 ml-14">
            Physical stock verification and adjustment
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditMode ? (
            <Button
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => setIsEditMode(true)}
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Start Stock Count
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsEditMode(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={handleSubmitOpname}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Opname
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Items</p>
              <p className="text-2xl text-slate-900 font-bold">{totalItems}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Match</p>
              <p className="text-2xl text-emerald-700 font-bold">{matchCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Shortage</p>
              <p className="text-2xl text-red-600 font-bold">{shortageCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Excess</p>
              <p className="text-2xl text-amber-600 font-bold">{excessCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search item..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="relative">
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 appearance-none bg-white"
            >
              {WAREHOUSES.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 appearance-none bg-white"
            >
              {STATUS_FILTER.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </Card>

      {/* Stock Opname Table */}
      <Card>
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-slate-900 font-semibold mb-1">Stock Comparison</h2>
          <p className="text-sm text-slate-500">
            Compare system stock vs physical count. Enter physical stock to identify discrepancies.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Item Code
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Item Name
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Warehouse
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Unit
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  System Stock
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Physical Stock
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Difference
                </th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/50 ${
                    item.status === "Shortage"
                      ? "bg-red-50/20"
                      : item.status === "Excess"
                      ? "bg-amber-50/20"
                      : ""
                  }`}
                >
                  <td className="py-4 px-6 text-sm font-mono text-slate-500">{item.itemCode}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm font-semibold text-slate-900">{item.itemName}</div>
                    <div className="text-xs text-slate-400">{item.category}</div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600">{item.warehouse}</td>
                  <td className="py-4 px-4 text-center text-sm text-slate-600">{item.unit}</td>
                  <td className="py-4 px-6 text-right text-sm font-mono text-slate-600 font-medium">
                    {item.systemStock.toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    {isEditMode ? (
                      <input
                        type="number"
                        value={item.physicalStock}
                        onChange={(e) => updatePhysicalStock(item.id, Number(e.target.value))}
                        className="w-24 border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-right font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                      />
                    ) : (
                      <span className="text-sm font-mono font-semibold text-slate-800">
                        {item.physicalStock.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span
                      className={`text-sm font-mono font-bold ${
                        item.difference === 0
                          ? "text-slate-400"
                          : item.difference < 0
                          ? "text-red-600"
                          : "text-amber-600"
                      }`}
                    >
                      {item.difference === 0 ? "-" : `${item.difference > 0 ? "+" : ""}${item.difference}`}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-1.5">
                      {getStatusIcon(item.status)}
                      <Badge className={`border ${getStatusBadge(item.status)}`}>{item.status}</Badge>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {isEditMode ? (
                      <input
                        value={item.notes}
                        onChange={(e) => updateNotes(item.id, e.target.value)}
                        placeholder="Add notes..."
                        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                      />
                    ) : (
                      <span className="text-xs text-slate-600">{item.notes || "-"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No items found</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </Card>

      {/* Info Banner */}
      {isEditMode && (shortageCount > 0 || excessCount > 0) && (
        <Card className="p-5 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-800 font-semibold text-sm">Stock Discrepancies Detected</p>
              <p className="text-amber-700 text-sm mt-1">
                {shortageCount > 0 && `${shortageCount} item(s) with shortage. `}
                {excessCount > 0 && `${excessCount} item(s) with excess. `}
                Stock adjustment documents will be created automatically when you submit.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
