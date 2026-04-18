import { connectDB } from "@/lib/db/connect";
import { Supplier } from "@/lib/db/models/Supplier";

export async function getSuppliers(tenantId: string) {
  await connectDB();
  return Supplier.find({ tenantId, deletedAt: null }).sort({ name: 1 }).lean();
}

export async function createSupplier(
  tenantId: string,
  data: {
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    notes?: string;
  }
) {
  await connectDB();
  return Supplier.create({ tenantId, ...data });
}

export async function updateSupplier(
  tenantId: string,
  supplierId: string,
  data: Partial<{
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
  }>
) {
  await connectDB();
  return Supplier.findOneAndUpdate(
    { _id: supplierId, tenantId, deletedAt: null },
    { $set: data },
    { new: true }
  ).lean();
}

export async function deleteSupplier(tenantId: string, supplierId: string) {
  await connectDB();
  return Supplier.findOneAndUpdate(
    { _id: supplierId, tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
}
