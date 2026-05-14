import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import type { RegisterCustomerInput } from "@/lib/validations/account.schema";
import { DEFAULT_MARKETPLACE_SIGNUP_ROLE } from "@/types";

export async function registerMarketplaceCustomer(input: RegisterCustomerInput) {
  await connectDB();
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email, deletedAt: null }).lean();
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const password = await bcrypt.hash(input.password, 12);

  await User.create({
    name: input.name.trim(),
    email,
    password,
    role: DEFAULT_MARKETPLACE_SIGNUP_ROLE,
    branchIds: [],
    organizationId: null,
    permissions: [],
    isActive: true,
  });
}
