/** Minimal inline-styled email templates. No external CSS framework needed. */

const base = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr><td style="padding:32px 40px">
          ${content}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

const btn = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:14px;font-weight:600;margin:24px 0">${label}</a>`;

export function emailVerificationTemplate(opts: {
  name: string;
  verifyUrl: string;
  appName: string;
}): { subject: string; html: string } {
  return {
    subject: `Verify your ${opts.appName} account`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">Welcome, ${opts.name}!</h2>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6">
        Please verify your email address to activate your account. This link expires in 24 hours.
      </p>
      ${btn(opts.verifyUrl, "Verify email")}
      <p style="margin:16px 0 0;color:#a1a1aa;font-size:13px">
        If you didn't create an account, you can safely ignore this email.
      </p>
    `),
  };
}

export function orderConfirmationTemplate(opts: {
  name: string;
  orderNumber: string;
  total: number;
  trackUrl: string;
  appName: string;
}): { subject: string; html: string } {
  const totalFormatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(opts.total);

  return {
    subject: `Order confirmed — #${opts.orderNumber}`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">Thanks for your order, ${opts.name}!</h2>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6">
        We've received your order <strong>#${opts.orderNumber}</strong> for <strong>${totalFormatted}</strong>.
        We'll notify you when it ships.
      </p>
      ${btn(opts.trackUrl, "Track order")}
      <p style="margin:16px 0 0;color:#a1a1aa;font-size:13px">
        Questions? Reply to this email and our team will help.
      </p>
    `),
  };
}

export function passwordResetTemplate(opts: {
  name: string;
  resetUrl: string;
  appName: string;
}): { subject: string; html: string } {
  return {
    subject: `Reset your ${opts.appName} password`,
    html: base(`
      <h2 style="margin:0 0 8px;font-size:22px;color:#18181b">Password reset</h2>
      <p style="margin:0 0 16px;color:#52525b;font-size:15px;line-height:1.6">
        Hi ${opts.name}, we received a request to reset your password. Click below to choose a new one.
        This link expires in 1 hour.
      </p>
      ${btn(opts.resetUrl, "Reset password")}
      <p style="margin:16px 0 0;color:#a1a1aa;font-size:13px">
        If you didn't request this, you can safely ignore this email.
      </p>
    `),
  };
}
