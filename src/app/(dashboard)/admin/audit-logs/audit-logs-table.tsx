"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AuditAction, UserRole } from "@prisma/client";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roleLabels } from "@/lib/auth/permissions";

interface AuditLog {
  id: string;
  userId: string | null;
  userEmail: string;
  userRole: UserRole;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues: unknown;
  newValues: unknown;
  description: string | null;
  ipAddress: string | null;
  clinicId: string | null;
  createdAt: Date;
  user: {
    firstName: string;
    lastName: string;
  } | null;
  clinic: {
    name: string;
    code: string;
  } | null;
}

interface AuditLogsTableProps {
  logs: AuditLog[];
  currentPage: number;
  totalPages: number;
  total: number;
}

const actionColors: Record<AuditAction, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
  VERIFY: "outline",
  LOGIN: "outline",
};

const entityTypes = [
  "User",
  "Client",
  "Session",
  "Payment",
  "Package",
];

export function AuditLogsTable({
  logs,
  currentPage,
  totalPages,
  total,
}: AuditLogsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleActionFilter(action: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (action && action !== "all") {
      params.set("action", action);
    } else {
      params.delete("action");
    }
    params.delete("page");
    router.push(`/admin/audit-logs?${params.toString()}`);
  }

  function handleEntityTypeFilter(entityType: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (entityType && entityType !== "all") {
      params.set("entityType", entityType);
    } else {
      params.delete("entityType");
    }
    params.delete("page");
    router.push(`/admin/audit-logs?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/admin/audit-logs?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={searchParams.get("action") || "all"}
          onValueChange={handleActionFilter}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.values(AuditAction).map((action) => (
              <SelectItem key={action} value={action}>
                {action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("entityType") || "all"}
          onValueChange={handleEntityTypeFilter}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground">
          {total} total entries
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Clinic</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm">
                      {format(new Date(log.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "HH:mm:ss")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : log.userEmail}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {roleLabels[log.userRole]}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={actionColors[log.action]}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{log.entityType}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {log.entityId.slice(0, 8)}...
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {log.description || "-"}
                  </TableCell>
                  <TableCell>
                    {log.clinic ? (
                      <Badge variant="outline">{log.clinic.code}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
