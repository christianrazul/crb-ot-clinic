"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/auth";
import { createAuditLog, sanitizeForAudit } from "@/lib/audit";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations/user";
import { AuditAction } from "@prisma/client";

export type ActionState = {
  error?: string;
  success?: boolean;
  data?: unknown;
};

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
  };

  const parsed = updateProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser) {
    return { error: "User not found" };
  }

  const emailChanged = parsed.data.email !== currentUser.email;

  if (emailChanged) {
    const existing = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return { error: "A user with this email already exists" };
    }
  }

  const updatedUser = await db.user.update({
    where: { id: session.user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userRole: session.user.role,
    action: AuditAction.UPDATE,
    entityType: "User",
    entityId: session.user.id,
    oldValues: sanitizeForAudit({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
    }),
    newValues: sanitizeForAudit({
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
    }),
    description: "User updated their own profile",
    clinicId: session.user.primaryClinicId,
  });

  revalidatePath("/account");
  return { success: true, data: { emailChanged } };
}

export async function changePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Unauthorized" };
  }

  const rawData = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = changePasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!currentUser) {
    return { error: "User not found" };
  }

  const passwordValid = await bcrypt.compare(
    parsed.data.currentPassword,
    currentUser.passwordHash
  );

  if (!passwordValid) {
    return { error: "Current password is incorrect" };
  }

  const newPasswordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newPasswordHash },
  });

  await createAuditLog({
    userId: session.user.id,
    userEmail: session.user.email ?? "",
    userRole: session.user.role,
    action: AuditAction.UPDATE,
    entityType: "User",
    entityId: session.user.id,
    description: "User changed their password",
    clinicId: session.user.primaryClinicId,
  });

  return { success: true };
}
