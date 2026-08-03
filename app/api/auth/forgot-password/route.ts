import { requestPasswordReset } from "@/lib/services/user.service";
import { getSiteUrl } from "@/lib/seo/site";
import { sendEmail } from "@/lib/email/mailer";
import { passwordResetTemplate } from "@/lib/email/templates";
import { successResponse, serverErrorResponse } from "@/lib/utils/apiResponse";
import { z } from "zod";

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
    const user = await requestPasswordReset(email);

    if (user) {
      const resetUrl = `${getSiteUrl()}/reset-password?token=${user.token}`;
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
