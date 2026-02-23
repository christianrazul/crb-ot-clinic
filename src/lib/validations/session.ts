import { z } from "zod";

const sessionTypeEnum = z.enum(["regular", "ot_evaluation", "make_up"]).default("regular");

export const createSessionSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().min(1, "Client is required"),
  therapistId: z.string().min(1, "Therapist is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  durationMinutes: z.number().int().min(15).max(180).default(60),
  sessionType: sessionTypeEnum,
});

export const createMultipleSessionsSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().min(1, "Client is required"),
  therapistId: z.string().min(1, "Therapist is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  selectedDates: z.array(z.string()).min(1, "At least one date must be selected"),
  durationMinutes: z.number().int().min(15).max(180).default(60),
  sessionType: sessionTypeEnum,
});

export const startSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const confirmSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateMultipleSessionsInput = z.infer<typeof createMultipleSessionsSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;
