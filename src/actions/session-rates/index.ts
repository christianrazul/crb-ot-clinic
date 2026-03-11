"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { hasPermission, therapistRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export type StaffSessionRateRow = {
  id: string;
  therapistType: UserRole;
  ratePerSession: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

const upsertStaffRateSchema = z.object({
  clinicId: z.string().min(1),
  therapistType: z
    .nativeEnum(UserRole)
    .refine((role) => therapistRoles.includes(role), "Invalid therapist role"),
  ratePerSession: z.number().positive("Rate must be a positive number"),
});

export async function getStaffSessionRates(clinicId?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_rates")) {
    return { error: "Unauthorized" };
  }

  const effectiveClinicId = clinicId || session.user.primaryClinicId;
  if (!effectiveClinicId) {
    return { error: "Clinic is required" };
  }

  const now = new Date();

  const rates = await db.sessionRate.findMany({
    where: {
      clinicId: effectiveClinicId,
      therapistType: { in: therapistRoles },
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const rateByRole = new Map<UserRole, StaffSessionRateRow>();
  for (const rate of rates) {
    if (!rateByRole.has(rate.therapistType)) {
      rateByRole.set(rate.therapistType, {
        id: rate.id,
        therapistType: rate.therapistType,
        ratePerSession: Number(rate.ratePerSession),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      });
    }
  }

  return { data: rateByRole };
}

export async function upsertAllStaffSessionRates(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_rates")) {
    return { error: "Unauthorized" };
  }

  const clinicId = formData.get("clinicId") as string;
  if (!clinicId) {
    return { error: "Clinic is required" };
  }

  const updates: { therapistType: UserRole; ratePerSession: number }[] = [];

  for (const therapistRole of therapistRoles) {
    const raw = formData.get(`staff_rate_${therapistRole}`);
    if (raw === null || raw === "") continue;

    const parsed = upsertStaffRateSchema.safeParse({
      clinicId,
      therapistType: therapistRole,
      ratePerSession: parseFloat(raw as string),
    });

    if (!parsed.success) {
      return { error: `${therapistRole}: ${parsed.error.issues[0].message}` };
    }

    updates.push({
      therapistType: parsed.data.therapistType,
      ratePerSession: parsed.data.ratePerSession,
    });
  }

  if (updates.length === 0) {
    return { error: "No staff rates provided" };
  }

  const currentRates = await db.sessionRate.findMany({
    where: {
      clinicId,
      therapistType: { in: updates.map((update) => update.therapistType) },
      effectiveTo: null,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const currentRateByRole = new Map<UserRole, number>();
  for (const rate of currentRates) {
    if (!currentRateByRole.has(rate.therapistType)) {
      currentRateByRole.set(rate.therapistType, Number(rate.ratePerSession));
    }
  }

  const changedUpdates = updates.filter(
    ({ therapistType, ratePerSession }) => currentRateByRole.get(therapistType) !== ratePerSession
  );

  if (changedUpdates.length === 0) {
    return { success: true };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    for (const { therapistType, ratePerSession } of changedUpdates) {
      await tx.sessionRate.updateMany({
        where: { clinicId, therapistType, effectiveTo: null },
        data: { effectiveTo: now },
      });

      await tx.sessionRate.create({
        data: {
          clinicId,
          therapistType,
          ratePerSession,
          effectiveFrom: now,
          effectiveTo: null,
        },
      });
    }
  });

  revalidatePath("/rates");
  revalidatePath("/dashboard");
  revalidatePath("/attendance");
  revalidatePath("/payments");
  revalidatePath("/reports/therapist-payouts");

  return { success: true };
}