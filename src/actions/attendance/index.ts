"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission, canAccessClinic } from "@/lib/auth/permissions";
import { logAttendanceSchema } from "@/lib/validations/attendance";
import { createAuditLog } from "@/lib/audit";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { PaymentMethod, PaymentStatus, PaymentSource, CreditType, UserRole, AttendancePaymentStatus } from "@prisma/client";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

const ATTENDANCE_NOTE_PREFIX = "[attendance-log:";

async function hasSessionLinkedPaidPayment(
  clinicId: string,
  clientId: string,
  date: Date
): Promise<boolean> {
  const linkedPaidSession = await db.paymentSession.findFirst({
    where: {
      payment: {
        status: PaymentStatus.completed,
        clinicId,
      },
      session: {
        clinicId,
        clientId,
        scheduledDate: {
          gte: startOfDay(date),
          lte: endOfDay(date),
        },
      },
    },
    select: { id: true },
  });

  return !!linkedPaidSession;
}

async function resolveAttendanceRate(
  clinicId: string,
  therapistRole: UserRole | null
): Promise<number> {
  if (!therapistRole) {
    return 0;
  }

  const now = new Date();
  const rate = await db.sessionRate.findFirst({
    where: {
      clinicId,
      therapistType: therapistRole,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return Number(rate?.ratePerSession || 0);
}

export async function logAttendance(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_attendance")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    clinicId: formData.get("clinicId"),
    clientId: formData.get("clientId"),
    guardianName: formData.get("guardianName"),
    guardianRelation: formData.get("guardianRelation") || undefined,
    primaryTherapistId: formData.get("primaryTherapistId") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = logAttendanceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, parsed.data.clinicId)
  ) {
    return { error: "You can only log attendance for your assigned clinic" };
  }

  const attendanceLog = await db.attendanceLog.create({
    data: {
      clinicId: parsed.data.clinicId,
      clientId: parsed.data.clientId,
      guardianName: parsed.data.guardianName,
      guardianRelation: parsed.data.guardianRelation || null,
      primaryTherapistId: parsed.data.primaryTherapistId || null,
      loggedById: session.user.id,
      paymentStatus: AttendancePaymentStatus.UNPAID,
    },
  });

  const hasAdvancedPayment = await hasSessionLinkedPaidPayment(
    attendanceLog.clinicId,
    attendanceLog.clientId,
    attendanceLog.loggedAt
  );

  if (hasAdvancedPayment) {
    await db.attendanceLog.update({
      where: { id: attendanceLog.id },
      data: {
        paymentStatus: AttendancePaymentStatus.PAID,
      },
    });
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  return { success: true };
}

export type DateFilter = "today" | "week" | "month" | "all";

export async function getAttendanceLogs(clinicId?: string, dateFilter: DateFilter = "today") {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_attendance")) {
    return { error: "Unauthorized" };
  }

  const now = new Date();
  let dateRange: { gte?: Date; lte?: Date } | undefined;

  switch (dateFilter) {
    case "today":
      dateRange = {
        gte: startOfDay(now),
        lte: endOfDay(now),
      };
      break;
    case "week":
      dateRange = {
        gte: startOfWeek(now, { weekStartsOn: 1 }),
        lte: endOfWeek(now, { weekStartsOn: 1 }),
      };
      break;
    case "month":
      dateRange = {
        gte: startOfMonth(now),
        lte: endOfMonth(now),
      };
      break;
    case "all":
      dateRange = undefined;
      break;
  }

  const logs = await db.attendanceLog.findMany({
    where: {
      ...(dateRange && { loggedAt: dateRange }),
      ...(clinicId && { clinicId }),
      ...(session.user.primaryClinicId && !clinicId && {
        clinicId: session.user.primaryClinicId,
      }),
    },
    include: {
      clinic: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      primaryTherapist: { select: { id: true, firstName: true, lastName: true, role: true } },
      loggedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { loggedAt: "desc" },
  });

  return { data: logs };
}

export async function markAttendanceAsPaid(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "collect_payments")) {
    return { error: "Unauthorized" };
  }

  const attendanceLogId = (formData.get("attendanceLogId") as string | null)?.trim();
  const paymentMethodInput = (formData.get("paymentMethod") as string | null) || "cash";

  if (!attendanceLogId) {
    return { error: "Attendance log is required" };
  }

  const paymentMethod: PaymentMethod =
    paymentMethodInput === "cash" ||
    paymentMethodInput === "gcash" ||
    paymentMethodInput === "bank_transfer" ||
    paymentMethodInput === "none"
      ? paymentMethodInput
      : "cash";

  const attendanceLog = await db.attendanceLog.findUnique({
    where: { id: attendanceLogId },
    include: {
      primaryTherapist: {
        select: {
          role: true,
        },
      },
      client: {
        select: {
          primaryTherapist: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!attendanceLog) {
    return { error: "Attendance log not found" };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, attendanceLog.clinicId)
  ) {
    return { error: "You can only record payments for your assigned clinic" };
  }

  if (attendanceLog.paymentStatus === AttendancePaymentStatus.PAID) {
    return { success: true, data: { paymentStatus: "PAID" } };
  }

  const therapistRole = attendanceLog.primaryTherapist?.role || attendanceLog.client.primaryTherapist?.role || null;
  const amount = await resolveAttendanceRate(attendanceLog.clinicId, therapistRole);

  if (amount <= 0) {
    return { error: "No active session rate found for this attendance record" };
  }

  const payment = await db.$transaction(async (tx) => {
    const createdPayment = await tx.payment.create({
      data: {
        clinicId: attendanceLog.clinicId,
        clientId: attendanceLog.clientId,
        paymentType: "per_session",
        amount,
        paymentMethod,
        paymentSource: PaymentSource.client,
        creditType: CreditType.regular,
        sessionsPaid: 1,
        recordedById: session.user.id,
        status: PaymentStatus.completed,
        notes: `${ATTENDANCE_NOTE_PREFIX}${attendanceLog.id}] Attendance payment`,
      },
    });

    await tx.attendanceLog.update({
      where: { id: attendanceLog.id },
      data: {
        paymentStatus: AttendancePaymentStatus.PAID,
      },
    });

    return createdPayment;
  });

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email!,
    userRole: session.user.role,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    newValues: {
      attendanceLogId,
      amount,
      paymentMethod,
      paymentSource: PaymentSource.client,
      creditType: CreditType.regular,
    },
    description: `Recorded payment from attendance log`,
    clinicId: attendanceLog.clinicId,
  });

  revalidatePath("/attendance");
  revalidatePath("/payments");
  revalidatePath("/dashboard");

  return { success: true, data: { paymentStatus: "PAID" } };
}

export async function getExpectedIncomeToday(clinicId?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "view_financial_reports")) {
    return { error: "Unauthorized" };
  }

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const effectiveClinicId = clinicId || session.user.primaryClinicId;

  const logs = await db.attendanceLog.findMany({
    where: {
      loggedAt: {
        gte: todayStart,
        lte: todayEnd,
      },
      paymentStatus: AttendancePaymentStatus.UNPAID,
      ...(effectiveClinicId && { clinicId: effectiveClinicId }),
    },
    include: {
      primaryTherapist: {
        select: {
          role: true,
        },
      },
      client: {
        select: {
          primaryTherapist: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (logs.length === 0) {
    return { data: 0 };
  }

  const rateCache = new Map<string, number>();
  let totalExpectedIncome = 0;

  for (const log of logs) {
    const therapistRole = log.primaryTherapist?.role || log.client.primaryTherapist?.role || null;
    const cacheKey = `${log.clinicId}:${therapistRole || "unknown"}`;

    if (!rateCache.has(cacheKey)) {
      const rate = await resolveAttendanceRate(log.clinicId, therapistRole);
      rateCache.set(cacheKey, rate);
    }

    totalExpectedIncome += rateCache.get(cacheKey) || 0;
  }

  return { data: totalExpectedIncome };
}

export async function getClientsForAttendance(clinicId?: string) {
  const session = await auth();
  if (!session?.user) {
    return [];
  }

  const clients = await db.client.findMany({
    where: {
      status: "active",
      ...(clinicId && { mainClinicId: clinicId }),
      ...(session.user.primaryClinicId && !clinicId && {
        mainClinicId: session.user.primaryClinicId,
      }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      mainClinicId: true,
      guardianName: true,
      guardianRelation: true,
      primaryTherapistId: true,
      primaryTherapist: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return clients;
}
