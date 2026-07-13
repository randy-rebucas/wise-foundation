import "server-only";

import nodemailer from "nodemailer";
import logger from "@/lib/logger";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!_transporter) {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
      throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be set");
    }
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE?.trim() === "true" || port === 465,
      auth: { user, pass },
    });
  }
  return _transporter;
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

  try {
    await getTransporter().sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (error) {
    logger.error({ err: error, to: opts.to, subject: opts.subject }, "Failed to send email");
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Email send failed: ${message}`);
  }
}
