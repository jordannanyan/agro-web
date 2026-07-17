// Role-based access control (frontend gating).
// Roles: Intern, PM, Head, Finance, Director.
//
// Ringkasan:
//  - Intern   : Dashboard + Procurement → Purchase Request saja.
//  - PM       : + Purchase Order, Vendor, Stock List, Transaction, Map, Reports.
//  - Head     : + Payment Request, Warehouse, Pre-Finance.
//  - Finance  : semua (termasuk Finance, Profit Sharing, Settings).
//  - Director : semua.
//  - Admin    : akses penuh ke semua halaman (termasuk manajemen pengguna).

export type Role = "Intern" | "PM" | "Head" | "Finance" | "Director" | "Admin";
export const ALL_ROLES: Role[] = ["Intern", "PM", "Head", "Finance", "Director", "Admin"];

// Path prefix → allowed roles. Evaluated top-to-bottom; first match wins.
// List more specific prefixes before general ones.
const RULES: { prefix: string; roles: Role[] }[] = [
  // Procurement — PR is the only procurement area an Intern may enter.
  { prefix: "/procurement/purchase-request", roles: ALL_ROLES },
  { prefix: "/procurement/pr",               roles: ALL_ROLES },
  { prefix: "/procurement/purchase-order",   roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/procurement/po",               roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/procurement/payment-request",  roles: ["Head", "Finance", "Director"] },
  { prefix: "/procurement/payreq",           roles: ["Head", "Finance", "Director"] },
  { prefix: "/procurement/vendor",           roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/procurement/stock-list",       roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/procurement",                  roles: ["PM", "Head", "Finance", "Director"] },

  { prefix: "/transaction",    roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/warehouse",      roles: ["Head", "Finance", "Director"] },
  { prefix: "/prefinance",     roles: ["Head", "Finance", "Director"] },
  { prefix: "/financial",      roles: ["Finance", "Director"] },
  { prefix: "/profit-sharing", roles: ["Finance", "Director"] },
  { prefix: "/map",            roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/reports",        roles: ["PM", "Head", "Finance", "Director"] },
  { prefix: "/settings",       roles: ["Finance", "Director"] },
];

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/");
}

/** Can this role open this route? Dashboard ("/") is open to everyone logged in. */
export function canAccessPath(role: string | null | undefined, path: string): boolean {
  if (!role) return false;
  if (role === "Admin") return true; // full access to everything
  if (path === "/") return true;
  for (const r of RULES) {
    if (matches(path, r.prefix)) return r.roles.includes(role as Role);
  }
  return true; // unmapped paths default to allowed
}

/** Can this role act on an approval step assigned to `stepRole`? Director may act on any step. */
export function canApprove(role: string | null | undefined, stepRole: string | null | undefined): boolean {
  if (!role) return false;
  if (role === "Director" || role === "Admin") return true;
  return !!stepRole && role === stepRole;
}
