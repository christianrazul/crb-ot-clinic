"use client";

import { useState } from "react";
import { SessionStatus, UserRole, SessionType } from "@prisma/client";
import { format } from "date-fns";
import { Clock, MapPin, User, Calendar, Phone, Stethoscope } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { roleLabels, isTherapist as checkIsTherapist } from "@/lib/auth/permissions";
import { formatTime12hr } from "@/lib/utils";
import { startSession } from "@/actions/sessions";
import { CancelSessionDialog } from "./cancel-session-dialog";

export interface SessionWithDetails {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  durationMinutes: number;
  sessionType: SessionType;
  status: SessionStatus;
  startedAt: Date | null;
  clinic: { id: string; name: string; code: string };
  client: {
    id: string;
    firstName: string;
    lastName: string;
    diagnosis?: string | null;
    guardianName?: string;
    guardianPhone?: string | null;
  };
  therapist: { id: string; firstName: string; lastName: string; role: UserRole };
}

interface SessionDetailsDialogProps {
  session: SessionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  currentUserRole: UserRole | string;
}

const statusColors: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  in_progress: "bg-purple-100 text-purple-800 border-purple-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  no_show: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

const statusLabels: Record<SessionStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const sessionTypeLabels: Record<SessionType, string> = {
  regular: "Regular Session",
  ot_evaluation: "OT Evaluation",
  make_up: "Make Up Session",
};

const sessionTypeColors: Record<SessionType, string> = {
  regular: "bg-gray-100 text-gray-800 border-gray-300",
  ot_evaluation: "bg-orange-100 text-orange-800 border-orange-300",
  make_up: "bg-teal-100 text-teal-800 border-teal-300",
};

export function SessionDetailsDialog({
  session,
  open,
  onOpenChange,
  currentUserId,
  currentUserRole,
}: SessionDetailsDialogProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  if (!session) return null;

  const isTherapistUser = checkIsTherapist(currentUserRole);
  const isOwnSession = session.therapist.id === currentUserId;
  const canStart = (isTherapistUser && isOwnSession) || !isTherapistUser;
  const canCancel = (isTherapistUser && isOwnSession) || !isTherapistUser;
  const showDiagnosis = isTherapistUser || currentUserRole === "owner";

  async function handleStartSession() {
    setIsStarting(true);
    const result = await startSession(session!.id);
    setIsStarting(false);
    setStartConfirmOpen(false);
    if (result.success) {
      onOpenChange(false);
    }
  }

  function handleCancelComplete() {
    setCancelDialogOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Session Details</span>
              <div className="flex items-center gap-2">
                {session.sessionType !== "regular" && (
                  <Badge className={sessionTypeColors[session.sessionType]}>
                    {sessionTypeLabels[session.sessionType]}
                  </Badge>
                )}
                <Badge className={statusColors[session.status]}>
                  {statusLabels[session.status]}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {session.client.firstName} {session.client.lastName}
                </h3>
                {showDiagnosis && session.client.diagnosis && (
                  <p className="text-sm text-muted-foreground">
                    {session.client.diagnosis}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{format(new Date(session.scheduledDate), "EEEE, MMMM d, yyyy")}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span>
                  {formatTime12hr(session.scheduledTime)} ({session.durationMinutes} min)
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Clinic:</span>
                <span>{session.clinic.name} ({session.clinic.code})</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Therapist:</span>
                <span>
                  {session.therapist.firstName} {session.therapist.lastName} ({roleLabels[session.therapist.role]})
                </span>
              </div>

              {session.client.guardianPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Guardian:</span>
                  <span>
                    {session.client.guardianName} - {session.client.guardianPhone}
                  </span>
                </div>
              )}
            </div>

            {session.status === "scheduled" && (canStart || canCancel) && (
              <>
                <Separator />
                <div className="flex gap-2">
                  {canStart && (
                    <Button
                      className="flex-1"
                      onClick={() => setStartConfirmOpen(true)}
                    >
                      Start Session
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => setCancelDialogOpen(true)}
                    >
                      Cancel Session
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to start this session with{" "}
              <strong>
                {session.client.firstName} {session.client.lastName}
              </strong>
              ? This will mark the session as in progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStarting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartSession} disabled={isStarting}>
              {isStarting ? "Starting..." : "Start Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancelSessionDialog
        sessionId={session.id}
        clientName={`${session.client.firstName} ${session.client.lastName}`}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onComplete={handleCancelComplete}
      />
    </>
  );
}
