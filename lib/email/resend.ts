import "server-only";

import { Resend } from "resend";
import logger from "@/lib/logger";

let _client: Resend | null = null;

function getClient(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _client = new Resend(key);
  }
  return _client;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
};

export async function sendEmail(opts: SendEmailOptions): Promise<void> {
  const from =
    opts.from ??
    process.env.EMAIL_FROM ??
    `Glowish <noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace(/https?:\/\//, "") ?? "glowish.app"}>`;

  const { error } = await getClient().emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    logger.error({ err: error, to: opts.to, subject: opts.subject }, "Failed to send email");
    throw new Error(`Email send failed: ${error.message}`);
  }
}
