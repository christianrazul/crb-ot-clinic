import { z } from "zod";

const sessionTypeSchema = z.enum(["regular", "ot_evaluation", "make_up"]);
const NEW_CLIENT_OPTION_VALUE = "__new_client__";

function validateClientSelection(
  data: { clientId?: string; clientName?: string },
  ctx: z.RefinementCtx
) {
  const normalizedClientName = data.clientName?.trim();
  const hasExistingClient = !!data.clientId && data.clientId !== NEW_CLIENT_OPTION_VALUE;
  const hasNewClientName = !!normalizedClientName;

  if (!hasExistingClient && !hasNewClientName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Client is required",
      path: ["clientId"],
    });
    return;
  }

  if (data.clientId === NEW_CLIENT_OPTION_VALUE && !hasNewClientName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Client name is required",
      path: ["clientName"],
    });
  }
}

function normalizeClientSelection(data: { clientId?: string; clientName?: string }) {
  return {
    clientId:
      data.clientId && data.clientId !== NEW_CLIENT_OPTION_VALUE
        ? data.clientId
        : undefined,
    clientName: data.clientName?.trim() || undefined,
  };
}

export const createSessionSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  therapistId: z.string().min(1, "Therapist is required"),
  sessionType: sessionTypeSchema.default("regular"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  durationMinutes: z.number().int().min(15).max(180).default(60),
})
  .superRefine(validateClientSelection)
  .transform((data) => ({
    ...data,
    ...normalizeClientSelection(data),
  }));

export const createMultipleSessionsSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  therapistId: z.string().min(1, "Therapist is required"),
  sessionType: sessionTypeSchema.default("regular"),
  scheduledTime: z.string().min(1, "Time is required"),
  selectedDates: z.array(z.string()).min(1, "At least one date must be selected"),
  durationMinutes: z.number().int().min(15).max(180).default(60),
})
  .superRefine(validateClientSelection)
  .transform((data) => ({
    ...data,
    ...normalizeClientSelection(data),
  }));

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
