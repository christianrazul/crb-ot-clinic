import { db } from "@/lib/db";
import { AuditAction, UserRole, Prisma } from "@prisma/client";
import { headers } from "next/headers";

export interface AuditLogParams {
  userId: string | null;
  userEmail: string;
  userRole: UserRole;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  description?: string;
  clinicId?: string | null;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  let ipAddress: string | null = null;

  try {
    const headersList = await headers();
    ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0] ||
      headersList.get("x-real-ip") ||
      null;
  } catch {
    // Headers not available in some contexts
  }

  await db.auditLog.create({
    data: {
      userId: params.userId,
      userEmail: params.userEmail,
      userRole: params.userRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValues: params.oldValues as Prisma.InputJsonValue ?? Prisma.JsonNull,
      newValues: params.newValues as Prisma.InputJsonValue ?? Prisma.JsonNull,
      description: params.description,
      ipAddress,
      clinicId: params.clinicId,
    },
  });
}

export function sanitizeForAudit<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[] = ["passwordHash", "password"]
): Partial<T> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key)) {
      result[key] = "[REDACTED]";
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (typeof value === "object" && value !== null) {
      result[key] = JSON.stringify(value);
    } else {
      result[key] = value;
    }
  }

  return result as Partial<T>;
}

export async function getAuditLogs(options: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  action?: AuditAction;
  clinicId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const {
    entityType,
    entityId,
    userId,
    action,
    clinicId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  const logs = await db.auditLog.findMany({
    where: {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(action && { action }),
      ...(clinicId && { clinicId }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      clinic: {
        select: {
          name: true,
          code: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  const total = await db.auditLog.count({
    where: {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(userId && { userId }),
      ...(action && { action }),
      ...(clinicId && { clinicId }),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate && { gte: startDate }),
              ...(endDate && { lte: endDate }),
            },
          }
        : {}),
    },
  });

  return { logs, total };
}
