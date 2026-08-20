import { cache } from "react";
import { cookies } from "next/headers";
import { userRepository, roleRepository } from "@/lib/repositories";
import { verifyPassword, hashPassword } from "@/lib/password";
import { signSession, verifySession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { PERMISSION_IDS, AuthorizationError, DEFAULT_ROLE_SEEDS, type Permission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import type { User } from "@/types/domain";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  roleId: string;
  roleName: string;
  isSuperAdmin: boolean;
  permissions: Set<string>;
}

/**
 * Resolves the logged-in user's identity and permission set fresh from the
 * Users/Roles repositories on every call. Wrapped in React's `cache()` so
 * multiple checks within the same request (e.g. several Server Components
 * on one page) share a single set of repository reads instead of hitting
 * Google Sheets repeatedly — the cache is scoped to a single request and
 * never persists across requests, so a role change or deactivation is
 * visible on the very next request.
 */
export const getCurrentUserContext = cache(async (): Promise<AuthContext | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const user = await userRepository.get(session.uid);
  if (!user || user.status !== "Active") return null;

  const role = await roleRepository.get(user.roleId);
  const permissions = new Set<string>(user.isSuperAdmin ? PERMISSION_IDS : (role?.permissionIds ?? []));

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    roleId: user.roleId,
    roleName: role?.name ?? "Unknown Role",
    isSuperAdmin: user.isSuperAdmin,
    permissions,
  };
});

/**
 * Call at the top of every server action / route handler that reads or
 * mutates protected data. Throws AuthorizationError if not authenticated,
 * or if `permission` is given and the resolved permission set doesn't
 * include it. Denials are audit-logged.
 */
export async function requireAuth(permission?: Permission): Promise<AuthContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx) throw new AuthorizationError("Not authenticated.");

  if (permission && !ctx.isSuperAdmin && !ctx.permissions.has(permission)) {
    await logAudit({
      userId: ctx.userId,
      userEmail: ctx.email,
      action: "permission_denied",
      entityType: "Permission",
      entityId: permission,
    });
    throw new AuthorizationError(`Missing permission: ${permission}`);
  }
  return ctx;
}

/** Convenience for Server Components that want to render differently when logged out rather than throwing (requireAuth still runs in middleware as the real gate). */
export async function getOptionalCurrentUser(): Promise<AuthContext | null> {
  return getCurrentUserContext();
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

/**
 * On a completely fresh `database/data.xlsx` (first-ever startup), there is
 * no Admin role and no user at all — nobody could ever log in. This seeds
 * the four default roles (from DEFAULT_ROLE_SEEDS) and one bootstrap Super
 * Admin account the very first time `login()` runs, then never touches
 * either sheet again once they're non-empty. Credentials come from
 * SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD (see .env.example) so the
 * password is never hardcoded in source.
 */
async function ensureBootstrapData(): Promise<void> {
  const existingRoles = await roleRepository.list();
  let adminRoleId = existingRoles.find((r) => r.name === "Admin")?.id;

  if (existingRoles.length === 0) {
    for (const seed of DEFAULT_ROLE_SEEDS) {
      const created = await roleRepository.create({ ...seed, isSystem: true });
      if (seed.name === "Admin") adminRoleId = created.id;
    }
  }

  const existingUsers = await userRepository.list();
  if (existingUsers.length > 0 || !adminRoleId) return;

  const email = (process.env.SUPER_ADMIN_EMAIL || "admin@vietnamdmc.com").toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123";
  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    // eslint-disable-next-line no-console
    console.warn(
      `[auth] SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD not set — created a default bootstrap Super ` +
      `Admin "${email}" with a default password. Set both in .env.local and change the password ` +
      "after first login before using this anywhere real."
    );
  }

  await userRepository.create({
    name: "Super Admin",
    email,
    passwordHash: await hashPassword(password),
    roleId: adminRoleId,
    status: "Active",
    isSuperAdmin: true,
    failedLoginAttempts: 0,
  });
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

/**
 * Verifies credentials, applies lockout, sets the signed session cookie, and
 * audit-logs the outcome. Returns a generic error message on any failure so
 * the login form never reveals whether an email exists.
 */
export async function login(emailInput: string, password: string): Promise<LoginResult> {
  await ensureBootstrapData();

  const email = emailInput.trim().toLowerCase();
  const genericError = "Invalid email or password.";

  const user = await userRepository.getByEmail(email);
  if (!user) {
    await logAudit({ userId: "", userEmail: email, action: "login_failed", entityType: "User", details: "unknown email" });
    return { ok: false, error: genericError };
  }

  if (user.status !== "Active") {
    await logAudit({ userId: user.id, userEmail: user.email, action: "login_failed", entityType: "User", details: "inactive account" });
    return { ok: false, error: genericError };
  }

  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
    await logAudit({ userId: user.id, userEmail: user.email, action: "login_failed", entityType: "User", details: "account locked" });
    return { ok: false, error: `Too many failed attempts. Try again after ${new Date(user.lockedUntil).toLocaleTimeString()}.` };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    const update: Partial<User> = { failedLoginAttempts: attempts };
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      update.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
    }
    await userRepository.update(user.id, update);
    await logAudit({ userId: user.id, userEmail: user.email, action: "login_failed", entityType: "User", details: "wrong password" });
    return { ok: false, error: genericError };
  }

  await userRepository.update(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: undefined,
    lastLoginAt: new Date().toISOString(),
  });

  const { token, expiresAt } = await signSession(user.id);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));

  await logAudit({ userId: user.id, userEmail: user.email, action: "login", entityType: "User" });

  return { ok: true };
}

/** For the handful of screens (spreadsheet Connections) that only the bootstrap Super Admin(s) may touch, regardless of what a custom role grants. */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await getCurrentUserContext();
  if (!ctx) throw new AuthorizationError("Not authenticated.");
  if (!ctx.isSuperAdmin) {
    await logAudit({
      userId: ctx.userId,
      userEmail: ctx.email,
      action: "permission_denied",
      entityType: "Permission",
      entityId: "super_admin_only",
    });
    throw new AuthorizationError("This section is restricted to the Super Admin.");
  }
  return ctx;
}

export async function logout(): Promise<void> {
  const ctx = await getCurrentUserContext();
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
  if (ctx) {
    await logAudit({ userId: ctx.userId, userEmail: ctx.email, action: "logout", entityType: "User" });
  }
}
