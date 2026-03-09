"use client";

import { useState } from "react";
import { SessionStatus, UserRole } from "@prisma/client";
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
import { startSession, completeSession } from "@/actions/sessions";
import { EditSessionDialog } from "./edit-session-dialog";

export interface SessionWithDetails {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  durationMinutes: number;
  sessionType: "regular" | "ot_evaluation" | "make_up";
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

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface SessionDetailsDialogProps {
  session: SessionWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  currentUserRole: UserRole | string;
  therapists?: Therapist[];
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

const sessionTypeLabels: Record<SessionWithDetails["sessionType"], string> = {
  regular: "Regular Session",
  ot_evaluation: "OT Evaluation",
  make_up: "Make Up Session",
};

export function SessionDetailsDialog({
  session,
  open,
  onOpenChange,
  currentUserId,
  currentUserRole,
  therapists = [],
}: SessionDetailsDialogProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (!session) return null;

  const isTherapistUser = checkIsTherapist(currentUserRole);
  const isOwnSession = session.therapist.id === currentUserId;
  const canStart = (isTherapistUser && isOwnSession) || !isTherapistUser;
  const canComplete = (isTherapistUser && isOwnSession) || !isTherapistUser;
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

  async function handleCompleteSession() {
    setIsCompleting(true);
    const result = await completeSession(session!.id);
    setIsCompleting(false);
    setCompleteConfirmOpen(false);
    if (result.success) {
      onOpenChange(false);
    }
  }

  function handleEditComplete() {
    setEditDialogOpen(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <div className="flex items-center gap-2 pt-1">
              <Badge variant="outline">{sessionTypeLabels[session.sessionType]}</Badge>
              <Badge className={statusColors[session.status]}>
                {statusLabels[session.status]}
              </Badge>
            </div>
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
                  {canCancel && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      Edit Session
                    </Button>
                  )}
                  {canStart && (
                    <Button
                      className="flex-1"
                      onClick={() => setStartConfirmOpen(true)}
                    >
                      Start Session
                    </Button>
                  )}
                </div>
              </>
            )}

            {session.status === "in_progress" && canComplete && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => setCompleteConfirmOpen(true)}
                  >
                    Complete Session
                  </Button>
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

      <AlertDialog open={completeConfirmOpen} onOpenChange={setCompleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this session with{" "}
              <strong>
                {session.client.firstName} {session.client.lastName}
              </strong>
              {" "}as completed? The secretary will need to verify completion before payment can be collected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCompleteSession} disabled={isCompleting}>
              {isCompleting ? "Completing..." : "Complete Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditSessionDialog
        sessionId={session.id}
        clientName={`${session.client.firstName} ${session.client.lastName}`}
        scheduledDate={session.scheduledDate}
        scheduledTime={session.scheduledTime}
        currentTherapistId={session.therapist.id}
        therapists={therapists}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onComplete={handleEditComplete}
      />
    </>
  );
}
