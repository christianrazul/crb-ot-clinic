"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { SessionType } from "@prisma/client";
import { z } from "zod";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export type ClientSessionRateRow = {
  id: string;
  sessionType: SessionType;
  ratePerSession: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

const upsertClientRateSchema = z.object({
  clinicId: z.string().min(1),
  sessionType: z.nativeEnum(SessionType),
  ratePerSession: z.number().positive("Rate must be a positive number"),
});

export async function getClientSessionRates(clinicId?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_rates")) {
    return { error: "Unauthorized" };
  }

  const effectiveClinicId = clinicId || session.user.primaryClinicId;
  if (!effectiveClinicId) {
    return { error: "Clinic is required" };
  }

  const now = new Date();

  const rates = await db.clientSessionRate.findMany({
    where: {
      clinicId: effectiveClinicId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const rateByType = new Map<SessionType, ClientSessionRateRow>();
  for (const rate of rates) {
    if (!rateByType.has(rate.sessionType)) {
      rateByType.set(rate.sessionType, {
        id: rate.id,
        sessionType: rate.sessionType,
        ratePerSession: Number(rate.ratePerSession),
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo,
      });
    }
  }

  return { data: rateByType };
}

export async function upsertAllClientSessionRates(
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

  const sessionTypes = Object.values(SessionType);
  const updates: { sessionType: SessionType; ratePerSession: number }[] = [];

  for (const sessionType of sessionTypes) {
    const raw = formData.get(`rate_${sessionType}`);
    if (raw === null || raw === "") continue;
    const parsed = upsertClientRateSchema.safeParse({
      clinicId,
      sessionType,
      ratePerSession: parseFloat(raw as string),
    });
    if (!parsed.success) {
      return { error: `${sessionType}: ${parsed.error.issues[0].message}` };
    }
    updates.push({ sessionType, ratePerSession: parsed.data.ratePerSession });
  }

  if (updates.length === 0) {
    return { error: "No rates provided" };
  }

  const currentRates = await db.clientSessionRate.findMany({
    where: {
      clinicId,
      sessionType: { in: updates.map((update) => update.sessionType) },
      effectiveTo: null,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const currentRateByType = new Map<SessionType, number>();
  for (const rate of currentRates) {
    if (!currentRateByType.has(rate.sessionType)) {
      currentRateByType.set(rate.sessionType, Number(rate.ratePerSession));
    }
  }

  const changedUpdates = updates.filter(
    ({ sessionType, ratePerSession }) => currentRateByType.get(sessionType) !== ratePerSession
  );

  if (changedUpdates.length === 0) {
    return { success: true };
  }

  const now = new Date();

  await db.$transaction(async (tx) => {
    for (const { sessionType, ratePerSession } of changedUpdates) {
      await tx.clientSessionRate.updateMany({
        where: { clinicId, sessionType, effectiveTo: null },
        data: { effectiveTo: now },
      });
      await tx.clientSessionRate.create({
        data: { clinicId, sessionType, ratePerSession, effectiveFrom: now, effectiveTo: null },
      });
    }
  });

  revalidatePath("/rates");
  revalidatePath("/dashboard");
  return { success: true };
}
