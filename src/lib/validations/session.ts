import { z } from "zod";

export const createSessionSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().min(1, "Client is required"),
  therapistId: z.string().min(1, "Therapist is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  durationMinutes: z.number().int().min(15).max(180).default(60),
});

export const createRecurringSessionSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().min(1, "Client is required"),
  therapistId: z.string().min(1, "Therapist is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  dayOfWeek: z.number().int().min(0).max(6),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  durationMinutes: z.number().int().min(15).max(180).default(60),
});

export const startSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const confirmSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type CreateRecurringSessionInput = z.infer<typeof createRecurringSessionSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;
