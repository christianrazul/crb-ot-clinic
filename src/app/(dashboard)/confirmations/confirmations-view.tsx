"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserRole } from "@prisma/client";
import { format } from "date-fns";
import { Check, Clock } from "lucide-react";
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
import { formatTime12hr } from "@/lib/utils";
import { confirmSessionStart } from "@/actions/sessions";

interface Session {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  startedAt: Date | null;
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  therapist: { id: string; firstName: string; lastName: string; role: UserRole };
  startedBy: { id: string; firstName: string; lastName: string } | null;
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface ConfirmationsViewProps {
  sessions: Session[];
  clinics: Clinic[];
  selectedClinic?: string;
}

export function ConfirmationsView({
  sessions,
  clinics,
  selectedClinic,
}: ConfirmationsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clinicId && clinicId !== "all") {
      params.set("clinic", clinicId);
    } else {
      params.delete("clinic");
    }
    router.push(`/confirmations?${params.toString()}`);
  }

  async function handleConfirm(sessionId: string) {
    setConfirmingIds((prev) => new Set(prev).add(sessionId));
    await confirmSessionStart(sessionId);
    setConfirmingIds((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} pending confirmation
        </div>

        <Select
          value={selectedClinic || "all"}
          onValueChange={handleClinicChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Clinics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clinics</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Started At</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No sessions pending confirmation
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {format(new Date(session.scheduledDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{formatTime12hr(session.scheduledTime)}</TableCell>
                  <TableCell>
                    {session.client.firstName} {session.client.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {session.therapist.firstName} {session.therapist.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {roleLabels[session.therapist.role]}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.clinic.code}</Badge>
                  </TableCell>
                  <TableCell>
                    {session.startedAt && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(session.startedAt), "h:mm a")}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(session.id)}
                      disabled={confirmingIds.has(session.id)}
                    >
                      {confirmingIds.has(session.id) ? (
                        "..."
                      ) : (
                        <>
                          <Check className="mr-1 h-3 w-3" />
                          Confirm
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
