import { prisma } from "./db";
import { AuditAction } from "@prisma/client";

export async function logAudit({
  userId,
  action,
  entityType,
  entityId,
  details,
  beforeState,
  afterState,
  ipAddress,
  userAgent,
}: {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId && userId !== "anonymous" ? userId : null,
        action,
        entityType,
        entityId,
        details,
        beforeState: beforeState ? (beforeState as any) : undefined,
        afterState: afterState ? (afterState as any) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[AUDIT LOG ERROR] Failed to record audit log:", err);
  }
}
