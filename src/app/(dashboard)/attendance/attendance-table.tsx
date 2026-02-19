"use client";

import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceLog {
  id: string;
  clinicId: string;
  clientId: string;
  guardianName: string;
  guardianRelation: string | null;
  primaryTherapistId: string | null;
  loggedAt: Date;
  loggedById: string;
  notes: string | null;
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  primaryTherapist: { id: string; firstName: string; lastName: string } | null;
  loggedBy: { id: string; firstName: string; lastName: string };
}

interface AttendanceTableProps {
  logs: AttendanceLog[];
}

export function AttendanceTable({ logs }: AttendanceTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No attendance logs found for the selected period.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Name</TableHead>
            <TableHead>Guardian</TableHead>
            <TableHead>Primary Therapist</TableHead>
            <TableHead>Logged At</TableHead>
            <TableHead>Logged By</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">
                {log.client.firstName} {log.client.lastName}
              </TableCell>
              <TableCell>
                {log.guardianName}
                {log.guardianRelation && (
                  <span className="text-muted-foreground ml-1">
                    ({log.guardianRelation})
                  </span>
                )}
              </TableCell>
              <TableCell>
                {log.primaryTherapist
                  ? `${log.primaryTherapist.firstName} ${log.primaryTherapist.lastName}`
                  : "-"}
              </TableCell>
              <TableCell>
                {format(new Date(log.loggedAt), "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell>
                {log.loggedBy.firstName} {log.loggedBy.lastName}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {log.notes || "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
