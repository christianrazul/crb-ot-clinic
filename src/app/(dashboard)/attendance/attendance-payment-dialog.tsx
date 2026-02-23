"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { hasPermission } from "@/lib/auth/permissions";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markAttendanceAsPaid, type ActionState } from "@/actions/attendance";
import { SubmitButton } from "@/components/ui/submit-button";

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
  paymentStatus: "UNPAID" | "PAID";
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  primaryTherapist: { id: string; firstName: string; lastName: string; role?: string } | null;
  loggedBy: { id: string; firstName: string; lastName: string };
}

interface AttendancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AttendanceLog | null;
}

const initialState: ActionState = {};

export function AttendancePaymentDialog({ open, onOpenChange, log }: AttendancePaymentDialogProps) {
  const [state, formAction] = useFormState(markAttendanceAsPaid, initialState);
  const { data: session } = useSession();

  const canCollectPayments = session?.user?.role
    ? hasPermission(session.user.role, "collect_payments")
    : false;

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  if (!log) {
    return null;
  }

  const canMarkAsPaid = canCollectPayments && log.paymentStatus === "UNPAID";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Attendance Details</DialogTitle>
          <DialogDescription>
            Review attendance and update payment status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Client</span>
            <span className="font-medium">
              {log.client.firstName} {log.client.lastName}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Guardian</span>
            <span>
              {log.guardianName}
              {log.guardianRelation ? ` (${log.guardianRelation})` : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Clinic</span>
            <span>{log.clinic.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Primary Therapist</span>
            <span>
              {log.primaryTherapist
                ? `${log.primaryTherapist.firstName} ${log.primaryTherapist.lastName}`
                : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payment Status</span>
            <Badge variant={log.paymentStatus === "PAID" ? "default" : "secondary"}>
              {log.paymentStatus}
            </Badge>
          </div>
          {log.notes && (
            <div className="rounded-md border bg-muted/30 p-2 text-xs">
              {log.notes}
            </div>
          )}
          {state.error && (
            <div className="rounded-md bg-destructive/15 p-2 text-xs text-destructive">
              {state.error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {canMarkAsPaid && (
            <form action={formAction}>
              <input type="hidden" name="attendanceLogId" value={log.id} />
              <input type="hidden" name="paymentMethod" value="cash" />
              <SubmitButton pendingText="Marking...">Mark as paid</SubmitButton>
            </form>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
