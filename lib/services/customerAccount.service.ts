import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { getSiteUrl } from "@/lib/seo/site";
import { sendEmail } from "@/lib/email/resend";
import { emailVerificationTemplate } from "@/lib/email/templates";
import logger from "@/lib/logger";
import type { RegisterCustomerInput } from "@/lib/validations/account.schema";
import { DEFAULT_MARKETPLACE_SIGNUP_ROLE } from "@/types";

const EMAIL_VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const emailEnabled = () => !!process.env.RESEND_API_KEY;

export async function registerMarketplaceCustomer(input: RegisterCustomerInput) {
  await connectDB();
  const email = input.email.toLowerCase().trim();
  const existing = await User.findOne({ email, deletedAt: null }).lean();
  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const password = await bcrypt.hash(input.password, 12);
  const requireVerification = emailEnabled();
  const verificationToken = requireVerification ? nanoid(40) : null;

  await User.create({
    name: input.name.trim(),
    email,
    password,
    role: DEFAULT_MARKETPLACE_SIGNUP_ROLE,
    branchIds: [],
    organizationId: null,
    permissions: [],
    isActive: true,
    emailVerified: !requireVerification,
    emailVerificationToken: verificationToken,
    emailVerificationExpiry: verificationToken
      ? new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS)
      : null,
  });

  if (verificationToken) {
    const verifyUrl = `${getSiteUrl()}/verify-email?token=${verificationToken}`;
    const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Glowish";
    const { subject, html } = emailVerificationTemplate({
      name: input.name.trim(),
      verifyUrl,
      appName,
    });
    try {
      await sendEmail({ to: email, subject, html });
    } catch (err) {
      logger.error({ err, email }, "Failed to send verification email after registration");
    }
  }
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  await connectDB();
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerified: false,
    deletedAt: null,
  })
    .select("+emailVerificationToken +emailVerificationExpiry")
    .lean();

  if (!user) return false;
  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) return false;

  await User.updateOne(
    { _id: user._id },
    { emailVerified: true, emailVerificationToken: null, emailVerificationExpiry: null }
  );
  return true;
}
