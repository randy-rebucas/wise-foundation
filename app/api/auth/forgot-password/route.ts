import { nanoid } from "nanoid";
import { connectDB } from "@/lib/db/connect";
import { User } from "@/lib/db/models/User";
import { getSiteUrl } from "@/lib/seo/site";
import { sendEmail } from "@/lib/email/mailer";
import { passwordResetTemplate } from "@/lib/email/templates";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { z } from "zod";

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

const schema = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      // Return success anyway to avoid email enumeration
      return successResponse(null, "If that email exists, a reset link has been sent.");
    }

    const email = parsed.data.email.toLowerCase().trim();
    await connectDB();

    const user = await User.findOne({ email, deletedAt: null, role: { $ne: "CUSTOMER" } }).lean();

    if (user) {
      const token = nanoid(40);
      const expiry = new Date(Date.now() + RESET_EXPIRY_MS);

      await User.updateOne(
        { _id: user._id },
        { $set: { passwordResetToken: token, passwordResetExpiry: expiry } }
      );

      const resetUrl = `${getSiteUrl()}/reset-password?token=${token}`;
      const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Wise";
      const { subject, html } = passwordResetTemplate({
        name: user.name,
        resetUrl,
        appName,
      });

      await sendEmail({ to: email, subject, html });
    }

    return successResponse(null, "If that email exists, a reset link has been sent.");
  } catch {
    return serverErrorResponse();
  }
}
