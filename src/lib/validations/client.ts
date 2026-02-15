import { z } from "zod";
import { ClientStatus } from "@prisma/client";

export const createClientSchema = z.object({
  mainClinicId: z.string().min(1, "Clinic is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  diagnosis: z.string().optional(),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  guardianRelation: z.string().optional(),
  primaryTherapistId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = z.object({
  id: z.string(),
  mainClinicId: z.string().min(1, "Clinic is required").optional(),
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  dateOfBirth: z.string().optional(),
  diagnosis: z.string().optional(),
  guardianName: z.string().min(1, "Guardian name is required").optional(),
  guardianPhone: z.string().optional(),
  guardianEmail: z.string().email().optional().or(z.literal("")),
  guardianRelation: z.string().optional(),
  primaryTherapistId: z.string().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  notes: z.string().optional(),
});

export const assignBackupTherapistSchema = z.object({
  clientId: z.string(),
  therapistId: z.string(),
  priority: z.number().int().min(1),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
