"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission, canAccessClinic, isTherapist } from "@/lib/auth/permissions";
import { createSessionSchema, createMultipleSessionsSchema } from "@/lib/validations/session";
// import { createAuditLog } from "@/lib/audit";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { SessionStatus, PaymentStatus } from "@prisma/client";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export type TherapistDailyReport = {
  therapistRate: number;
  expectedSessionCount: number;
  actualSessionCount: number;
  expectedIncome: number;
  actualIncome: number;
  sessions: {
    id: string;
    patientName: string;
    scheduledTime: string;
  }[];
};

function buildFallbackClient(clientName?: string | null) {
  return {
    id: "",
    firstName: clientName || "New client",
    lastName: "",
    diagnosis: null,
    guardianName: "",
    guardianPhone: null,
  };
}

type NormalizedClient = {
  id: string;
  firstName: string;
  lastName: string;
  diagnosis?: string | null;
  guardianName?: string;
  guardianPhone?: string | null;
};

function normalizeSessionClient<T extends { client: NormalizedClient | null; clientName?: string | null }>(
  session: T
): Omit<T, "client"> & { client: NormalizedClient } {
  return {
    ...session,
    client: session.client ?? buildFallbackClient(session.clientName),
  };
}

export async function getSessions(date: Date, clinicId?: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const isTherapistUser = isTherapist(session.user.role);

  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  const sessions = await db.session.findMany({
    where: {
      scheduledDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      ...(clinicId && { clinicId }),
      ...(session.user.primaryClinicId && !clinicId && {
        clinicId: session.user.primaryClinicId,
      }),
      ...(isTherapistUser && { therapistId: session.user.id }),
    },
    include: {
      clinic: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      therapist: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { scheduledTime: "asc" },
  });

  return { data: sessions.map(normalizeSessionClient) };
}

export async function getTherapistDailyReport(clinicId?: string): Promise<ActionState & { data?: TherapistDailyReport }> {
  const session = await auth();
  if (!session?.user || !isTherapist(session.user.role)) {
    return { error: "Unauthorized" };
  }

  const dayStart = startOfDay(new Date());
  const dayEnd = endOfDay(new Date());

  const effectiveClinicId = clinicId || session.user.primaryClinicId || undefined;

  const sessions = await db.session.findMany({
    where: {
      therapistId: session.user.id,
      scheduledDate: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        not: SessionStatus.cancelled,
      },
      ...(effectiveClinicId && { clinicId: effectiveClinicId }),
    },
    select: {
      id: true,
      clientName: true,
      scheduledTime: true,
      verifiedAt: true,
      clinicId: true,
      verifiedBy: {
        select: {
          role: true,
        },
      },
      client: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { scheduledTime: "asc" },
  });

  const rateClinicId = effectiveClinicId || sessions[0]?.clinicId;
  let therapistRate = 0;

  if (rateClinicId) {
    const now = new Date();
    const rate = await db.sessionRate.findFirst({
      where: {
        clinicId: rateClinicId,
        therapistType: session.user.role,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    therapistRate = rate ? Number(rate.ratePerSession) : 0;
  }

  const expectedSessionCount = sessions.length;
  const actualSessionCount = sessions.filter(
    (sessionRow) => Boolean(sessionRow.verifiedAt) && sessionRow.verifiedBy?.role === "secretary"
  ).length;
  const expectedIncome = therapistRate * expectedSessionCount;
  const actualIncome = therapistRate * actualSessionCount;

  return {
    data: {
      therapistRate,
      expectedSessionCount,
      actualSessionCount,
      expectedIncome,
      actualIncome,
      sessions: sessions.map((sessionRow) => ({
        id: sessionRow.id,
        patientName: sessionRow.client
          ? `${sessionRow.client.firstName} ${sessionRow.client.lastName}`
          : sessionRow.clientName || "New client",
        scheduledTime: sessionRow.scheduledTime,
      })),
    },
  };
}

export async function getSessionsInRange(startDate: Date, endDate: Date, clinicId?: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const isTherapistUser = isTherapist(session.user.role);

  const sessions = await db.session.findMany({
    where: {
      scheduledDate: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
      ...(clinicId && { clinicId }),
      ...(session.user.primaryClinicId && !clinicId && {
        clinicId: session.user.primaryClinicId,
      }),
      ...(isTherapistUser && { therapistId: session.user.id }),
    },
    include: {
      clinic: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      therapist: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { scheduledTime: "asc" }],
  });

  return { data: sessions.map(normalizeSessionClient) };
}

export async function getSession(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const sessionData = await db.session.findUnique({
    where: { id },
    include: {
      clinic: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true, diagnosis: true, guardianName: true, guardianPhone: true } },
      therapist: { select: { id: true, firstName: true, lastName: true, role: true } },
      startedBy: { select: { id: true, firstName: true, lastName: true } },
      verifiedBy: { select: { id: true, firstName: true, lastName: true } },
      cancelledBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!sessionData) {
    return { error: "Session not found" };
  }

  const isTherapistUser = isTherapist(session.user.role);
  if (isTherapistUser && sessionData.therapistId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, sessionData.clinicId)
  ) {
    return { error: "Unauthorized" };
  }

  return { data: normalizeSessionClient(sessionData) };
}

export async function createSession(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_sessions")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    clinicId: formData.get("clinicId"),
    clientId: formData.get("clientId"),
    clientName: (formData.get("clientName") as string) || undefined,
    therapistId: formData.get("therapistId"),
    sessionType: (formData.get("sessionType") as string) || undefined,
    scheduledDate: formData.get("scheduledDate"),
    scheduledTime: formData.get("scheduledTime"),
    durationMinutes: parseInt(formData.get("durationMinutes") as string) || 60,
  };

  const parsed = createSessionSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, parsed.data.clinicId)
  ) {
    return { error: "You can only create sessions for your assigned clinic" };
  }

  const scheduledDate = parseISO(parsed.data.scheduledDate);

  const existingSession = await db.session.findFirst({
    where: {
      therapistId: parsed.data.therapistId,
      scheduledDate,
      scheduledTime: parsed.data.scheduledTime,
      status: { in: ["scheduled", "completed"] },
    },
  });

  if (existingSession) {
    return { error: "Therapist already has a session at this time" };
  }

  const includePayment = formData.get("includePayment") === "true";
  const advancePaymentId = formData.get("advancePaymentId") as string;
  const selectedClientId = parsed.data.clientId ?? null;

  const result = await db.$transaction(async (tx) => {
    const newSession = await tx.session.create({
      data: {
        clinicId: parsed.data.clinicId,
        clientId: selectedClientId,
        clientName: parsed.data.clientName,
        therapistId: parsed.data.therapistId,
        sessionType: parsed.data.sessionType,
        scheduledDate,
        scheduledTime: parsed.data.scheduledTime,
        durationMinutes: parsed.data.durationMinutes,
      },
    });

    if (includePayment && hasPermission(session.user.role, "collect_payments")) {
      if (!selectedClientId) {
        throw new Error("Cannot attach advance payment when using an unregistered client name");
      }

      if (!advancePaymentId) {
        throw new Error("Schedule-time pay-now has been removed. Record payment after attendance.");
      }

      if (advancePaymentId) {
        const existingPayment = await tx.payment.findUnique({
          where: { id: advancePaymentId },
          include: {
            _count: { select: { paymentSessions: true } },
          },
        });

        if (existingPayment) {
          if (existingPayment.clientId !== selectedClientId) {
            throw new Error("Advance payment does not belong to selected client");
          }

          if (existingPayment.clinicId !== parsed.data.clinicId) {
            throw new Error("Advance payment does not belong to selected clinic");
          }

          if (existingPayment.status !== PaymentStatus.completed) {
            throw new Error("Advance payment is not in a usable state");
          }

          const sessionsRemaining =
            existingPayment.sessionsPaid - existingPayment._count.paymentSessions;
          if (sessionsRemaining > 0) {
            const perSessionAmount =
              Number(existingPayment.amount) / existingPayment.sessionsPaid;
            await tx.paymentSession.create({
              data: {
                paymentId: advancePaymentId,
                sessionId: newSession.id,
                amount: perSessionAmount,
              },
            });
          } else {
            throw new Error("No remaining sessions on selected advance payment");
          }
        } else {
          throw new Error("Selected advance payment was not found");
        }
      }
    }

    return newSession;
  });

  revalidatePath("/schedule");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return { success: true, data: result };
}

export async function createMultipleSessions(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_sessions")) {
    return { error: "Unauthorized" };
  }

  const selectedDatesRaw = formData.get("selectedDates") as string;
  const selectedDates = selectedDatesRaw ? JSON.parse(selectedDatesRaw) : [];

  const rawData = {
    clinicId: formData.get("clinicId"),
    clientId: formData.get("clientId"),
    clientName: (formData.get("clientName") as string) || undefined,
    therapistId: formData.get("therapistId"),
    sessionType: (formData.get("sessionType") as string) || undefined,
    scheduledTime: formData.get("scheduledTime"),
    selectedDates,
    durationMinutes: parseInt(formData.get("durationMinutes") as string) || 60,
  };

  const parsed = createMultipleSessionsSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, parsed.data.clinicId)
  ) {
    return { error: "You can only create sessions for your assigned clinic" };
  }

  const sessionsToCreate: Array<{
    clinicId: string;
    clientId: string | null;
    clientName?: string;
    therapistId: string;
    sessionType: "regular" | "ot_evaluation" | "make_up";
    scheduledDate: Date;
    scheduledTime: string;
    durationMinutes: number;
  }> = [];

  const skippedDates: string[] = [];

  for (const dateStr of parsed.data.selectedDates) {
    const scheduledDate = parseISO(dateStr);

    const existingSession = await db.session.findFirst({
      where: {
        therapistId: parsed.data.therapistId,
        scheduledDate,
        scheduledTime: parsed.data.scheduledTime,
        status: { in: ["scheduled", "completed"] },
      },
    });

    if (existingSession) {
      skippedDates.push(dateStr);
    } else {
      sessionsToCreate.push({
        clinicId: parsed.data.clinicId,
        clientId: parsed.data.clientId ?? null,
        clientName: parsed.data.clientName,
        therapistId: parsed.data.therapistId,
        sessionType: parsed.data.sessionType,
        scheduledDate,
        scheduledTime: parsed.data.scheduledTime,
        durationMinutes: parsed.data.durationMinutes,
      });
    }
  }

  if (sessionsToCreate.length === 0) {
    return { error: "No sessions could be created - all selected slots are already booked" };
  }

  const includePayment = formData.get("includePayment") === "true";

  if (includePayment && hasPermission(session.user.role, "collect_payments")) {
    return {
      error: "Schedule-time pay-now has been removed for bulk scheduling. Record payments after attendance.",
    };
  }

  const result = await db.$transaction(async (tx) => {
    const createdSessions = await Promise.all(
      sessionsToCreate.map((sessionData) =>
        tx.session.create({ data: sessionData })
      )
    );

    return { count: createdSessions.length, skippedDates };
  });

  revalidatePath("/schedule");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
  return { success: true, data: result };
}

export async function cancelSession(
  sessionId: string,
  reason: string
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const existingSession = await db.session.findUnique({
    where: { id: sessionId },
  });

  if (!existingSession) {
    return { error: "Session not found" };
  }

  const isTherapistUser = isTherapist(session.user.role);
  const isOwnSession = existingSession.therapistId === session.user.id;
  const canManage = hasPermission(session.user.role, "manage_sessions");

  if (isTherapistUser && !isOwnSession) {
    return { error: "You can only cancel your own sessions" };
  }

  if (!isTherapistUser && !canManage) {
    return { error: "Unauthorized" };
  }

  if (existingSession.status !== SessionStatus.scheduled) {
    return { error: "Only scheduled sessions can be cancelled" };
  }

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.cancelled,
      cancelledAt: new Date(),
      cancelledById: session.user.id,
      cancellationReason: reason,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/my-schedule");
  revalidatePath("/sessions");
  return { success: true };
}

export async function getClientsForScheduling(clinicId?: string) {
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
      primaryTherapistId: true,
    },
    orderBy: { lastName: "asc" },
  });

  return clients;
}

export async function startSession(sessionId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const existingSession = await db.session.findUnique({
    where: { id: sessionId },
  });

  if (!existingSession) {
    return { error: "Session not found" };
  }

  const isTherapistUser = isTherapist(session.user.role);
  const isOwnSession = existingSession.therapistId === session.user.id;
  const canManage = hasPermission(session.user.role, "manage_sessions");

  if (isTherapistUser && !isOwnSession) {
    return { error: "You can only start your own sessions" };
  }

  if (!isTherapistUser && !canManage) {
    return { error: "Unauthorized" };
  }

  if (existingSession.status !== SessionStatus.scheduled) {
    return { error: "Only scheduled sessions can be started" };
  }

  await db.session.update({
    where: { id: sessionId },
    data: {
      status: SessionStatus.in_progress,
      startedAt: new Date(),
      startedById: session.user.id,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/my-schedule");
  revalidatePath("/sessions");
  revalidatePath("/confirmations");
  return { success: true };
}

export async function confirmSessionStart(sessionId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "verify_sessions")) {
    return { error: "Unauthorized" };
  }

  const existingSession = await db.session.findUnique({
    where: { id: sessionId },
  });

  if (!existingSession) {
    return { error: "Session not found" };
  }

  if (existingSession.status !== SessionStatus.in_progress) {
    return { error: "Session must be in progress to confirm" };
  }

  if (!existingSession.startedAt) {
    return { error: "Session has not been started" };
  }

  if (existingSession.verifiedAt) {
    return { error: "Session has already been confirmed" };
  }

  await db.session.update({
    where: { id: sessionId },
    data: {
      verifiedAt: new Date(),
      verifiedById: session.user.id,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/my-schedule");
  revalidatePath("/sessions");
  revalidatePath("/confirmations");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPendingConfirmations(clinicId?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "verify_sessions")) {
    return { error: "Unauthorized" };
  }

  const sessions = await db.session.findMany({
    where: {
      status: SessionStatus.in_progress,
      startedAt: { not: null },
      verifiedAt: null,
      ...(clinicId && { clinicId }),
      ...(session.user.primaryClinicId && !clinicId && {
        clinicId: session.user.primaryClinicId,
      }),
    },
    include: {
      clinic: { select: { id: true, name: true, code: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
      therapist: { select: { id: true, firstName: true, lastName: true, role: true } },
      startedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { startedAt: "asc" },
  });

  return { data: sessions.map(normalizeSessionClient) };
}

export async function getPendingConfirmationsCount(clinicId?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "verify_sessions")) {
    return 0;
  }

  const count = await db.session.count({
    where: {
      status: SessionStatus.in_progress,
      startedAt: { not: null },
      verifiedAt: null,
      ...(clinicId && { clinicId }),
      ...(session.user.primaryClinicId && !clinicId && {
        clinicId: session.user.primaryClinicId,
      }),
    },
  });

  return count;
}
