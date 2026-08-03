import { prisma } from "@/lib/db/prisma";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";

export async function getSuppliers() {
  return prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
}

export async function createSupplier(
  data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  },
  actor?: AuditActor
) {
  const supplier = await prisma.supplier.create({ data });

  if (actor) {
    void writeAuditLog({
      action: "supplier.created",
      actor,
      targetId: supplier.id,
      targetType: "Supplier",
      metadata: { name: data.name },
    });
  }

  return supplier;
}

export async function updateSupplier(
  supplierId: string,
  data: Partial<{
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
  }>,
  actor?: AuditActor
) {
  const existing = await prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
  if (!existing) return null;

  const result = await prisma.supplier.update({ where: { id: supplierId }, data });

  if (actor) {
    void writeAuditLog({
      action: "supplier.updated",
      actor,
      targetId: supplierId,
      targetType: "Supplier",
      metadata: { fields: Object.keys(data) },
    });
  }

  return result;
}

export async function deleteSupplier(supplierId: string, actor?: AuditActor) {
  const existing = await prisma.supplier.findFirst({ where: { id: supplierId, deletedAt: null } });
  if (!existing) return null;

  const result = await prisma.supplier.update({
    where: { id: supplierId },
    data: { deletedAt: new Date() },
  });

  if (actor) {
    void writeAuditLog({
      action: "supplier.deleted",
      actor,
      targetId: supplierId,
      targetType: "Supplier",
    });
  }

  return result;
}
