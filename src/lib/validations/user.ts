import { z } from "zod";
import { UserRole } from "@prisma/client";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.nativeEnum(UserRole),
  primaryClinicId: z.string().nullable(),
});

export const updateUserSchema = z.object({
  id: z.string(),
  email: z.string().email("Invalid email address").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  role: z.nativeEnum(UserRole).optional(),
  primaryClinicId: z.string().nullable().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
