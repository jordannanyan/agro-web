import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  Truck,
  MapPin,
  User,
  Calendar,
  Save,
  Send,
  CheckCircle,
  Package,
  Sprout,
  Hash,
  ChevronDown,
  Plus,
  Minus,
  AlertTriangle,
  FileText,
  Users,
} from "lucide-react";

const MOCK_STOCK = [
  { id: "s1", name: "NPK Fertilizer 15-15-15", unit: "Kg", available: 500, reserved: 50 },
  { id: "s2", name: "Urea Fertilizer", unit: "Kg", available: 300, reserved: 0 },
  { id: "s3", name: "Pesticide Cypermethrin 100EC", unit: "Liter", available: 50, reserved: 10 },
  { id: "s4", name: "Herbicide Glyphosate", unit: "Liter", available: 30, reserved: 0 },
  { id: "s5", name: "Hand Sprayer 16L", unit: "Unit", available: 8, reserved: 2 },
  { id: "s6", name: "Pruning Shears", unit: "Unit", available: 20, reserved: 0 },
  { id: "s7", name: "Planting Sacks Large (50cm)", unit: "Pcs", available: 1000, reserved: 200 },
];

const MOCK_DESTINATIONS = [
  { id: "d1", type: "Farmer", label: "Kelompok Tani Harapan Jaya – Sarolangun", contact: "Pak Suparman" },
  { id: "d2", type: "Farmer", label: "Kelompok Tani Maju Bersama – Merangin", contact: "Pak Hendro" },
  { id: "d3", type: "Farmer", label: "Kelompok Tani Sumber Rezeki – Batanghari", contact: "Bu Sari" },
  { id: "d4", type: "Field", label: "Plot Lapangan A3 – Sarolangun", contact: "Koordinator: Budi" },
  { id: "d5", type: "Field", label: "Plot Lapangan B7 – Merangin", contact: "Koordinator: Rudi" },
  { id: "d6", type: "Nursery", label: "Nursery Utama – Jambi", contact: "Koordinator: Dewi" },
];

const WAREHOUSE_LOCATIONS = [
  "Gudang Utama - Jambi",
  "Gudang Lapangan - Sarolangun",
  "Gudang Lapangan - Merangin",
  "Gudang Lapangan - Batanghari",
];

const romanMonth = (m: number) => ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][m - 1];

const generateDONumber = () => {
  const now = new Date();
  const seq = String(Math.floor(Math.random() * 90) + 10);
  return `${seq}/PT.SNBS-DO/${romanMonth(now.getMonth() + 1)}/${now.getFullYear()}`;
};

interface DistItem {
  stockId: string;
  name: string;
  unit: string;
  available: number;
  qty: number;
}

export default function WarehouseDistributionCreate() {
  const navigate = useNavigate();

  const [doNumber] = useState(generateDONumber);
  const [destinationId, setDestinationId] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [dispatchedBy, setDispatchedBy] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedItems, setSelectedItems] = useState<DistItem[]>([]);
  const [showItemSelector, setShowItemSelector] = useState(false);

  const destination = MOCK_DESTINATIONS.find(d => d.id === destinationId);

  const addItem = (stock: typeof MOCK_STOCK[0]) => {
    if (selectedItems.find(i => i.stockId === stock.id)) return;
    setSelectedItems(prev => [...prev, {
      stockId: stock.id,
      name: stock.name,
      unit: stock.unit,
      available: stock.available - stock.reserved,
      qty: 1,
    }]);
    setShowItemSelector(false);
  };

  const removeItem = (stockId: string) => {
    setSelectedItems(prev => prev.filter(i => i.stockId !== stockId));
  };

  const updateQty = (stockId: string, qty: number) => {
    setSelectedItems(prev => prev.map(i =>
      i.stockId === stockId ? { ...i, qty: Math.max(1, Math.min(qty, i.available)) } : i
    ));
  };

  const hasOverflow = selectedItems.some(i => i.qty > i.available);

  const handleSave = (submit: boolean) => {
    navigate("/warehouse");
  };

  const destTypeColor: Record<string, string> = {
    Farmer: "bg-green-50 text-green-700 border-green-200",
    Field: "bg-blue-50 text-blue-700 border-blue-200",
    Nursery: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/warehouse")} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900 font-semibold text-lg">Distribution Order</h1>
                <p className="text-slate-500 text-sm font-mono">{doNumber}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Simpan Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!destinationId || !fromWarehouse || !dispatchedBy || selectedItems.length === 0 || hasOverflow}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Konfirmasi Distribusi
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

        {/* Destination */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h2 className="text-slate-800 font-semibold">Tujuan Distribusi</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {MOCK_DESTINATIONS.map(dest => (
              <button
                key={dest.id}
                onClick={() => setDestinationId(dest.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  destinationId === dest.id
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${destTypeColor[dest.type] ?? ""}`}>
                    {dest.type}
                  </span>
                  {destinationId === dest.id && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                </div>
                <p className="text-slate-800 font-medium text-sm leading-snug mb-1">{dest.label}</p>
                <p className="text-xs text-slate-500">{dest.contact}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Logistics Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-slate-800 font-semibold">Informasi Pengiriman</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Dari Gudang *</label>
              <div className="relative">
                <select
                  value={fromWarehouse}
                  onChange={e => setFromWarehouse(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 appearance-none bg-white"
                >
                  <option value="">Pilih gudang asal...</option>
                  {WAREHOUSE_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Tanggal Pengiriman *</label>
              <input
                type="date"
                value={dispatchDate}
                onChange={e => setDispatchDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Dikirim Oleh *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={dispatchedBy}
                  onChange={e => setDispatchedBy(e.target.value)}
                  placeholder="Nama petugas pengirim"
                  className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium mb-1.5 block">Kendaraan Pengantar</label>
              <input
                value={vehicleInfo}
                onChange={e => setVehicleInfo(e.target.value)}
                placeholder="Plat nomor / tipe kendaraan"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
          </div>
        </div>

        {/* Item Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <h2 className="text-slate-800 font-semibold">Item yang Didistribusikan</h2>
            </div>
            <button
              onClick={() => setShowItemSelector(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Item
            </button>
          </div>

          {showItemSelector && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-3">Pilih item dari stok gudang:</p>
              <div className="grid grid-cols-2 gap-2">
                {MOCK_STOCK.filter(s => !selectedItems.find(i => i.stockId === s.id)).map(stock => {
                  const avail = stock.available - stock.reserved;
                  return (
                    <button
                      key={stock.id}
                      onClick={() => addItem(stock)}
                      disabled={avail <= 0}
                      className="text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <p className="text-sm text-slate-800 font-medium">{stock.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Tersedia: {avail} {stock.unit}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {selectedItems.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Sprout className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Belum ada item. Klik "Tambah Item" untuk mulai.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-xs text-slate-500 font-medium">Item</th>
                  <th className="text-center py-3 px-3 text-xs text-slate-500 font-medium">Satuan</th>
                  <th className="text-center py-3 px-3 text-xs text-slate-500 font-medium">Stok Tersedia</th>
                  <th className="text-center py-3 px-3 text-xs text-slate-500 font-medium">Qty Kirim</th>
                  <th className="py-3 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {selectedItems.map(item => {
                  const overflow = item.qty > item.available;
                  return (
                    <tr key={item.stockId} className="border-b border-slate-50">
                      <td className="py-3 px-3">
                        <p className="text-sm text-slate-800 font-medium">{item.name}</p>
                      </td>
                      <td className="py-3 px-3 text-center text-sm text-slate-600">{item.unit}</td>
                      <td className="py-3 px-3 text-center text-sm text-slate-600">{item.available}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQty(item.stockId, item.qty - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-slate-600" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={item.available}
                            value={item.qty}
                            onChange={e => updateQty(item.stockId, Number(e.target.value))}
                            className={`w-20 border rounded-lg px-2 py-1.5 text-sm text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${overflow ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                          />
                          <button
                            onClick={() => updateQty(item.stockId, item.qty + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-slate-600" />
                          </button>
                          {overflow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => removeItem(item.stockId)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h2 className="text-slate-800 font-semibold">Instruksi & Catatan</h2>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Instruksi pengiriman, peringatan khusus, atau catatan untuk penerima..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"
          />
        </div>

        {/* Summary */}
        {selectedItems.length > 0 && destination && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-emerald-800 font-semibold text-sm">Ringkasan Distribusi</p>
                <p className="text-emerald-700 text-sm mt-1">
                  <strong>{selectedItems.length} jenis item</strong> ({selectedItems.reduce((s, i) => s + i.qty, 0)} unit total) akan dikirim ke{" "}
                  <strong>{destination.label}</strong>{fromWarehouse ? ` dari ${fromWarehouse}` : ""} pada {new Date(dispatchDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overflow warning */}
        {hasOverflow && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-red-700 text-sm">
                Beberapa item melebihi stok yang tersedia. Kurangi jumlah pengiriman sebelum melanjutkan.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button
            onClick={() => navigate("/warehouse")}
            className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors"
            >
              <Save className="w-4 h-4" /> Simpan Draft
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={!destinationId || !fromWarehouse || !dispatchedBy || selectedItems.length === 0 || hasOverflow}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Truck className="w-4 h-4" /> Konfirmasi Distribusi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
