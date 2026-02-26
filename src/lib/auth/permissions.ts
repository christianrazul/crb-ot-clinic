import { UserRole } from "@prisma/client";

export type Permission =
  | "manage_users"
  | "manage_clinics"
  | "manage_clients"
  | "view_all_clients"
  | "manage_sessions"
  | "view_all_sessions"
  | "view_own_sessions"
  | "log_session_notes"
  | "verify_sessions"
  | "manage_attendance"
  | "manage_payments"
  | "collect_payments"
  | "view_payments"
  | "view_reports"
  | "view_financial_reports"
  | "view_audit_logs"
  | "manage_packages"
  | "manage_rates";

const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    "manage_users",
    "manage_clinics",
    "manage_clients",
    "view_all_clients",
    "manage_sessions",
    "view_all_sessions",
    "view_own_sessions",
    "log_session_notes",
    "verify_sessions",
    "manage_attendance",
    "manage_payments",
    "collect_payments",
    "view_payments",
    "view_reports",
    "view_financial_reports",
    "view_audit_logs",
    "manage_packages",
    "manage_rates",
  ],
  secretary: [
    "manage_clients",
    "view_all_clients",
    "manage_sessions",
    "view_all_sessions",
    "verify_sessions",
    "manage_attendance",
    "collect_payments",
    "view_payments",
  ],
  licensed_ot: [
    "view_own_sessions",
    "log_session_notes",
  ],
  unlicensed_ot: [
    "view_own_sessions",
    "log_session_notes",
  ],
  st: [
    "view_own_sessions",
    "log_session_notes",
  ],
};

export function hasPermission(role: UserRole | string, permission: Permission): boolean {
  const permissions = rolePermissions[role as UserRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function getPermissions(role: UserRole | string): Permission[] {
  return rolePermissions[role as UserRole] || [];
}

export function isTherapist(role: UserRole | string): boolean {
  return role === "licensed_ot" || role === "unlicensed_ot" || role === "st";
}

export function canAccessClinic(
  userRole: UserRole | string,
  userClinicId: string | null,
  targetClinicId: string
): boolean {
  if (userRole === "owner") return true;
  return userClinicId === targetClinicId;
}

export const roleLabels: Record<UserRole, string> = {
  owner: "Owner",
  secretary: "Clinic Secretary",
  licensed_ot: "Occupational Therapist",
  unlicensed_ot: "Occupational Therapist Aide",
  st: "Speech Therapist",
};

export const therapistRoles: UserRole[] = ["licensed_ot", "unlicensed_ot", "st"];
