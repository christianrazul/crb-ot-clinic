"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission, canAccessClinic, therapistRoles } from "@/lib/auth/permissions";
import { createClientSchema, updateClientSchema } from "@/lib/validations/client";
import { ClientStatus } from "@prisma/client";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export async function getClients(search?: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "view_all_clients")) {
    return { error: "Unauthorized" };
  }

  const clients = await db.client.findMany({
    where: {
      ...(session.user.primaryClinicId && {
        mainClinicId: session.user.primaryClinicId,
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { guardianName: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      mainClinic: {
        select: { id: true, name: true, code: true },
      },
      primaryTherapist: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      backupTherapists: {
        include: {
          therapist: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { priority: "asc" },
      },
    },
    orderBy: { lastName: "asc" },
  });

  return { data: clients };
}

export async function getClient(id: string) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "view_all_clients")) {
    return { error: "Unauthorized" };
  }

  const client = await db.client.findUnique({
    where: { id },
    include: {
      mainClinic: {
        select: { id: true, name: true, code: true },
      },
      primaryTherapist: {
        select: { id: true, firstName: true, lastName: true, role: true },
      },
      backupTherapists: {
        include: {
          therapist: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
        orderBy: { priority: "asc" },
      },
    },
  });

  if (!client) {
    return { error: "Client not found" };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, client.mainClinicId)
  ) {
    return { error: "Unauthorized" };
  }

  return { data: client };
}

export async function getTherapists(clinicId?: string) {
  const session = await auth();
  if (!session?.user) {
    return [];
  }

  const therapists = await db.user.findMany({
    where: {
      role: { in: therapistRoles },
      isActive: true,
      ...(clinicId && { primaryClinicId: clinicId }),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      primaryClinicId: true,
    },
    orderBy: { lastName: "asc" },
  });

  return therapists;
}

export async function createClient(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_clients")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    mainClinicId: formData.get("mainClinicId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    diagnosis: formData.get("diagnosis") || undefined,
    guardianName: formData.get("guardianName"),
    guardianPhone: formData.get("guardianPhone") || undefined,
    guardianEmail: formData.get("guardianEmail") || undefined,
    guardianRelation: formData.get("guardianRelation") || undefined,
    primaryTherapistId: formData.get("primaryTherapistId") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const parsed = createClientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, parsed.data.mainClinicId)
  ) {
    return { error: "You can only create clients for your assigned clinic" };
  }

  const client = await db.client.create({
    data: {
      mainClinicId: parsed.data.mainClinicId,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      diagnosis: parsed.data.diagnosis,
      guardianName: parsed.data.guardianName,
      guardianPhone: parsed.data.guardianPhone,
      guardianEmail: parsed.data.guardianEmail || null,
      guardianRelation: parsed.data.guardianRelation,
      primaryTherapistId: parsed.data.primaryTherapistId || null,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/clients");
  return { success: true, data: { id: client.id } };
}

export async function updateClient(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_clients")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    id: formData.get("id"),
    mainClinicId: formData.get("mainClinicId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    diagnosis: formData.get("diagnosis") || undefined,
    guardianName: formData.get("guardianName"),
    guardianPhone: formData.get("guardianPhone") || undefined,
    guardianEmail: formData.get("guardianEmail") || undefined,
    guardianRelation: formData.get("guardianRelation") || undefined,
    primaryTherapistId: formData.get("primaryTherapistId") || undefined,
    status: formData.get("status") as ClientStatus,
    notes: formData.get("notes") || undefined,
  };

  const parsed = updateClientSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const client = await db.client.findUnique({
    where: { id: parsed.data.id },
  });

  if (!client) {
    return { error: "Client not found" };
  }

  if (
    session.user.primaryClinicId &&
    !canAccessClinic(session.user.role, session.user.primaryClinicId, client.mainClinicId)
  ) {
    return { error: "Unauthorized" };
  }

  await db.client.update({
    where: { id: parsed.data.id },
    data: {
      ...(parsed.data.mainClinicId && { mainClinicId: parsed.data.mainClinicId }),
      ...(parsed.data.firstName && { firstName: parsed.data.firstName }),
      ...(parsed.data.lastName && { lastName: parsed.data.lastName }),
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : undefined,
      diagnosis: parsed.data.diagnosis,
      ...(parsed.data.guardianName && { guardianName: parsed.data.guardianName }),
      guardianPhone: parsed.data.guardianPhone,
      guardianEmail: parsed.data.guardianEmail || null,
      guardianRelation: parsed.data.guardianRelation,
      primaryTherapistId: parsed.data.primaryTherapistId || null,
      ...(parsed.data.status && { status: parsed.data.status }),
      notes: parsed.data.notes,
      ...(parsed.data.status === ClientStatus.discharged && {
        dischargeDate: new Date(),
      }),
    },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${parsed.data.id}`);
  return { success: true };
}

export async function addBackupTherapist(
  clientId: string,
  therapistId: string
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_clients")) {
    return { error: "Unauthorized" };
  }

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: { backupTherapists: true },
  });

  if (!client) {
    return { error: "Client not found" };
  }

  const existingBackup = client.backupTherapists.find(
    (bt) => bt.therapistId === therapistId
  );

  if (existingBackup) {
    return { error: "Therapist is already a backup for this client" };
  }

  if (client.primaryTherapistId === therapistId) {
    return { error: "Cannot add primary therapist as backup" };
  }

  const maxPriority = client.backupTherapists.reduce(
    (max, bt) => Math.max(max, bt.priority),
    0
  );

  await db.backupTherapist.create({
    data: {
      clientId,
      therapistId,
      priority: maxPriority + 1,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

export async function removeBackupTherapist(
  clientId: string,
  therapistId: string
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_clients")) {
    return { error: "Unauthorized" };
  }

  await db.backupTherapist.deleteMany({
    where: { clientId, therapistId },
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}
