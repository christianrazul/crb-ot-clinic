import { z } from "zod";

export const logAttendanceSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().min(1, "Client is required"),
  guardianName: z.string().min(1, "Guardian name is required"),
  guardianRelation: z.string().optional(),
  primaryTherapistId: z.string().optional(),
  notes: z.string().optional(),
});

export type LogAttendanceInput = z.infer<typeof logAttendanceSchema>;
