// =============================================================================
// RBAC engine.
//
// Permissions are no longer hardcoded per role. `PERMISSIONS` below is just
// the *catalog* of permission keys the app understands (used to render
// checkboxes in the Roles admin UI and to seed the Permissions sheet/mock on
// first run). Which permissions a given role actually grants is data — it
// lives in the Roles repository (Google Sheets "Roles" tab, or the mock
// store) and is fully editable from the Roles admin screen at runtime.
//
// `getCurrentUserPermissions()` / `requireAuth()` in ./auth.ts resolve a
// user's role -> permission set fresh on every request (never trusted from
// a cookie), then callers use the synchronous helpers below against that
// resolved `Set<string>`. This keeps every call site here simple while still
// guaranteeing permission checks reflect the live Roles/Permissions data,
// not a stale snapshot.
// =============================================================================

export interface PermissionDef {
  id: string;
  label: string;
  group: string;
}

export const PERMISSIONS = [
  { id: "query.view", label: "View queries", group: "Queries" },
  { id: "query.create", label: "Create queries", group: "Queries" },
  { id: "query.edit", label: "Edit queries", group: "Queries" },
  { id: "quotation.create", label: "Create / edit quotations", group: "Quotations" },
  { id: "quotation.send", label: "Send quotations to customers", group: "Quotations" },
  { id: "quotation.view_pricing", label: "View markup, profit & margin", group: "Quotations" },
  { id: "quotation.view_supplier_cost", label: "View supplier cost", group: "Quotations" },
  { id: "inventory.manage_hotels", label: "Manage hotel inventory", group: "Inventory" },
  { id: "inventory.manage_transport", label: "Manage transport inventory", group: "Inventory" },
  { id: "inventory.manage_activities", label: "Manage activities inventory", group: "Inventory" },
  { id: "inventory.manage_suppliers", label: "Manage suppliers", group: "Inventory" },
  { id: "inventory.manage_rates", label: "Manage rate sheet", group: "Inventory" },
  { id: "booking.view", label: "View bookings", group: "Bookings" },
  { id: "booking.manage", label: "Create / edit bookings", group: "Bookings" },
  { id: "accounts.view", label: "View accounts & payments", group: "Accounts" },
  { id: "accounts.manage", label: "Record payments & ledger entries", group: "Accounts" },
  { id: "reports.view", label: "View reports", group: "Reports" },
  { id: "reports.export", label: "Export reports", group: "Reports" },
  { id: "settings.manage", label: "Manage app settings", group: "Admin" },
  { id: "users.manage", label: "Manage users", group: "Admin" },
  { id: "roles.manage", label: "Manage roles & permissions", group: "Admin" },
  { id: "audit.view", label: "View audit logs", group: "Admin" },
] as const satisfies readonly PermissionDef[];

export type Permission = (typeof PERMISSIONS)[number]["id"];

export const PERMISSION_IDS: Permission[] = PERMISSIONS.map((p) => p.id);

/** Seed data for the four roles the app shipped with historically — used only to seed an empty Roles sheet/mock on first run. */
export const DEFAULT_ROLE_SEEDS: { name: string; description: string; permissionIds: Permission[] }[] = [
  {
    name: "Admin",
    description: "Full access to every module.",
    permissionIds: [...PERMISSION_IDS],
  },
  {
    name: "Sales",
    description: "Creates queries and quotations, cannot see supplier cost or manage inventory.",
    permissionIds: [
      "query.view", "query.create", "query.edit",
      "quotation.create", "quotation.send",
      "booking.view",
      "reports.view",
    ],
  },
  {
    name: "Operations",
    description: "Manages inventory and rates, no pricing/financial visibility.",
    permissionIds: [
      "query.view",
      "inventory.manage_hotels", "inventory.manage_transport", "inventory.manage_activities",
      "inventory.manage_suppliers", "inventory.manage_rates",
      "booking.view", "booking.manage",
    ],
  },
  {
    name: "Finance",
    description: "Views pricing, supplier cost, and financial reports; records payments.",
    permissionIds: [
      "query.view",
      "quotation.view_pricing", "quotation.view_supplier_cost",
      "booking.view",
      "accounts.view", "accounts.manage",
      "reports.view", "reports.export",
    ],
  },
];

/** Fields that must never reach a customer-facing PDF or shared quote link. */
export const CUSTOMER_HIDDEN_FIELDS = [
  "supplierCost",
  "cost", // transport/activity cost
  "profit",
  "margin",
  "internalNotes",
  "internalComments",
] as const;

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/** Synchronous check against an already-resolved permission set (see ./auth.ts). Super Admins should pass a set containing every PERMISSION_ID. */
export function hasPermission(permissions: ReadonlySet<string>, permission: Permission): boolean {
  return permissions.has(permission);
}

export function assertPermissionSet(permissions: ReadonlySet<string>, permission: Permission): void {
  if (!hasPermission(permissions, permission)) {
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
}
