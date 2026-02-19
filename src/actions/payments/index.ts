"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission, canAccessClinic } from "@/lib/auth/permissions";
import { recordPaymentSchema } from "@/lib/validations/payment";
import { createAuditLog } from "@/lib/audit";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { CreditType, PaymentStatus, UserRole } from "@prisma/client";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export async function getPayments(
  dateFilter: "day" | "week" | "month" = "day",
  specificDate?: Date,
  clinicId?: string
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "view_payments")) {
    return { error: "Unauthorized" };
  }

  const targetDate = specificDate || new Date();
  let dateStart: Date;
  let dateEnd: Date;

  switch (dateFilter) {
    case "week":
      dateStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      dateEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
      break;
    case "month":
      dateStart = startOfMonth(targetDate);
      dateEnd = endOfMonth(targetDate);
      break;
    case "day":
    default:
      dateStart = startOfDay(targetDate);
      dateEnd = endOfDay(targetDate);
      break;
  }

  const effectiveClinicId = clinicId || session.user.primaryClinicId;

  const payments = await db.payment.findMany({
    where: {
      paymentDate: {
        gte: dateStart,
        lte: dateEnd,
      },
      ...(effectiveClinicId && { clinicId: effectiveClinicId }),
    },
    include: {
      client: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryTherapist: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      recordedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      paymentSessions: {
        include: {
          session: {
            select: {
              id: true,
              scheduledDate: true,
              therapist: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  const total = payments.reduce((sum, payment) => {
    if (payment.creditType !== CreditType.no_payment) {
      return sum + Number(payment.amount);
    }
    return sum;
  }, 0);

  return { data: { payments, total } };
}

export async function recordPayment(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "collect_payments")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    clinicId: formData.get("clinicId"),
    clientId: formData.get("clientId"),
    sessionId: formData.get("sessionId"),
    amount: parseFloat(formData.get("amount") as string) || 0,
    paymentMethod: formData.get("paymentMethod"),
    paymentSource: formData.get("paymentSource") || "client",
    creditType: formData.get("creditType") || "regular",
    sessionsPaid: parseInt(formData.get("sessionsPaid") as string) || 1,
    receiptNumber: formData.get("receiptNumber") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = recordPaymentSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, parsed.data.clinicId)
  ) {
    return { error: "You can only record payments for your assigned clinic" };
  }

  const existingSession = await db.session.findUnique({
    where: { id: parsed.data.sessionId },
  });

  if (!existingSession) {
    return { error: "Session not found" };
  }

  if (parsed.data.receiptNumber) {
    const existingReceipt = await db.payment.findUnique({
      where: { receiptNumber: parsed.data.receiptNumber },
    });
    if (existingReceipt) {
      return { error: "Receipt number already exists" };
    }
  }

  const payment = await db.$transaction(async (tx) => {
    const newPayment = await tx.payment.create({
      data: {
        clinicId: parsed.data.clinicId,
        clientId: parsed.data.clientId,
        paymentType: "per_session",
        amount: parsed.data.amount,
        paymentMethod: parsed.data.paymentMethod,
        paymentSource: parsed.data.paymentSource,
        creditType: parsed.data.creditType,
        sessionsPaid: parsed.data.sessionsPaid,
        recordedById: session.user.id,
        receiptNumber: parsed.data.receiptNumber || null,
        notes: parsed.data.notes || null,
        status: PaymentStatus.completed,
      },
    });

    const perSessionAmount = parsed.data.amount / parsed.data.sessionsPaid;

    await tx.paymentSession.create({
      data: {
        paymentId: newPayment.id,
        sessionId: parsed.data.sessionId,
        amount: perSessionAmount,
      },
    });

    return newPayment;
  });

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email!,
    userRole: session.user.role,
    action: "CREATE",
    entityType: "Payment",
    entityId: payment.id,
    newValues: {
      amount: parsed.data.amount,
      paymentMethod: parsed.data.paymentMethod,
      paymentSource: parsed.data.paymentSource,
      creditType: parsed.data.creditType,
      sessionsPaid: parsed.data.sessionsPaid,
      clientId: parsed.data.clientId,
    },
    description: `Recorded payment of ${parsed.data.amount} for ${parsed.data.sessionsPaid} session(s)`,
    clinicId: parsed.data.clinicId,
  });

  revalidatePath("/payments");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");

  return { success: true, data: payment };
}

export async function getSessionRate(clinicId: string, therapistRole: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const now = new Date();

  const rate = await db.sessionRate.findFirst({
    where: {
      clinicId,
      therapistType: therapistRole as UserRole,
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  return { data: rate ? Number(rate.ratePerSession) : null };
}

export async function getDailyRevenue(date: Date, clinicId?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "view_financial_reports")) {
    return { error: "Unauthorized" };
  }

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const effectiveClinicId = clinicId || session.user.primaryClinicId;

  const result = await db.payment.aggregate({
    where: {
      paymentDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: PaymentStatus.completed,
      creditType: { not: CreditType.no_payment },
      ...(effectiveClinicId && { clinicId: effectiveClinicId }),
    },
    _sum: {
      amount: true,
    },
  });

  return { data: Number(result._sum.amount || 0) };
}

export async function getClientAdvancePayments(clientId: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "view_payments")) {
    return { error: "Unauthorized" };
  }

  const payments = await db.payment.findMany({
    where: {
      clientId,
      creditType: CreditType.advance,
      status: PaymentStatus.completed,
    },
    include: {
      _count: {
        select: { paymentSessions: true },
      },
    },
  });

  const paymentsWithRemaining = payments
    .map((payment) => ({
      ...payment,
      sessionsUsed: payment._count.paymentSessions,
      sessionsRemaining: payment.sessionsPaid - payment._count.paymentSessions,
    }))
    .filter((payment) => payment.sessionsRemaining > 0);

  return { data: paymentsWithRemaining };
}

export async function linkSessionToAdvancePayment(
  paymentId: string,
  sessionId: string
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "collect_payments")) {
    return { error: "Unauthorized" };
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      _count: {
        select: { paymentSessions: true },
      },
    },
  });

  if (!payment) {
    return { error: "Payment not found" };
  }

  if (payment.creditType !== CreditType.advance) {
    return { error: "This is not an advance payment" };
  }

  const sessionsRemaining = payment.sessionsPaid - payment._count.paymentSessions;
  if (sessionsRemaining <= 0) {
    return { error: "No remaining sessions on this advance payment" };
  }

  const existingLink = await db.paymentSession.findFirst({
    where: { paymentId, sessionId },
  });

  if (existingLink) {
    return { error: "Session is already linked to this payment" };
  }

  const perSessionAmount = Number(payment.amount) / payment.sessionsPaid;

  await db.paymentSession.create({
    data: {
      paymentId,
      sessionId,
      amount: perSessionAmount,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email!,
    userRole: session.user.role,
    action: "UPDATE",
    entityType: "Payment",
    entityId: paymentId,
    newValues: { linkedSessionId: sessionId },
    description: `Linked session to advance payment`,
    clinicId: payment.clinicId,
  });

  revalidatePath("/payments");
  revalidatePath("/schedule");

  return { success: true };
}
