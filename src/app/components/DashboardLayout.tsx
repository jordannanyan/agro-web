import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Sprout,
  DollarSign,
  FileText,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Filter,
  Calendar,
  Map as MapIcon,
  Warehouse,
  Factory,
  CreditCard,
  Building2,
  LogOut,
  TrendingUp,
  Lock,
  HandCoins,
} from "lucide-react";
import { useAuth, initials } from "../store/AuthContext";
import { canAccessPath, homePath } from "../lib/permissions";
import { useInboxCounts, type InboxCounts } from "../lib/inbox";
import { useNotifications, timeAgo } from "../lib/notifications";

const menuItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    id: "procurement",
    icon: ShoppingCart,
    label: "Procurement",
    subItems: [
      { id: "proc-pr",    label: "Purchase Request",  path: "/procurement/purchase-request" },
      { id: "proc-po",    label: "Purchase Order",     path: "/procurement/purchase-order" },
      { id: "proc-pay",   label: "Payment Request",    path: "/procurement/payment-request" },
      // Its own screen, not an option inside the one above. A reimbursement claim
      // has no purchase behind it and never asks for a PR or a PO, so a form that
      // offers that choice is a form with a wrong answer on it. It is also the only
      // payment request a Field Admin files.
      { id: "proc-payrb", label: "Payment Request Reimbursement", path: "/procurement/payreq-reimbursement" },
      { id: "proc-recon", label: "Rekonsiliasi Pembayaran", path: "/procurement/reconciliation" },
      { id: "proc-vendor",label: "Vendor List",        path: "/procurement/vendor" },
      { id: "proc-stock", label: "Stock List",         path: "/procurement/stock-list" },
    ],
  },
  {
    id: "warehouse",
    icon: Warehouse,
    label: "Gudang",
    subItems: [
      { id: "wh-stock",    label: "Inventory Saprodi", path: "/warehouse/stock-list" },
      { id: "wh-stockin",  label: "Stock In",          path: "/warehouse/stock-in" },
      { id: "wh-stockout", label: "Stock Out",         path: "/warehouse/stock-out" },
      { id: "wh-lines",    label: "Riwayat Barang Keluar", path: "/warehouse/stock-out/riwayat" },
      { id: "wh-card",     label: "Kartu Stok",        path: "/warehouse/stock-card" },
      { id: "wh-reorder",  label: "Reorder Monitoring", path: "/warehouse/reorder" },
    ],
  },
  {
    id: "transaction",
    icon: Factory,
    label: "Transaction Management",
    subItems: [
      { id: "purchasing", label: "Purchasing", path: "/transaction/purchasing" },
      { id: "processing", label: "Processing", path: "/transaction/processing" },
      { id: "selling", label: "Selling", path: "/transaction/selling" },
    ],
  },
  {
    id: "prefinance",
    icon: CreditCard,
    label: "Pre-Finance",
    subItems: [
      // Distribusi moved to Gudang → Stock Out. Pre-Finance keeps what it owns:
      // what the farmer owes and what has been paid back.
      { id: "installment", label: "Cicilan", path: "/prefinance/installment" },
      { id: "outstanding", label: "Outstanding Petani", path: "/prefinance/outstanding" },
    ],
  },
  {
    id: "financial",
    icon: DollarSign,
    label: "Finance",
    subItems: [
      { id: "fin-budget",     label: "Budget",           path: "/financial/budget" },
      { id: "fin-actual",     label: "Actual",            path: "/financial/actual" },
      { id: "fin-monitoring", label: "Budget Monitoring", path: "/financial/monitoring" },
    ],
  },
  {
    id: "profit-sharing",
    icon: TrendingUp,
    label: "Profit Sharing",
    subItems: [
      { id: "ps-investment", label: "Operational Investment", path: "/profit-sharing/investment" },
      { id: "ps-revenue",    label: "Revenue & Delivery",     path: "/profit-sharing/revenue" },
      { id: "ps-pl",         label: "Profit & Loss",          path: "/profit-sharing/pl" },
      { id: "ps-ps",         label: "Profit Sharing",         path: "/profit-sharing/ps" },
    ],
  },
  // Bukan bagian Procurement: tidak ada yang dibeli, dan yang mengajukannya Field
  // Admin — orang yang tidak boleh masuk ke menu Procurement sama sekali.
  //
  // Namanya "Reimbursement Petani" dan bukan "Payment Request": ini membayar PETANI
  // lewat rekening KTH. Yang mengganti uang Field Admin sendiri adalah Payment
  // Request di menu Procurement — dua hal berbeda yang sempat tertukar 18 Sep.
  { id: "reimbursement", icon: HandCoins, label: "Reimbursement Petani", path: "/reimbursement" },
  { id: "map", icon: MapIcon, label: "Map Monitoring", path: "/map" },
  { id: "reports", icon: FileText, label: "Laporan", path: "/reports" },
  { id: "settings", icon: Settings, label: "Settings", path: "/settings" },
];

// Which menu entry owns which count. Only documents with an approval chain can be
// waiting on anybody.
const INBOX_PATHS: Record<string, keyof Omit<InboxCounts, "total">> = {
  "/procurement/purchase-request": "PR",
  "/procurement/purchase-order": "PO",
  "/procurement/payment-request": "PayReq",
  "/reimbursement": "Reimbursement",
};

/** Spell out what the number is made of, for the badge's tooltip. */
function inboxTitle(counts: InboxCounts, key?: keyof Omit<InboxCounts, "total">): string {
  const b = key ? counts[key] : null;
  const parts = b
    ? [
        b.approval ? `${b.approval} menunggu persetujuan Anda` : null,
        b.revision ? `${b.revision} perlu Anda revisi` : null,
        b.payment ? `${b.payment} siap dibayar` : null,
      ]
    : [`${counts.total} dokumen menunggu tindakan Anda`];
  return parts.filter(Boolean).join(" · ");
}

/**
 * The count of documents this person still has to act on.
 *
 * Red, filled and always visible — the same weight the lists give a row that is
 * the viewer's turn. A quieter treatment would defeat the point: this exists
 * because work was going unnoticed until somebody thought to open the list.
 */
function InboxBadge({ count, title, className = "" }: { count: number; title: string; className?: string }) {
  if (!count) return null;
  return (
    <span
      title={title}
      aria-label={`${count} dokumen menunggu tindakan Anda`}
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none ring-2 ring-red-100 shadow-sm ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["transaction", "prefinance", "profit-sharing", "procurement", "warehouse", "financial"]);

  // Route guard: redirect to /login when not authenticated.
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Called before the early returns below: the hook order has to stay the same on
  // every render, and `loading` / `user` change between them.
  const inbox = useInboxCounts(!loading && !!user);
  // Two different questions share this corner of the header. The badge on the bell
  // counts what has happened and you have not read; the sidebar badges count what is
  // waiting for you to act. Keeping them apart is why the bell can finally mean
  // something — before this it was a red dot painted on permanently.
  const notif = useNotifications(!loading && !!user);
  const [notifOpen, setNotifOpen] = useState(false);

  // Also before the early returns, and for the reason the comment above gives: this
  // used to sit further down, past `if (!user) return null`. Signing out made the
  // component render one hook fewer than the render before it, and React refuses
  // that outright — the whole screen was replaced by "Unexpected Application Error"
  // on every logout.
  //
  // A role whose home is not "/" is moved there rather than shown a refusal on the
  // page it lands on after signing in.
  useEffect(() => {
    if (loading || !user) return;
    const home = homePath(user.role_code);
    if (home !== "/" && location.pathname === "/") navigate(home, { replace: true });
  }, [loading, user, location.pathname, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FAFBFC] text-slate-400 text-sm">Memuat…</div>;
  }
  if (!user) return null;

  const SESSION = {
    name: user.name || user.username,
    initials: initials(user.name || user.username),
    role: user.role || "—",
    entity: user.entity?.entities_name || (user.entity_id ? `Entity #${user.entity_id}` : "Lintas Entitas"),
  };

  // Gate on the stable slug, not the display name.
  const roleCode = user.role_code;

  // Filter the sidebar to what this role may access.
  const visibleMenu = menuItems
    .map((item) => {
      if ("subItems" in item && item.subItems) {
        const subItems = item.subItems.filter((s) => canAccessPath(roleCode, s.path));
        return subItems.length ? { ...item, subItems } : null;
      }
      return canAccessPath(roleCode, (item as any).path || "#") ? item : null;
    })
    .filter(Boolean) as typeof menuItems;

  // Block direct-URL access to routes this role isn't allowed to open.
  const routeAllowed = canAccessPath(roleCode, location.pathname);


  return (
    <div className="flex h-screen bg-[#FAFBFC]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
              <Sprout className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-slate-900 font-bold text-base tracking-tight">Fairventures</h1>
              <p className="text-xs text-slate-500 font-medium">Operations System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto">
          <ul className="space-y-1">
            {visibleMenu.map((item) => {
              const Icon = item.icon;
              const isActive = item.path && location.pathname === item.path;
              const hasSubItems = "subItems" in item && item.subItems;
              const isExpanded = expandedMenus.includes(item.id);

              // The parent carries the sum of its own sub-items, and only of the
              // ones this role may open — a number pointing at a hidden page is
              // worse than none. It stays on show while the menu is expanded so
              // the total is readable either way.
              const groupCount = hasSubItems
                ? item.subItems!.reduce((n, s) => n + (INBOX_PATHS[s.path] ? inbox[INBOX_PATHS[s.path]].total : 0), 0)
                : 0;

              if (hasSubItems) {
                return (
                  <li key={item.id}>
                    <button
                      onClick={() =>
                        setExpandedMenus((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        )
                      }
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                      <span className="text-sm font-semibold flex-1 text-left">{item.label}</span>
                      <InboxBadge count={groupCount} title={inboxTitle(inbox)} />
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {item.subItems.map((subItem) => {
                          const isSubActive = location.pathname === subItem.path;
                          const key = INBOX_PATHS[subItem.path];
                          const count = key ? inbox[key].total : 0;
                          return (
                            <li key={subItem.id}>
                              <Link
                                to={subItem.path}
                                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-sm ${
                                  isSubActive
                                    ? "bg-emerald-50 text-emerald-600 font-semibold"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                              >
                                <span className="flex-1">{subItem.label}</span>
                                <InboxBadge count={count} title={inboxTitle(inbox, key)} />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <Link
                    to={item.path || "#"}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-emerald-50 text-emerald-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-slate-100">
          {/* Entity Badge */}
          <div className="flex items-center gap-2 px-3 py-2 mb-1 bg-emerald-50 rounded-xl border border-emerald-100">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-xs font-semibold text-emerald-700">{SESSION.entity}</span>
            <span className="ml-auto text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-medium">{SESSION.role}</span>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {SESSION.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 font-semibold truncate">{SESSION.name}</p>
              <p className="text-xs text-slate-400 truncate">Keluar</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-100">
          <div className="px-8 py-4 flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Cari inventory, order, petani..."
                  className="w-full pl-11 pr-4 py-3 text-sm border border-slate-200 rounded-2xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:border-emerald-200 transition-all font-medium"
                />
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Date Range */}
              <button className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                <Calendar className="w-4 h-4" strokeWidth={2.5} />
                <span className="font-semibold">May 20 - 27</span>
              </button>

              {/* Quick Filter */}
              <button className="p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
                <Filter className="w-4.5 h-4.5" strokeWidth={2.5} />
              </button>

              {/* Divider */}
              <div className="w-px h-7 bg-slate-200 mx-1"></div>

              {/* Notifications */}
              {/* The dot here used to be painted on: always red whether or not
                  anything was waiting, so it told nobody anything. It now counts
                  unread notifications and disappears at zero. The wrapper is
                  `relative` so the panel below hangs off the bell rather than off
                  the header. */}
              <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                title={notif.unread ? `${notif.unread} notifikasi belum dibaca` : "Tidak ada notifikasi baru"}
                className="relative p-2.5 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
              >
                <Bell className="w-4.5 h-4.5" strokeWidth={2.5} />
                {notif.unread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none ring-2 ring-white">
                    {notif.unread > 99 ? "99+" : notif.unread}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  {/* Clicking anywhere else closes it. A panel that only closes by
                      the button that opened it is a panel people leave open. */}
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-[26rem] max-w-[calc(100vw-2rem)] z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-semibold text-slate-800">Notifikasi</p>
                      {notif.unread > 0 && (
                        <button onClick={() => notif.markAllRead()}
                          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
                          Tandai semua dibaca
                        </button>
                      )}
                    </div>
                    <div className="max-h-[26rem] overflow-y-auto">
                      {notif.items.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => {
                            if (!n.read_at) notif.markRead(n.id);
                            setNotifOpen(false);
                            if (n.link) navigate(n.link);
                          }}
                          className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${n.read_at ? "" : "bg-emerald-50/40"}`}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read_at && <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                            <div className={n.read_at ? "pl-4" : ""}>
                              <p className={`text-sm ${n.read_at ? "text-slate-600" : "text-slate-900 font-semibold"}`}>{n.title}</p>
                              {n.body && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>}
                              <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                      {!notif.items.length && (
                        <div className="px-4 py-10 text-center">
                          <Bell className="w-6 h-6 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">Belum ada notifikasi.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              </div>

              {/* Entity + User */}
              <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">{SESSION.entity}</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{SESSION.role}</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-white">{SESSION.initials}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto px-8 py-8 bg-[#FAFBFC]">
          {routeAllowed ? (
            <Outlet />
          ) : (
            <div className="max-w-md mx-auto mt-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Akses Ditolak</h2>
              <p className="text-sm text-slate-500 mb-6">
                Role <span className="font-semibold text-slate-700">{SESSION.role}</span> tidak memiliki akses ke halaman ini.
              </p>
              <button onClick={() => navigate("/")} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-colors">
                Kembali ke Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
