import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getAuditLogs } from "@/lib/audit";
import { AuditLogsTable } from "./audit-logs-table";
import { AuditAction } from "@prisma/client";

interface PageProps {
  searchParams: Promise<{
    action?: AuditAction;
    entityType?: string;
    page?: string;
  }>;
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_audit_logs")) {
    redirect("/dashboard");
  }

  const page = parseInt(params.page || "1");
  const limit = 25;
  const offset = (page - 1) * limit;

  const { logs, total } = await getAuditLogs({
    action: params.action,
    entityType: params.entityType,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Audit Logs</h2>
        <p className="text-muted-foreground">
          View system activity and changes
        </p>
      </div>

      <AuditLogsTable
        logs={logs}
        currentPage={page}
        totalPages={totalPages}
        total={total}
      />
    </div>
  );
}
