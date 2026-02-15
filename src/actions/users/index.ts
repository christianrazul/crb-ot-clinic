"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user";
import { UserRole } from "@prisma/client";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export async function getUsers() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_users")) {
    return { error: "Unauthorized" };
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      primaryClinicId: true,
      isActive: true,
      createdAt: true,
      primaryClinic: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { data: users };
}

export async function getClinics() {
  const clinics = await db.clinic.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  return clinics;
}

export async function createUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_users")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
    primaryClinicId: formData.get("primaryClinicId") || null,
  };

  const parsed = createUserSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existingUser = await db.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existingUser) {
    return { error: "A user with this email already exists" };
  }

  if (parsed.data.role !== UserRole.owner && !parsed.data.primaryClinicId) {
    return { error: "Non-owner users must be assigned to a clinic" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await db.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      primaryClinicId: parsed.data.role === UserRole.owner ? null : parsed.data.primaryClinicId,
    },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function updateUser(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_users")) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    id: formData.get("id"),
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
    primaryClinicId: formData.get("primaryClinicId") || null,
    password: formData.get("password") || "",
  };

  const parsed = updateUserSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const user = await db.user.findUnique({
    where: { id: parsed.data.id },
  });

  if (!user) {
    return { error: "User not found" };
  }

  if (parsed.data.email && parsed.data.email !== user.email) {
    const existingUser = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existingUser) {
      return { error: "A user with this email already exists" };
    }
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.email) updateData.email = parsed.data.email;
  if (parsed.data.firstName) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName) updateData.lastName = parsed.data.lastName;
  if (parsed.data.role) updateData.role = parsed.data.role;
  if (parsed.data.primaryClinicId !== undefined) {
    updateData.primaryClinicId = parsed.data.role === UserRole.owner ? null : parsed.data.primaryClinicId;
  }
  if (parsed.data.password && parsed.data.password.length >= 8) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  await db.user.update({
    where: { id: parsed.data.id },
    data: updateData,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function toggleUserStatus(userId: string): Promise<ActionState> {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "manage_users")) {
    return { error: "Unauthorized" };
  }

  if (userId === session.user.id) {
    return { error: "You cannot deactivate your own account" };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { error: "User not found" };
  }

  await db.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/admin/users");
  return { success: true };
}
