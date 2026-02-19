import { z } from "zod";

export const paymentMethodSchema = z.enum(["cash", "gcash", "bank_transfer", "none"]);
export const paymentSourceSchema = z.enum(["client", "dswd", "cswdo", "other_govt"]);
export const creditTypeSchema = z.enum(["regular", "advance", "no_payment"]);

export const recordPaymentSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  clientId: z.string().min(1, "Client is required"),
  sessionId: z.string().min(1, "Session is required"),
  amount: z.number().positive("Amount must be positive"),
  paymentMethod: paymentMethodSchema,
  paymentSource: paymentSourceSchema.default("client"),
  creditType: creditTypeSchema.default("regular"),
  sessionsPaid: z.number().int().min(1).max(10).default(1),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const getPaymentsSchema = z.object({
  clinicId: z.string().optional(),
  dateFilter: z.enum(["day", "week", "month"]).default("day"),
  specificDate: z.date().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type GetPaymentsInput = z.infer<typeof getPaymentsSchema>;
