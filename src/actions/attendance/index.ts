"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission, canAccessClinic } from "@/lib/auth/permissions";
import { logAttendanceSchema } from "@/lib/validations/attendance";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

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

  await db.attendanceLog.create({
    data: {
      clinicId: parsed.data.clinicId,
      clientId: parsed.data.clientId,
      guardianName: parsed.data.guardianName,
      guardianRelation: parsed.data.guardianRelation || null,
      primaryTherapistId: parsed.data.primaryTherapistId || null,
      loggedById: session.user.id,
    },
  });

  revalidatePath("/attendance");
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
      primaryTherapist: { select: { id: true, firstName: true, lastName: true } },
      loggedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { loggedAt: "desc" },
  });

  return { data: logs };
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
