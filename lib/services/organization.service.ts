import { connectDB } from "@/lib/db/connect";
import { Organization, type OrganizationType, type IOrganizationSettings } from "@/lib/db/models/Organization";
import { TYPE_DEFAULT_SETTINGS } from "@/lib/organization/typeDefaults";
import type { SessionUser } from "@/types";

export { TYPE_DEFAULT_SETTINGS };

export async function getOrganizations(type?: OrganizationType) {
  await connectDB();
  const filter: Record<string, unknown> = { deletedAt: null };
  if (type) filter.type = type;
  return Organization.find(filter)
    .populate("parentOrganizationId", "name type")
    .sort({ name: 1 })
    .lean();
}

/** Organizations visible for B2B seller/buyer pickers (admin: all; org admin: self + parent + siblings / children). */
export async function getOrganizationsForOrderContext(user: SessionUser) {
  await connectDB();
  if (user.role === "ADMIN") {
    return Organization.find({ deletedAt: null }).select("name type settings").sort({ name: 1 }).lean();
  }
  if (user.role !== "ORG_ADMIN" || !user.organizationId) {
    return [];
  }
  const oid = user.organizationId;
  const myOrg = await Organization.findOne({ _id: oid, deletedAt: null }).select("parentOrganizationId").lean();
  const parentId = myOrg?.parentOrganizationId ? String(myOrg.parentOrganizationId) : null;

  if (parentId) {
    return Organization.find({
      deletedAt: null,
      $or: [{ _id: oid }, { _id: parentId }, { parentOrganizationId: parentId }],
    })
      .select("name type settings")
      .sort({ name: 1 })
      .lean();
  }

  return Organization.find({
    deletedAt: null,
    $or: [{ _id: oid }, { parentOrganizationId: oid }],
  })
    .select("name type settings")
    .sort({ name: 1 })
    .lean();
}

export async function getOrganizationById(id: string) {
  await connectDB();
  return Organization.findOne({ _id: id, deletedAt: null })
    .populate("parentOrganizationId", "name type")
    .lean();
}

export async function createOrganization(data: {
  name: string;
  type: OrganizationType;
  parentOrganizationId?: string | null;
  settings?: Partial<IOrganizationSettings>;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  await connectDB();

  if (data.type === "headquarters") {
    const existing = await Organization.findOne({ type: "headquarters", deletedAt: null }).lean();
    if (existing) throw new Error("A headquarters organization already exists");
  }

  const settings = { ...TYPE_DEFAULT_SETTINGS[data.type], ...data.settings };
  return Organization.create({ ...data, settings });
}

export async function updateOrganization(
  id: string,
  data: Partial<{
    name: string;
    type: OrganizationType;
    parentOrganizationId: string | null;
    settings: Partial<IOrganizationSettings>;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    isActive: boolean;
  }>
) {
  await connectDB();
  return Organization.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: data },
    { new: true }
  ).lean();
}

export async function deleteOrganization(id: string) {
  await connectDB();
  return Organization.findOneAndUpdate(
    { _id: id, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
}
