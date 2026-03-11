import { UserRole } from "@prisma/client";
import { roleLabels } from "@/lib/auth/permissions";

const roleColors: Partial<Record<UserRole, string>> = {
  licensed_ot: "#95cdfe",
  unlicensed_ot: "#d6b9dd",
  st: "#feff83",
  sped_teacher: "#fea3ba",
};

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const backgroundColor = roleColors[role];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground"
      style={backgroundColor ? { backgroundColor, color: "#1a1a1a" } : undefined}
    >
      {roleLabels[role]}
    </span>
  );
}
