import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  TrendingDown,
  Package,
  Plus,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { useApi } from "../../lib/hooks";

// API /warehouse-stock/reorder → ReorderItem shape.
interface ApiReorder {
  id: number; warehouse_id: number; warehouse_name: string;
  sapropdi_id: number; sapropdi_name: string;
  min_stock: number; reorder_qty: number; is_active: number;
  current_stock: number; shortage: number; status: string;
}
function toReorderItem(r: ApiReorder): ReorderItem {
  return {
    id: String(r.id),
    itemCode: `SPD-${String(r.sapropdi_id).padStart(3, "0")}`,
    itemName: r.sapropdi_name,
    category: "3_Material",
    warehouse: r.warehouse_name,
    unit: "",
    currentStock: Number(r.current_stock || 0),
    minimumStock: Number(r.min_stock || 0),
    shortage: Number(r.shortage || 0),
    status: r.status === "Critical" ? "Critical" : "Low",
    lastStockIn: "—",
    lastPR: "—",
    suggestedReorder: Number(r.reorder_qty || 0),
  };
}

interface ReorderItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  warehouse: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  shortage: number;
  status: "Low" | "Critical";
  lastStockIn: string;
  lastPR: string;
  suggestedReorder: number;
}

const mockReorderData: ReorderItem[] = [
  {
    id: "R-001",
    itemCode: "MAT-003",
    itemName: "Planting Sacks Large",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Pcs",
    currentStock: 400,
    minimumStock: 500,
    shortage: 100,
    status: "Low",
    lastStockIn: "2026-06-01",
    lastPR: "PR-2026-041",
    suggestedReorder: 500,
  },
  {
    id: "R-002",
    itemCode: "EQP-002",
    itemName: "Pruning Shears Heavy Duty",
    category: "1_Investment",
    warehouse: "Gudang Lapangan – Sumatra",
    unit: "Pcs",
    currentStock: 3,
    minimumStock: 10,
    shortage: 7,
    status: "Critical",
    lastStockIn: "2026-05-15",
    lastPR: "PR-2026-038",
    suggestedReorder: 20,
  },
  {
    id: "R-003",
    itemCode: "MAT-005",
    itemName: "Fungicide Mancozeb 80WP",
    category: "3_Material",
    warehouse: "Gudang Utama – Jambi",
    unit: "Kg",
    currentStock: 8,
    minimumStock: 20,
    shortage: 12,
    status: "Critical",
    lastStockIn: "2026-05-28",
    lastPR: "PR-2026-040",
    suggestedReorder: 50,
  },
  {
    id: "R-004",
    itemCode: "MAT-006",
    itemName: "Mulching Plastic Black",
    category: "3_Material",
    warehouse: "Gudang Lapangan – Sarolangun",
    unit: "Roll",
    currentStock: 15,
    minimumStock: 20,
    shortage: 5,
    status: "Low",
    lastStockIn: "2026-05-25",
    lastPR: "PR-2026-039",
    suggestedReorder: 30,
  },
  {
    id: "R-005",
    itemCode: "EQP-003",
    itemName: "Soil pH Meter Digital",
    category: "1_Investment",
    warehouse: "Gudang Utama – Jambi",
    unit: "Unit",
    currentStock: 1,
    minimumStock: 5,
    shortage: 4,
    status: "Critical",
    lastStockIn: "2026-04-10",
    lastPR: "PR-2026-025",
    suggestedReorder: 10,
  },
  {
    id: "R-006",
    itemCode: "MAT-007",
    itemName: "Bio Stimulant Fertilizer",
    category: "3_Material",
    warehouse: "Gudang Lapangan – Sumatra",
    unit: "Liter",
    currentStock: 18,
    minimumStock: 25,
    shortage: 7,
    status: "Low",
    lastStockIn: "2026-05-30",
    lastPR: "PR-2026-041",
    suggestedReorder: 50,
  },
];

const WAREHOUSES = ["All Warehouses", "Gudang Utama – Jambi", "Gudang Lapangan – Sumatra", "Gudang Lapangan – Sarolangun"];
const STATUS_FILTER = ["All Status", "Low", "Critical"];
const CATEGORIES = ["All Categories", "1_Investment", "3_Material"];

function getStatusBadge(status: string) {
  const map: Record<string, string> = {
    Low: "bg-amber-50 text-amber-700 border-amber-200",
    Critical: "bg-red-50 text-red-700 border-red-200",
  };
  return map[status] || map.Low;
}

export default function ReorderMonitoring() {
  const navigate = useNavigate();
  const { data: apiRows, loading, error } = useApi<ApiReorder[]>("warehouse-stock/reorder");
  // Only show items at/below minimum (Low/Critical) — skip 'OK'.
  const reorderData = useMemo(
    () => (apiRows || []).filter((r) => r.status === "Low" || r.status === "Critical").map(toReorderItem),
    [apiRows]
  );

  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All Warehouses");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const filteredData = reorderData.filter((item) => {
    const matchSearch =
      search === "" ||
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.itemCode.toLowerCase().includes(search.toLowerCase());

    const matchWarehouse = selectedWarehouse === "All Warehouses" || item.warehouse === selectedWarehouse;
    const matchStatus = selectedStatus === "All Status" || item.status === selectedStatus;
    const matchCategory = selectedCategory === "All Categories" || item.category === selectedCategory;

    return matchSearch && matchWarehouse && matchStatus && matchCategory;
  });

  const totalItems = filteredData.length;
  const criticalCount = filteredData.filter((i) => i.status === "Critical").length;
  const lowCount = filteredData.filter((i) => i.status === "Low").length;
  const totalShortage = filteredData.reduce((sum, i) => sum + i.shortage, 0);

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredData.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredData.map((item) => item.id));
    }
  };

  const handleCreatePR = () => {
    if (selectedItems.length === 0) {
      alert("Please select at least one item to create Purchase Request");
      return;
    }

    const selectedReorderItems = filteredData.filter((item) => selectedItems.includes(item.id));
    console.log("Creating PR for items:", selectedReorderItems);

    navigate("/procurement/pr/create", {
      state: {
        prefillItems: selectedReorderItems.map((item) => ({
          itemName: item.itemName,
          itemCode: item.itemCode,
          quantity: item.suggestedReorder,
          unit: item.unit,
          category: item.category,
          remarks: `Reorder - Stock below minimum (Current: ${item.currentStock}, Min: ${item.minimumStock})`,
        })),
      },
    });
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
            <h1 className="text-2xl text-slate-900">Reorder Monitoring</h1>
          </div>
          <p className="text-sm text-slate-500 ml-14">
            Monitor items below minimum stock and create purchase requests
          </p>
        </div>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={handleCreatePR}
          disabled={selectedItems.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create PR ({selectedItems.length})
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Items Below Min</p>
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
              <p className="text-sm text-slate-500 mb-1">Critical Status</p>
              <p className="text-2xl text-red-600 font-bold">{criticalCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Low Status</p>
              <p className="text-2xl text-amber-600 font-bold">{lowCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Selected for PR</p>
              <p className="text-2xl text-emerald-600 font-bold">{selectedItems.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-4 gap-3">
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 appearance-none bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
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

      {/* Reorder Monitoring Table */}
      <Card>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-slate-900 font-semibold mb-1">Items Below Minimum Stock</h2>
              <p className="text-sm text-slate-500">
                Select items to create Purchase Request automatically
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
            >
              {selectedItems.length === filteredData.length ? "Deselect All" : "Select All"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Select
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Item Code
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Item Name
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Warehouse
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Current Stock
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Min Stock
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Shortage
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Suggested Reorder
                </th>
                <th className="text-center py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Last Stock In
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/50 ${
                    item.status === "Critical" ? "bg-red-50/20" : "bg-amber-50/10"
                  }`}
                >
                  <td className="py-4 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelectItem(item.id)}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="py-4 px-6 text-sm font-mono text-slate-500">{item.itemCode}</td>
                  <td className="py-4 px-6">
                    <div className="text-sm font-semibold text-slate-900">{item.itemName}</div>
                    <div className="text-xs text-slate-400">{item.category}</div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600">{item.warehouse}</td>
                  <td className="py-4 px-6 text-right">
                    <span className={`text-sm font-mono font-semibold ${
                      item.status === "Critical" ? "text-red-600" : "text-amber-600"
                    }`}>
                      {item.currentStock.toLocaleString()} {item.unit}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-sm font-mono text-slate-600">
                    {item.minimumStock.toLocaleString()} {item.unit}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-mono font-bold text-red-600">
                      -{item.shortage.toLocaleString()} {item.unit}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className="text-sm font-mono font-bold text-emerald-700">
                      {item.suggestedReorder.toLocaleString()} {item.unit}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <Badge className={`border ${getStatusBadge(item.status)}`}>{item.status}</Badge>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-500">{item.lastStockIn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="p-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No items below minimum stock</p>
            <p className="text-sm text-slate-400 mt-1">All stock levels are normal</p>
          </div>
        )}
      </Card>

      {/* Info Banner */}
      {criticalCount > 0 && (
        <Card className="p-5 bg-red-50 border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-red-800 font-semibold text-sm">Critical Stock Alert</p>
              <p className="text-red-700 text-sm mt-1">
                {criticalCount} item(s) are in critical status. Immediate reorder recommended to prevent stockouts.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
