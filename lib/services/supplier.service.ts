import { connectDB } from "@/lib/db/connect";
import { Supplier } from "@/lib/db/models/Supplier";

export async function getSuppliers() {
  await connectDB();
  return Supplier.find({ deletedAt: null }).sort({ name: 1 }).lean();
}

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  await connectDB();
  return Supplier.create({ ...data });
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
  }>
) {
  await connectDB();
  return Supplier.findOneAndUpdate(
    { _id: supplierId, deletedAt: null },
    { $set: data },
    { new: true }
  ).lean();
}

export async function deleteSupplier(supplierId: string) {
  await connectDB();
  return Supplier.findOneAndUpdate(
    { _id: supplierId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
}
