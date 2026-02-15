"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionStatus, UserRole } from "@prisma/client";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { roleLabels } from "@/lib/auth/permissions";
import { cancelSession } from "@/actions/sessions";

interface Session {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: SessionStatus;
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  therapist: { id: string; firstName: string; lastName: string; role: UserRole };
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface SessionsTableProps {
  sessions: Session[];
  clinics: Clinic[];
  selectedDate: Date;
  selectedClinic?: string;
  selectedStatus?: string;
}

const statusColors: Record<SessionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "outline",
};

export function SessionsTable({
  sessions,
  clinics,
  selectedDate,
  selectedClinic,
  selectedStatus,
}: SessionsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [sessionToCancel, setSessionToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  function navigateToMonth(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/sessions?${params.toString()}`);
  }

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clinicId && clinicId !== "all") {
      params.set("clinic", clinicId);
    } else {
      params.delete("clinic");
    }
    router.push(`/sessions?${params.toString()}`);
  }

  function handleStatusChange(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status && status !== "all") {
      params.set("status", status);
    } else {
      params.delete("status");
    }
    router.push(`/sessions?${params.toString()}`);
  }

  function goToPreviousMonth() {
    navigateToMonth(subMonths(selectedDate, 1));
  }

  function goToNextMonth() {
    navigateToMonth(addMonths(selectedDate, 1));
  }

  function openCancelDialog(sessionId: string) {
    setSessionToCancel(sessionId);
    setCancelReason("");
    setCancelDialogOpen(true);
  }

  async function handleCancel() {
    if (!sessionToCancel || !cancelReason.trim()) return;
    setIsCancelling(true);
    await cancelSession(sessionToCancel, cancelReason);
    setIsCancelling(false);
    setCancelDialogOpen(false);
    setSessionToCancel(null);
    setCancelReason("");
  }

  const filteredSessions = sessions.filter((s) => {
    if (selectedStatus && s.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[150px] text-center font-medium">
            {format(selectedDate, "MMMM yyyy")}
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedClinic || "all"}
            onValueChange={handleClinicChange}
          >
            <SelectTrigger className="w-[150px]">
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

          <Select
            value={selectedStatus || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.values(SessionStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No sessions found
                </TableCell>
              </TableRow>
            ) : (
              filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {format(new Date(session.scheduledDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>{session.scheduledTime}</TableCell>
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
                    <Badge variant={statusColors[session.status]}>
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {session.status === "scheduled" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCancelDialog(session.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredSessions.length} of {sessions.length} sessions
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Cancellation Reason</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter the reason for cancellation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Session
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
