import "server-only";

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

export async function captureSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    logger.warn({ securityEvent: event }, `[security] ${event.type}`);

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
