import { connectDB } from "@/lib/db/connect";
import { Supplier } from "@/lib/db/models/Supplier";
import { writeAuditLog, type AuditActor } from "@/lib/services/audit.service";

export async function getSuppliers() {
  await connectDB();
  return Supplier.find({ deletedAt: null }).sort({ name: 1 }).lean();
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
  await connectDB();
  const supplier = await Supplier.create({ ...data });

  if (actor) {
    void writeAuditLog({
      action: "supplier.created",
      actor,
      targetId: String(supplier._id),
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
  await connectDB();
  const result = await Supplier.findOneAndUpdate(
    { _id: supplierId, deletedAt: null },
    { $set: data },
    { new: true }
  ).lean();

  if (result && actor) {
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
  await connectDB();
  const result = await Supplier.findOneAndUpdate(
    { _id: supplierId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );

  if (result && actor) {
    void writeAuditLog({
      action: "supplier.deleted",
      actor,
      targetId: supplierId,
      targetType: "Supplier",
    });
  }

  return result;
}
