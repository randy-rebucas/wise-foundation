import "server-only";

import * as Sentry from "@sentry/nextjs";
import logger from "@/lib/logger";
import { writeAuditLog } from "@/lib/services/audit.service";

export type SecurityEventType =
  | "account.locked"
  | "login.failed_spike"
  | "suspicious.admin_activity";

export type SecurityEvent = {
  type: SecurityEventType;
  userId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Record a security event: structured log + Sentry breadcrumb + audit log.
 * Fire-and-forget — never throws so callers are not disrupted.
 */
export async function captureSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    logger.warn({ securityEvent: event }, `[security] ${event.type}`);

    // Sentry event for ops alerting
    Sentry.withScope((scope) => {
      scope.setTag("security_event", event.type);
      if (event.userId) scope.setUser({ id: event.userId, email: event.email });
      scope.setExtras(event.metadata ?? {});
      Sentry.captureMessage(`Security event: ${event.type}`, "warning");
    });

    // Persist to audit log when we have a userId
    if (event.userId) {
      await writeAuditLog({
        action: "user.locked",
        actor: { id: event.userId, name: event.email },
        targetId: event.userId,
        targetType: "User",
        metadata: { securityEvent: event.type, ...event.metadata },
      });
    }
  } catch {
    // Never propagate — security logging must not break the auth flow
  }
}
