import { SessionType } from "@prisma/client";

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  regular: "Regular OT Session",
  ot_evaluation: "OT Evaluation",
  make_up: "Make Up Session",
  st_session: "ST Session",
  sped_session: "SPED Tutorial Session",
};
