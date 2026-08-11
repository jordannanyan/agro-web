// Role-based access control (frontend gating).
//
// Gating is done on `role_code`, the stable slug, never on `role_name` — the display
// name is editable from Settings, and gating on it would silently break access the
// moment somebody renames a role.
//
// Source of truth for the roles and the flow:
// Dokumentasi_Role_Approval_Procurement.pdf (2026-08-01).
//
// Ringkasan:
//  - Field Admin     : Dashboard, Purchase Request, Warehouse (stok masuk/keluar), Transaction.
//  - Procurement     : + Purchase Order, Payment Request, Vendor, Pre-Finance.
//  - Project Manager : approver PR/PO/PayReq; akses operasional penuh.
//  - Finance Manager : + Financial, Profit Sharing; approver & eksekutor pembayaran.
//  - Finance Staff   : Payment Request (input pembayaran) + Financial. Bukan approver.
//  - Director        : semua area bisnis.
//  - Admin           : administrasi sistem (Settings, user) + akses baca operasional.
//  - Super Admin     : akses penuh tanpa pengecualian.

export const ROLE = {
  FIELD_ADMIN: "FIELD_ADMIN",
  PROCUREMENT: "PROCUREMENT",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  FINANCE_MANAGER: "FINANCE_MANAGER",
  FINANCE_STAFF: "FINANCE_STAFF",
  DIRECTOR: "DIRECTOR",
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: Role[] = Object.values(ROLE);

/** Everyone in the procurement chain, from requester up to Director. */
const BUSINESS_CHAIN: Role[] = [
  ROLE.FIELD_ADMIN, ROLE.PROCUREMENT, ROLE.PROJECT_MANAGER,
  ROLE.FINANCE_MANAGER, ROLE.DIRECTOR,
];

/** Procurement chain minus the Field Admin (who only files PRs). */
const ABOVE_FIELD_ADMIN: Role[] = [
  ROLE.PROCUREMENT, ROLE.PROJECT_MANAGER, ROLE.FINANCE_MANAGER, ROLE.DIRECTOR,
];

const FINANCE: Role[] = [ROLE.FINANCE_MANAGER, ROLE.FINANCE_STAFF, ROLE.DIRECTOR];

// Path prefix → allowed roles. Evaluated top-to-bottom; first match wins.
// List more specific prefixes before general ones.
const RULES: { prefix: string; roles: Role[] }[] = [
  // Procurement — PR is the only procurement area a Field Admin may enter.
  { prefix: "/procurement/purchase-request", roles: BUSINESS_CHAIN },
  { prefix: "/procurement/pr",               roles: BUSINESS_CHAIN },
  // Finance Staff needs the Payment Request pages: they key in the actual payment
  // once the chain is signed off. They cannot approve — that is enforced by the API
  // and by canApprove() below.
  { prefix: "/procurement/payment-request",  roles: [...ABOVE_FIELD_ADMIN, ROLE.FINANCE_STAFF] },
  { prefix: "/procurement/payreq",           roles: [...ABOVE_FIELD_ADMIN, ROLE.FINANCE_STAFF] },
  { prefix: "/procurement/purchase-order",   roles: ABOVE_FIELD_ADMIN },
  { prefix: "/procurement/po",               roles: ABOVE_FIELD_ADMIN },
  { prefix: "/procurement/vendor",           roles: ABOVE_FIELD_ADMIN },
  { prefix: "/procurement/stock-list",       roles: ABOVE_FIELD_ADMIN },
  { prefix: "/procurement",                  roles: ABOVE_FIELD_ADMIN },

  { prefix: "/transaction",    roles: BUSINESS_CHAIN },
  // Field Admin handles stock in/out (Bambang at SNBS, Alfina at JNBS).
  { prefix: "/warehouse",      roles: BUSINESS_CHAIN },
  { prefix: "/prefinance",     roles: ABOVE_FIELD_ADMIN },
  { prefix: "/financial",      roles: FINANCE },
  { prefix: "/profit-sharing", roles: [ROLE.FINANCE_MANAGER, ROLE.DIRECTOR] },
  { prefix: "/map",            roles: BUSINESS_CHAIN },
  { prefix: "/reports",        roles: [...BUSINESS_CHAIN, ROLE.FINANCE_STAFF] },
  // Settings is system administration, not a business-flow area.
  { prefix: "/settings",       roles: [ROLE.ADMIN] },
];

function matches(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix + "/");
}

/** Can this role open this route? Dashboard ("/") is open to everyone logged in. */
export function canAccessPath(roleCode: string | null | undefined, path: string): boolean {
  if (!roleCode) return false;
  if (roleCode === ROLE.SUPER_ADMIN) return true; // full access to everything
  if (path === "/") return true;
  for (const r of RULES) {
    if (matches(path, r.prefix)) return r.roles.includes(roleCode as Role);
  }
  return true; // unmapped paths default to allowed
}

/**
 * Can this role act on an approval step assigned to `stepRoleCode`?
 *
 * Only the role that owns the step may act on it. The Director used to be able to
 * act on any step, but under the 2026-08 flow the Director holds explicit steps on
 * PO and PayReq — a blanket bypass would hollow out the very control the flow exists
 * to enforce. Super Admin / Admin retain an override for stuck documents, and the
 * API records those as an explicit override in the activity log.
 */
export function canApprove(
  roleCode: string | null | undefined,
  stepRoleCode: string | null | undefined,
): boolean {
  if (!roleCode) return false;
  if (roleCode === ROLE.SUPER_ADMIN || roleCode === ROLE.ADMIN) return true;
  return !!stepRoleCode && roleCode === stepRoleCode;
}

/**
 * May this role record the cash disbursement on a fully approved payment request?
 * Finance Staff is included deliberately — they are normally the one who keys it in.
 */
export function canRecordPayment(roleCode: string | null | undefined): boolean {
  return roleCode === ROLE.FINANCE_MANAGER
    || roleCode === ROLE.FINANCE_STAFF
    || roleCode === ROLE.SUPER_ADMIN;
}

// -----------------------------------------------------------------------------
// Editing and resubmitting procurement documents.
//
// A document is the requester's to change only while it is a Draft, or after an
// approver sent it back for revision. Once it is in the chain, approved, refused
// or paid, editing it would invalidate signatures already given. The API enforces
// exactly the same rule; these helpers only decide what to put on screen.
// -----------------------------------------------------------------------------

export type DocType = "PR" | "PO" | "PayReq";

export const EDITABLE_STATUSES = ["Draft", "Revision"];

/** Roles that may raise each kind of document — mirrors the API's write guards. */
const WRITERS: Record<DocType, Role[]> = {
  PR: [ROLE.FIELD_ADMIN, ROLE.PROJECT_MANAGER, ROLE.PROCUREMENT, ROLE.FINANCE_MANAGER, ROLE.DIRECTOR, ROLE.SUPER_ADMIN, ROLE.ADMIN],
  PO: [ROLE.PROCUREMENT, ROLE.PROJECT_MANAGER, ROLE.FINANCE_MANAGER, ROLE.DIRECTOR, ROLE.SUPER_ADMIN, ROLE.ADMIN],
  PayReq: [ROLE.PROCUREMENT, ROLE.FINANCE_MANAGER, ROLE.DIRECTOR, ROLE.SUPER_ADMIN, ROLE.ADMIN],
};

/** Who files each kind of document when the chain has not been seeded yet. */
const DEFAULT_REQUESTER: Record<DocType, Role> = {
  PR: ROLE.FIELD_ADMIN,
  PO: ROLE.PROCUREMENT,
  PayReq: ROLE.PROCUREMENT,
};

export interface StepLike {
  step_label?: string | null;
  role_code?: string | null;
  role_name?: string | null;
  status?: string;
  note?: string | null;
}

export interface DocLike {
  status: string;
  entity_id?: number | null;
}

export interface UserLike {
  role_code?: string | null;
  role_cross_entity?: boolean;
  entity_id?: number | null;
}

function isSystemAdmin(roleCode: string | null | undefined): boolean {
  return roleCode === ROLE.SUPER_ADMIN || roleCode === ROLE.ADMIN;
}

/**
 * The role that filed this document, read off its own approval chain — the chain
 * comes from configurable approval routes, so a hard-coded map would eventually
 * disagree with it. The map is only the fallback for a Draft with no chain yet.
 */
export function requesterRoleOf(docType: DocType, approvals?: StepLike[] | null): string {
  const requested = (approvals || []).find((s) => s.step_label === "Requested");
  return requested?.role_code || DEFAULT_REQUESTER[docType];
}

/** Documents of another PT are off limits to staff bound to a single entity. */
export function sameEntity(user: UserLike | null | undefined, doc: DocLike): boolean {
  if (!user) return false;
  if (isSystemAdmin(user.role_code) || user.role_cross_entity) return true;
  if (user.entity_id == null || doc.entity_id == null) return true;
  return user.entity_id === doc.entity_id;
}

/** May this user open the edit form for this document? */
export function canEditDocument(
  user: UserLike | null | undefined,
  docType: DocType,
  doc: DocLike,
  approvals?: StepLike[] | null,
): boolean {
  if (!user?.role_code) return false;
  if (!EDITABLE_STATUSES.includes(doc.status)) return false;
  if (!sameEntity(user, doc)) return false;
  if (isSystemAdmin(user.role_code)) return true;
  // A draft may still be finished by anyone who could have raised it; a revision
  // belongs to whoever actually filed it.
  if (doc.status === "Draft") return WRITERS[docType].includes(user.role_code as Role);
  return user.role_code === requesterRoleOf(docType, approvals);
}

/** May this user push a revised document back into the approval chain? */
export function canResubmit(
  user: UserLike | null | undefined,
  docType: DocType,
  doc: DocLike,
  approvals?: StepLike[] | null,
): boolean {
  return doc.status === "Revision" && canEditDocument(user, docType, doc, approvals);
}

/** The note an approver left when sending the document back, if any. */
export function revisionNote(approvals?: StepLike[] | null): { note: string | null; role: string | null } | null {
  const step = (approvals || []).find((s) => s.status === "Revision");
  if (!step) return null;
  return { note: step.note ?? null, role: step.role_name ?? null };
}

/**
 * True when the account sees exactly one PT's documents. Everyone else — the
 * cross-entity roles and the NBSV administrators — sees several, so their lists
 * have to name the entity each row belongs to.
 */
export function isEntityBound(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  if (isSystemAdmin(user.role_code)) return false;
  return !user.role_cross_entity && user.entity_id != null;
}
