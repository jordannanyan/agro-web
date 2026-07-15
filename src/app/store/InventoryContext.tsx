import { createContext, useContext, useState, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  item: string;
  category: "Fertilizer" | "Pesticide" | "Equipment" | "Packaging" | "Other";
  warehouse: string;
  unit: string;
  initialStock: number;
  stockIn: number;
  stockOut: number;
  remaining: number;
  minThreshold: number;
  lastUpdate: string;
}

export type TxType = "Stock In" | "Distribution" | "Adjustment" | "Return";

export interface Transaction {
  id: string;
  date: string;
  type: TxType;
  itemId: string;
  item: string;
  warehouse: string;
  in: number;
  out: number;
  balance: number;
  pic: string;
  farmerName?: string;
  land?: string;
  notes?: string;
  poRef?: string;
}

export interface DistributionRecord {
  id: string;
  date: string;
  farmerName: string;
  land: string;
  commodityArea: string;
  itemId: string;
  item: string;
  quantity: number;
  unit: string;
  pic: string;
  notes: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_ITEMS: InventoryItem[] = [
  {
    id: "INV-001", item: "NPK Fertilizer 16-16-16", category: "Fertilizer",
    warehouse: "Warehouse A", unit: "kg",
    initialStock: 5000, stockIn: 2000, stockOut: 1050, remaining: 5950,
    minThreshold: 2000, lastUpdate: "2 hours ago",
  },
  {
    id: "INV-002", item: "KCL (Potassium Chloride)", category: "Fertilizer",
    warehouse: "Warehouse B", unit: "kg",
    initialStock: 3000, stockIn: 1500, stockOut: 2800, remaining: 1700,
    minThreshold: 2000, lastUpdate: "4 hours ago",
  },
  {
    id: "INV-003", item: "Pestisida Organik A", category: "Pesticide",
    warehouse: "Warehouse A", unit: "L",
    initialStock: 2000, stockIn: 800, stockOut: 2300, remaining: 500,
    minThreshold: 1000, lastUpdate: "1 hour ago",
  },
  {
    id: "INV-004", item: "Herbisida Selektif B", category: "Pesticide",
    warehouse: "Warehouse C", unit: "L",
    initialStock: 1500, stockIn: 600, stockOut: 1200, remaining: 900,
    minThreshold: 500, lastUpdate: "6 hours ago",
  },
  {
    id: "INV-005", item: "Organic Fertilizer", category: "Fertilizer",
    warehouse: "Warehouse B", unit: "kg",
    initialStock: 4000, stockIn: 2500, stockOut: 3800, remaining: 2700,
    minThreshold: 1500, lastUpdate: "3 hours ago",
  },
  {
    id: "INV-006", item: "Urea Fertilizer 46%", category: "Fertilizer",
    warehouse: "Warehouse A", unit: "kg",
    initialStock: 6000, stockIn: 3000, stockOut: 5200, remaining: 3800,
    minThreshold: 3000, lastUpdate: "5 hours ago",
  },
  {
    id: "INV-007", item: "Fungisida Premium", category: "Pesticide",
    warehouse: "Warehouse C", unit: "L",
    initialStock: 800, stockIn: 400, stockOut: 950, remaining: 250,
    minThreshold: 500, lastUpdate: "2 hours ago",
  },
  {
    id: "INV-008", item: "Compost Organic", category: "Fertilizer",
    warehouse: "Warehouse B", unit: "kg",
    initialStock: 3500, stockIn: 1800, stockOut: 2900, remaining: 2400,
    minThreshold: 1000, lastUpdate: "8 hours ago",
  },
];

const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: "TRX-2026-001", date: "May 1, 2026", type: "Stock In",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", warehouse: "Warehouse A",
    in: 2000, out: 0, balance: 5000, pic: "Ahmad Fauzi", poRef: "PO-2026-001",
  },
  {
    id: "TRX-2026-002", date: "May 3, 2026", type: "Distribution",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", warehouse: "Warehouse A",
    in: 0, out: 50, balance: 4950, pic: "Budi Santoso",
    farmerName: "Pak Sumarno", land: "Blok A-12 Kebun Utara",
  },
  {
    id: "TRX-2026-003", date: "May 5, 2026", type: "Distribution",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", warehouse: "Warehouse A",
    in: 0, out: 75, balance: 4875, pic: "Rina Marlina",
    farmerName: "Pak Sudirman", land: "Blok B-04 Kebun Selatan",
  },
  {
    id: "TRX-2026-004", date: "May 8, 2026", type: "Stock In",
    itemId: "INV-003", item: "Pestisida Organik A", warehouse: "Warehouse A",
    in: 800, out: 0, balance: 800, pic: "Ahmad Fauzi", poRef: "PO-2026-002",
  },
  {
    id: "TRX-2026-005", date: "May 10, 2026", type: "Distribution",
    itemId: "INV-003", item: "Pestisida Organik A", warehouse: "Warehouse A",
    in: 0, out: 120, balance: 680, pic: "Dika Pratama",
    farmerName: "Pak Haryono", land: "Blok C-07 Kebun Timur",
  },
  {
    id: "TRX-2026-006", date: "May 12, 2026", type: "Distribution",
    itemId: "INV-006", item: "Urea Fertilizer 46%", warehouse: "Warehouse A",
    in: 0, out: 200, balance: 3800, pic: "Sari Wulandari",
    farmerName: "Pak Marjono", land: "Blok D-02 Kebun Barat",
  },
  {
    id: "TRX-2026-007", date: "May 14, 2026", type: "Stock In",
    itemId: "INV-005", item: "Organic Fertilizer", warehouse: "Warehouse B",
    in: 2500, out: 0, balance: 2500, pic: "Ahmad Fauzi", poRef: "PO-2026-003",
  },
  {
    id: "TRX-2026-008", date: "May 15, 2026", type: "Distribution",
    itemId: "INV-005", item: "Organic Fertilizer", warehouse: "Warehouse B",
    in: 0, out: 300, balance: 2200, pic: "Budi Santoso",
    farmerName: "Pak Sumarno", land: "Blok A-12 Kebun Utara",
  },
  {
    id: "TRX-2026-009", date: "May 18, 2026", type: "Adjustment",
    itemId: "INV-007", item: "Fungisida Premium", warehouse: "Warehouse C",
    in: 0, out: 30, balance: 250, pic: "Admin",
    notes: "Stock opname variance correction",
  },
  {
    id: "TRX-2026-010", date: "May 20, 2026", type: "Distribution",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", warehouse: "Warehouse A",
    in: 0, out: 100, balance: 5950, pic: "Rina Marlina",
    farmerName: "Pak Sutrisno", land: "Blok E-09 Kebun Tengah",
  },
];

const SEED_DISTRIBUTIONS: DistributionRecord[] = [
  {
    id: "DIST-2026-001", date: "May 3, 2026", farmerName: "Pak Sumarno",
    land: "Blok A-12", commodityArea: "Kebun Utara – 12 Ha",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", quantity: 50, unit: "kg",
    pic: "Budi Santoso", notes: "Pemupukan dasar tanaman kopi",
  },
  {
    id: "DIST-2026-002", date: "May 5, 2026", farmerName: "Pak Sudirman",
    land: "Blok B-04", commodityArea: "Kebun Selatan – 8 Ha",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", quantity: 75, unit: "kg",
    pic: "Rina Marlina", notes: "Aplikasi pemupukan fase vegetatif",
  },
  {
    id: "DIST-2026-003", date: "May 10, 2026", farmerName: "Pak Haryono",
    land: "Blok C-07", commodityArea: "Kebun Timur – 15 Ha",
    itemId: "INV-003", item: "Pestisida Organik A", quantity: 120, unit: "L",
    pic: "Dika Pratama", notes: "Pengendalian hama daun",
  },
  {
    id: "DIST-2026-004", date: "May 12, 2026", farmerName: "Pak Marjono",
    land: "Blok D-02", commodityArea: "Kebun Barat – 20 Ha",
    itemId: "INV-006", item: "Urea Fertilizer 46%", quantity: 200, unit: "kg",
    pic: "Sari Wulandari", notes: "Pemupukan susulan",
  },
  {
    id: "DIST-2026-005", date: "May 15, 2026", farmerName: "Pak Sumarno",
    land: "Blok A-12", commodityArea: "Kebun Utara – 12 Ha",
    itemId: "INV-005", item: "Organic Fertilizer", quantity: 300, unit: "kg",
    pic: "Budi Santoso", notes: "Aplikasi kompos organik",
  },
  {
    id: "DIST-2026-006", date: "May 20, 2026", farmerName: "Pak Sutrisno",
    land: "Blok E-09", commodityArea: "Kebun Tengah – 10 Ha",
    itemId: "INV-001", item: "NPK Fertilizer 16-16-16", quantity: 100, unit: "kg",
    pic: "Rina Marlina", notes: "Pemupukan rutin bulanan",
  },
];

// ─── Context ──────────────────────────────────────────────────────────────────

interface InventoryContextValue {
  items: InventoryItem[];
  transactions: Transaction[];
  distributions: DistributionRecord[];
  addStockIn: (payload: {
    itemId: string;
    quantity: number;
    warehouse: string;
    pic: string;
    poRef?: string;
    notes?: string;
  }) => void;
  addDistribution: (payload: {
    farmerName: string;
    land: string;
    commodityArea: string;
    itemId: string;
    quantity: number;
    pic: string;
    notes: string;
    date: string;
  }) => boolean; // returns false if insufficient stock
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(SEED_ITEMS);
  const [transactions, setTransactions] = useState<Transaction[]>(SEED_TRANSACTIONS);
  const [distributions, setDistributions] = useState<DistributionRecord[]>(SEED_DISTRIBUTIONS);

  function addStockIn(payload: {
    itemId: string; quantity: number; warehouse: string;
    pic: string; poRef?: string; notes?: string;
  }) {
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    setItems((prev) =>
      prev.map((it) =>
        it.id === payload.itemId
          ? {
              ...it,
              stockIn: it.stockIn + payload.quantity,
              remaining: it.remaining + payload.quantity,
              lastUpdate: "Just now",
            }
          : it
      )
    );
    setTransactions((prev) => {
      const item = items.find((i) => i.id === payload.itemId)!;
      const newBalance = item.remaining + payload.quantity;
      const newTx: Transaction = {
        id: `TRX-2026-${String(prev.length + 1).padStart(3, "0")}`,
        date: now,
        type: "Stock In",
        itemId: payload.itemId,
        item: item.item,
        warehouse: payload.warehouse,
        in: payload.quantity,
        out: 0,
        balance: newBalance,
        pic: payload.pic,
        poRef: payload.poRef,
        notes: payload.notes,
      };
      return [newTx, ...prev];
    });
  }

  function addDistribution(payload: {
    farmerName: string; land: string; commodityArea: string;
    itemId: string; quantity: number; pic: string; notes: string; date: string;
  }): boolean {
    const item = items.find((i) => i.id === payload.itemId);
    if (!item || item.remaining < payload.quantity) return false;

    const newBalance = item.remaining - payload.quantity;
    const distId = `DIST-2026-${String(distributions.length + 1).padStart(3, "0")}`;
    const txId = `TRX-2026-${String(transactions.length + 1).padStart(3, "0")}`;

    setItems((prev) =>
      prev.map((it) =>
        it.id === payload.itemId
          ? {
              ...it,
              stockOut: it.stockOut + payload.quantity,
              remaining: newBalance,
              lastUpdate: "Just now",
            }
          : it
      )
    );
    setTransactions((prev) => [
      {
        id: txId,
        date: payload.date,
        type: "Distribution",
        itemId: payload.itemId,
        item: item.item,
        warehouse: item.warehouse,
        in: 0,
        out: payload.quantity,
        balance: newBalance,
        pic: payload.pic,
        farmerName: payload.farmerName,
        land: payload.land,
        notes: payload.notes,
      },
      ...prev,
    ]);
    setDistributions((prev) => [
      {
        id: distId,
        date: payload.date,
        farmerName: payload.farmerName,
        land: payload.land,
        commodityArea: payload.commodityArea,
        itemId: payload.itemId,
        item: item.item,
        quantity: payload.quantity,
        unit: item.unit,
        pic: payload.pic,
        notes: payload.notes,
      },
      ...prev,
    ]);
    return true;
  }

  return (
    <InventoryContext.Provider value={{ items, transactions, distributions, addStockIn, addDistribution }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
