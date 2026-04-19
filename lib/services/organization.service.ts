import { connectDB } from "@/lib/db/connect";
import { Organization, type OrganizationType, type IOrganizationSettings } from "@/lib/db/models/Organization";

const TYPE_DEFAULT_SETTINGS: Record<OrganizationType, IOrganizationSettings> = {
  headquarters: {
    canSellRetail: false,
    canDistribute: true,
    hasInventory: true,
    commissionEnabled: false,
    canSubmitOrders: false,
  },
  distributor: {
    canSellRetail: false,
    canDistribute: true,
    hasInventory: true,
    commissionEnabled: false,
    canSubmitOrders: true,
  },
  franchise: {
    canSellRetail: true,
    canDistribute: false,
    hasInventory: true,
    commissionEnabled: false,
    canSubmitOrders: true,
  },
  partner: {
    canSellRetail: true,
    canDistribute: false,
    hasInventory: false,
    commissionEnabled: true,
    canSubmitOrders: true,
  },
};

export async function getOrganizations(type?: OrganizationType) {
  await connectDB();
  const filter: Record<string, unknown> = { deletedAt: null };
  if (type) filter.type = type;
  return Organization.find(filter)
    .populate("parentOrganizationId", "name type")
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
