import { ExcelTable } from "./excelTable";
import type { UserRepository } from "../types";
import type { User } from "@/types/domain";

const COLUMNS = [
  "id", "name", "email", "passwordHash", "roleId", "status", "isSuperAdmin",
  "failedLoginAttempts", "lockedUntil", "lastLoginAt", "createdAt", "updatedAt",
];

function rowToRecord(row: string[]): User {
  const [id, name, email, passwordHash, roleId, status, isSuperAdmin, failedLoginAttempts, lockedUntil, lastLoginAt, createdAt, updatedAt] = row;
  return {
    id, name, email, passwordHash, roleId,
    status: (status as User["status"]) || "Active",
    isSuperAdmin: isSuperAdmin === "TRUE" || isSuperAdmin === "true",
    failedLoginAttempts: Number(failedLoginAttempts) || 0,
    lockedUntil: lockedUntil || undefined,
    lastLoginAt: lastLoginAt || undefined,
    createdAt, updatedAt,
  };
}

function recordToRow(r: User): string[] {
  return [
    r.id, r.name, r.email, r.passwordHash, r.roleId, r.status, String(r.isSuperAdmin),
    String(r.failedLoginAttempts ?? 0), r.lockedUntil ?? "", r.lastLoginAt ?? "", r.createdAt, r.updatedAt,
  ];
}

export class ExcelUserRepository implements UserRepository {
  private table = new ExcelTable<User>("Users", COLUMNS, rowToRecord, recordToRow);

  async list(): Promise<User[]> {
    return this.table.list();
  }

  /** Alias for the generic CRUD-repository shape ("getAll") requested for these repositories — same data as list(). */
  async getAll(): Promise<User[]> {
    return this.list();
  }

  async get(id: string): Promise<User | null> {
    return this.table.get(id);
  }

  async getByEmail(email: string): Promise<User | null> {
    const lower = email.toLowerCase();
    const all = await this.table.list();
    return all.find((u) => u.email.toLowerCase() === lower) ?? null;
  }

  /** Alias — this is what the login flow conceptually calls "findByEmail"; userRepository.getByEmail() is the one actually wired into src/lib/auth.ts. */
  async findByEmail(email: string): Promise<User | null> {
    return this.getByEmail(email);
  }

  async find(predicate: (user: User) => boolean): Promise<User[]> {
    return (await this.list()).filter(predicate);
  }

  async create(data: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const existing = await this.getByEmail(data.email);
    if (existing) throw new Error("A user with this email already exists.");
    const now = new Date().toISOString();
    const record: User = { ...data, id: `usr_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`User ${id} not found`);
    const updated: User = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }

  async delete(id: string): Promise<void> {
    await this.table.deleteById(id);
  }
}
