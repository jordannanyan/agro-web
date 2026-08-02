import { createBrowserRouter } from "react-router";
import DashboardLayout from "./components/DashboardLayout";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import Procurement from "./pages/Procurement";
import PurchaseRequestCreate from "./pages/procurement/PurchaseRequestCreate";
import PurchaseRequestView from "./pages/procurement/PurchaseRequestView";
import PurchaseOrderCreate from "./pages/procurement/PurchaseOrderCreate";
import PurchaseOrderView from "./pages/procurement/PurchaseOrderView";
import PaymentRequestCreate from "./pages/procurement/PaymentRequestCreate";
import PaymentRequestView from "./pages/procurement/PaymentRequestView";
import VendorList from "./pages/procurement/VendorList";
import ProcurementStockList from "./pages/procurement/ProcurementStockList";
import MapMonitoring from "./pages/MapMonitoring";
import WarehouseDashboardSimple from "./pages/warehouse/WarehouseDashboardSimple";
import StockManagement from "./pages/warehouse/StockManagement";
import StockInCreate from "./pages/warehouse/StockInCreate";
import StockOutList from "./pages/warehouse/StockOutList";
import StockOutCreate from "./pages/warehouse/StockOutCreate";
import StockOutView from "./pages/warehouse/StockOutView";
import StockCard from "./pages/warehouse/StockCard";
import ReorderMonitoring from "./pages/warehouse/ReorderMonitoring";
import WarehouseReports from "./pages/warehouse/WarehouseReports";
import FinanceMain from "./pages/finance/FinanceMain";
import Reports from "./pages/Reports";
import Purchasing from "./pages/transaction/Purchasing";
import Processing from "./pages/transaction/Processing";
import Selling from "./pages/transaction/Selling";
import Installment from "./pages/prefinance/Installment";
import InstallmentCreate from "./pages/prefinance/InstallmentCreate";
import OutstandingFarmer from "./pages/prefinance/OutstandingFarmer";
import Distribution from "./pages/prefinance/Distribution";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ProfitSharingPage from "./pages/ProfitSharing";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  {
    path: "/",
    Component: DashboardLayout,
    children: [
      { index: true, Component: ExecutiveDashboard },

      // ── Procurement ──────────────────────────────────────────────────────
      { path: "procurement",                   Component: Procurement },
      { path: "procurement/purchase-request",  Component: Procurement },
      { path: "procurement/purchase-order",    Component: Procurement },
      { path: "procurement/payment-request",   Component: Procurement },
      { path: "procurement/vendor",            Component: VendorList },
      { path: "procurement/stock-list",        Component: ProcurementStockList },
      // Create / view routes (unchanged)
      { path: "procurement/pr/create",         Component: PurchaseRequestCreate },
      { path: "procurement/pr/:id/edit",       Component: PurchaseRequestCreate },
      { path: "procurement/pr/:id",            Component: PurchaseRequestView },
      { path: "procurement/po/create",         Component: PurchaseOrderCreate },
      { path: "procurement/po/:id/edit",       Component: PurchaseOrderCreate },
      { path: "procurement/po/:id",            Component: PurchaseOrderView },
      { path: "procurement/payreq/create",     Component: PaymentRequestCreate },
      { path: "procurement/payreq/:id/edit",   Component: PaymentRequestCreate },
      { path: "procurement/payreq/:id",        Component: PaymentRequestView },

      // ── Warehouse sub-pages ───────────────────────────────────────────────
      { path: "warehouse",                     Component: WarehouseDashboardSimple },
      { path: "warehouse/dashboard",           Component: WarehouseDashboardSimple },
      { path: "warehouse/stock-list",          Component: StockManagement },
      { path: "warehouse/stock-in",            Component: StockManagement },
      { path: "warehouse/stock-out",           Component: StockOutList },
      { path: "warehouse/stock-out/create",    Component: StockOutCreate },
      { path: "warehouse/stock-out/:id",       Component: StockOutView },
      // Legacy route kept for compatibility
      { path: "warehouse/stock-management",    Component: StockManagement },
      { path: "warehouse/stockin/create",      Component: StockInCreate },
      { path: "warehouse/stockin/:id",         Component: StockInCreate },
      { path: "warehouse/stock-card",          Component: StockCard },
      { path: "warehouse/reorder",             Component: ReorderMonitoring },
      { path: "warehouse/reports",             Component: WarehouseReports },

      // ── Transaction Management ────────────────────────────────────────────
      { path: "transaction/purchasing",        Component: Purchasing },
      { path: "transaction/processing",        Component: Processing },
      { path: "transaction/selling",           Component: Selling },

      // ── Pre Finance ───────────────────────────────────────────────────────
      { path: "prefinance/installment",        Component: Installment },
      { path: "prefinance/installment/create", Component: InstallmentCreate },
      { path: "prefinance/distribution",       Component: Distribution },
      // Superseded by Stock Out; the old path is kept so existing links still work.
      { path: "prefinance/distribution/create",Component: StockOutCreate },
      { path: "prefinance/outstanding",        Component: OutstandingFarmer },

      // ── Finance sub-pages ─────────────────────────────────────────────────
      { path: "financial",                     Component: FinanceMain },
      { path: "financial/budget",              Component: FinanceMain },
      { path: "financial/actual",              Component: FinanceMain },
      { path: "financial/monitoring",          Component: FinanceMain },

      // ── Profit Sharing sub-pages ──────────────────────────────────────────
      { path: "profit-sharing",                Component: ProfitSharingPage },
      { path: "profit-sharing/investment",     Component: ProfitSharingPage },
      { path: "profit-sharing/revenue",        Component: ProfitSharingPage },
      { path: "profit-sharing/pl",             Component: ProfitSharingPage },
      { path: "profit-sharing/ps",             Component: ProfitSharingPage },

      // ── Other ─────────────────────────────────────────────────────────────
      { path: "map",                           Component: MapMonitoring },
      { path: "reports",                       Component: Reports },
      { path: "settings",                      Component: Settings },
    ],
  },
]);
