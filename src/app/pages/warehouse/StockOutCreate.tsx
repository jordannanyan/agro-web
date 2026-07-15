import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Package,
  Save,
  Send,
  AlertTriangle,
  Minus,
} from "lucide-react";

const WAREHOUSES = [
  "Gudang Utama - Jambi",
  "Gudang Lapangan - Sarolangun",
  "Gudang Lapangan - Merangin",
];

const DISTRIBUTION_TYPES = [
  "Farmer",
  "Farmer Group",
  "Project Site",
  "Field Team",
  "Operational Team",
];

const MOCK_INVENTORY = [
  { id: "i1", name: "NPK Fertilizer 15-15-15", currentStock: 1400, unit: "Kg" },
  { id: "i2", name: "Pesticide Cypermethrin 100EC", currentStock: 55, unit: "Liter" },
  { id: "i3", name: "Planting Sacks Large", currentStock: 400, unit: "Pcs" },
  { id: "i4", name: "Hand Sprayer 16L", currentStock: 11, unit: "Unit" },
];

interface StockOutItem {
  id: string;
  itemId: string;
  itemName: string;
  currentStock: number;
  unit: string;
  quantityOut: number;
  remainingStock: number;
}

const romanMonth = (m: number) => ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][m - 1];

const generateDistributionNumber = () => {
  const now = new Date();
  const seq = String(Math.floor(Math.random() * 90) + 10);
  return `${seq}/PT.SNBS-DO/${romanMonth(now.getMonth() + 1)}/${now.getFullYear()}`;
};

export default function StockOutCreate() {
  const navigate = useNavigate();

  const [distributionNumber] = useState(generateDistributionNumber);
  const [distributionDate, setDistributionDate] = useState(new Date().toISOString().split("T")[0]);
  const [distributionTo, setDistributionTo] = useState("");
  const [distributionType, setDistributionType] = useState("");
  const [requestedBy, setRequestedBy] = useState("");
  const [operationalPIC, setOperationalPIC] = useState("");
  const [remarks, setRemarks] = useState("");
  const [stockOutItems, setStockOutItems] = useState<StockOutItem[]>([]);

  const addItem = () => {
    if (MOCK_INVENTORY.length > stockOutItems.length) {
      const availableItem = MOCK_INVENTORY.find(
        inv => !stockOutItems.some(soi => soi.itemId === inv.id)
      );

      if (availableItem) {
        setStockOutItems([
          ...stockOutItems,
          {
            id: `soi-${Date.now()}`,
            itemId: availableItem.id,
            itemName: availableItem.name,
            currentStock: availableItem.currentStock,
            unit: availableItem.unit,
            quantityOut: 0,
            remainingStock: availableItem.currentStock,
          },
        ]);
      }
    }
  };

  const removeItem = (id: string) => {
    setStockOutItems(stockOutItems.filter(item => item.id !== id));
  };

  const updateItem = (id: string, itemId: string) => {
    const selectedItem = MOCK_INVENTORY.find(inv => inv.id === itemId);
    if (selectedItem) {
      setStockOutItems(
        stockOutItems.map(item =>
          item.id === id
            ? {
                ...item,
                itemId: selectedItem.id,
                itemName: selectedItem.name,
                currentStock: selectedItem.currentStock,
                unit: selectedItem.unit,
                quantityOut: 0,
                remainingStock: selectedItem.currentStock,
              }
            : item
        )
      );
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    setStockOutItems(
      stockOutItems.map(item => {
        if (item.id === id) {
          const validQty = Math.min(Math.max(0, qty), item.currentStock);
          return {
            ...item,
            quantityOut: validQty,
            remainingStock: item.currentStock - validQty,
          };
        }
        return item;
      })
    );
  };

  const handleSave = (submit: boolean) => {
    console.log("Stock Out", { distributionNumber, stockOutItems });
    navigate("/warehouse/stock-management");
  };

  const isFormValid = distributionType && distributionTo && requestedBy && operationalPIC && stockOutItems.length > 0 && stockOutItems.every(i => i.quantityOut > 0);

  const hasExceededStock = stockOutItems.some(item => item.quantityOut > item.currentStock);

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/warehouse/stock-management")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900 font-semibold text-lg">Stock Out / Distribution</h1>
                <p className="text-slate-500 text-sm font-mono">{distributionNumber}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!isFormValid || hasExceededStock}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Submit Stock Out
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
        {/* Header Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-red-600" />
            <h2 className="text-slate-800 font-semibold">Header Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Distribution Number</label>
              <input
                value={distributionNumber}
                readOnly
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 bg-slate-50 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Distribution Date *</label>
              <input
                type="date"
                value={distributionDate}
                onChange={e => setDistributionDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Requested By *</label>
              <input
                value={requestedBy}
                onChange={e => setRequestedBy(e.target.value)}
                placeholder="Nama peminta"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Operational PIC *</label>
              <input
                value={operationalPIC}
                onChange={e => setOperationalPIC(e.target.value)}
                placeholder="Penanggung jawab operasional"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Remarks</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Catatan tambahan..."
                rows={2}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Destination Information */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-red-600" />
            <h2 className="text-slate-800 font-semibold">Destination Information</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Distribution Type *</label>
              <select
                value={distributionType}
                onChange={e => setDistributionType(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 appearance-none bg-white"
              >
                <option value="">Select type...</option>
                {DISTRIBUTION_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Distribution To *</label>
              <input
                value={distributionTo}
                onChange={e => setDistributionTo(e.target.value)}
                placeholder="Nama penerima / lokasi / kelompok"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
              />
            </div>
          </div>
        </div>

        {/* Item Table */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-red-600" />
              <h2 className="text-slate-800 font-semibold">Distribution Items</h2>
            </div>
            <button
              onClick={addItem}
              disabled={stockOutItems.length >= MOCK_INVENTORY.length}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package className="w-4 h-4" />
              Add Item
            </button>
          </div>

          {stockOutItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-3 text-xs text-slate-500 font-medium">Item Name</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 font-medium">Current Stock</th>
                    <th className="text-center py-3 px-3 text-xs text-slate-500 font-medium">Unit</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 font-medium">Quantity Out</th>
                    <th className="text-right py-3 px-3 text-xs text-slate-500 font-medium">Remaining Stock</th>
                    <th className="text-center py-3 px-3 text-xs text-slate-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOutItems.map((item, idx) => {
                    const isExceeded = item.quantityOut > item.currentStock;
                    return (
                      <tr key={item.id} className={`border-b border-slate-50 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                        <td className="py-3 px-3">
                          <select
                            value={item.itemId}
                            onChange={e => updateItem(item.id, e.target.value)}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          >
                            {MOCK_INVENTORY.map(inv => (
                              <option key={inv.id} value={inv.id} disabled={stockOutItems.some(soi => soi.itemId === inv.id && soi.id !== item.id)}>
                                {inv.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-mono font-semibold text-slate-700">
                          {item.currentStock.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center text-sm text-slate-600">{item.unit}</td>
                        <td className="py-3 px-3">
                          <input
                            type="number"
                            min={0}
                            max={item.currentStock}
                            value={item.quantityOut}
                            onChange={e => updateQuantity(item.id, Number(e.target.value))}
                            className={`w-24 border rounded-lg px-3 py-1.5 text-sm text-right text-slate-800 font-semibold focus:outline-none focus:ring-2 ${
                              isExceeded
                                ? "border-red-300 bg-red-50 focus:ring-red-500/20"
                                : "border-slate-200 focus:ring-red-500/20"
                            }`}
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`text-sm font-mono font-semibold ${
                            isExceeded ? "text-red-600" : "text-emerald-700"
                          }`}>
                            {item.remainingStock.toLocaleString()} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No items added</p>
              <p className="text-xs text-slate-400 mt-1">Click "Add Item" to start</p>
            </div>
          )}
        </div>

        {/* Validation Warning */}
        {hasExceededStock && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-red-800 font-semibold text-sm">Stock Validation Error</p>
                <p className="text-red-700 text-sm mt-1">
                  Quantity Out cannot exceed Current Stock. System automatically prevents negative inventory.
                  Please adjust the quantities.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            onClick={() => navigate("/warehouse/stock-management")}
            className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!isFormValid || hasExceededStock}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Submit Stock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
