import "server-only";

import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";

const TOTP_ISSUER = process.env.NEXT_PUBLIC_APP_NAME ?? "Glowish";
const BACKUP_CODE_COUNT = 8;

// 2FA is required for these roles
const TOTP_REQUIRED_ROLES = new Set(["ADMIN", "ORG_ADMIN"]);

export function isTotpRequiredRole(role: string): boolean {
  return TOTP_REQUIRED_ROLES.has(role);
}

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    randomBytes(4).toString("hex").toUpperCase()
  );
}

function checkTotp(token: string, secret: string): boolean {
  const result = verifySync({ token, secret });
  return typeof result === "object" ? result.valid : Boolean(result);
}

/** Generate a new TOTP secret and return the provisioning URI + QR data URL. */
export async function initTotpSetup(userId: string): Promise<{
  secret: string;
  otpauthUrl: string;
  qrDataUrl: string;
}> {
  await connectDB();
  const user = await User.findOne({ _id: userId, deletedAt: null }).select("email name").lean();
  if (!user) throw new Error("User not found");

  const secret = generateSecret();
  const otpauthUrl = generateURI({ secret, label: user.email, issuer: TOTP_ISSUER });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Store the pending secret (not yet enabled — confirmed after first verify)
  await User.updateOne({ _id: userId }, { $set: { totpSecret: secret, totpEnabled: false } });

  return { secret, otpauthUrl, qrDataUrl };
}

/** Verify a TOTP token and, if correct, enable 2FA and return backup codes. */
export async function confirmTotpSetup(
  userId: string,
  token: string
): Promise<{ backupCodes: string[] }> {
  await connectDB();
  const user = await User.findOne({ _id: userId, deletedAt: null })
    .select("+totpSecret totpEnabled")
    .lean();
  if (!user) throw new Error("User not found");
  if (!user.totpSecret) throw new Error("TOTP setup not initiated");
  if (user.totpEnabled) throw new Error("2FA is already enabled");

  if (!checkTotp(token, user.totpSecret)) throw new Error("Invalid verification code");

  const backupCodes = generateBackupCodes();
  await User.updateOne(
    { _id: userId },
    { $set: { totpEnabled: true, totpBackupCodes: backupCodes } }
  );

  return { backupCodes };
}

/** Verify a TOTP token (login flow). Returns true if valid. */
export async function verifyTotpToken(userId: string, token: string): Promise<boolean> {
  await connectDB();
  const user = await User.findOne({ _id: userId, deletedAt: null })
    .select("+totpSecret +totpBackupCodes totpEnabled")
    .lean();
  if (!user || !user.totpEnabled || !user.totpSecret) return false;

  // Check TOTP token
  if (checkTotp(token, user.totpSecret)) return true;

  // Check backup codes (single-use)
  const normalised = token.toUpperCase().replace(/\s/g, "");
  const codes: string[] = user.totpBackupCodes ?? [];
  const idx = codes.indexOf(normalised);
  if (idx === -1) return false;

  // Consume the backup code
  const remaining = codes.filter((_, i) => i !== idx);
  await User.updateOne({ _id: userId }, { $set: { totpBackupCodes: remaining } });
  return true;
}

/** Disable 2FA for a user (requires current password + valid TOTP token from caller). */
export async function disableTotp(userId: string): Promise<void> {
  await connectDB();
  await User.updateOne(
    { _id: userId },
    { $set: { totpEnabled: false, totpSecret: null, totpBackupCodes: null } }
  );
}
