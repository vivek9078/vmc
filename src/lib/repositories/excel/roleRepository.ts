import { ExcelTable } from "./excelTable";
import type { RoleRepository } from "../types";
import type { Role } from "@/types/domain";

const COLUMNS = ["id", "name", "description", "permissionIds", "isSystem", "createdAt", "updatedAt"];

function rowToRecord(row: string[]): Role {
  const [id, name, description, permissionIds, isSystem, createdAt, updatedAt] = row;
  return {
    id, name,
    description: description || undefined,
    permissionIds: permissionIds ? permissionIds.split(",").map((p) => p.trim()).filter(Boolean) : [],
    isSystem: isSystem === "TRUE" || isSystem === "true",
    createdAt, updatedAt,
  };
}

function recordToRow(r: Role): string[] {
  return [r.id, r.name, r.description ?? "", r.permissionIds.join(","), String(r.isSystem), r.createdAt, r.updatedAt];
}

export class ExcelRoleRepository implements RoleRepository {
  private table = new ExcelTable<Role>("Roles", COLUMNS, rowToRecord, recordToRow);

  async list(): Promise<Role[]> {
    return this.table.list();
  }

  async getAll(): Promise<Role[]> {
    return this.list();
  }

  async get(id: string): Promise<Role | null> {
    return this.table.get(id);
  }

  async find(predicate: (role: Role) => boolean): Promise<Role[]> {
    return (await this.list()).filter(predicate);
  }

  async create(data: Omit<Role, "id" | "createdAt" | "updatedAt">): Promise<Role> {
    const now = new Date().toISOString();
    const record: Role = { ...data, id: `role_${Date.now()}`, createdAt: now, updatedAt: now };
    return this.table.append(record);
  }

  async update(id: string, data: Partial<Role>): Promise<Role> {
    const existing = await this.table.get(id);
    if (!existing) throw new Error(`Role ${id} not found`);
    const updated: Role = { ...existing, ...data, updatedAt: new Date().toISOString() };
    return this.table.updateById(id, updated);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.table.get(id);
    if (existing?.isSystem) throw new Error("System roles cannot be deleted.");
    await this.table.deleteById(id);
  }
}
