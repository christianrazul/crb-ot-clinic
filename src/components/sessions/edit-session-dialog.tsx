"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UserRole } from "@prisma/client";
import { formatTime12hr } from "@/lib/utils";
import { roleLabels } from "@/lib/auth/permissions";
import { moveSession } from "@/actions/sessions";
import { CancelSessionDialog } from "./cancel-session-dialog";

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface EditSessionDialogProps {
  sessionId: string;
  clientName: string;
  scheduledDate: Date;
  scheduledTime: string;
  currentTherapistId: string;
  therapists: Therapist[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type View = "choice" | "move";

export function EditSessionDialog({
  sessionId,
  clientName,
  scheduledDate,
  scheduledTime,
  currentTherapistId,
  therapists,
  open,
  onOpenChange,
  onComplete,
}: EditSessionDialogProps) {
  const [view, setView] = useState<View>("choice");
  const [newDate, setNewDate] = useState(format(new Date(scheduledDate), "yyyy-MM-dd"));
  const [newTime, setNewTime] = useState(scheduledTime);
  const [selectedTherapistId, setSelectedTherapistId] = useState(currentTherapistId);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("choice");
      setMoveError(null);
    }
    onOpenChange(nextOpen);
  }

  async function handleMove() {
    if (!newDate || !newTime) return;
    setIsMoving(true);
    setMoveError(null);
    const result = await moveSession(sessionId, newDate, newTime, selectedTherapistId);
    setIsMoving(false);
    if (result.error) {
      setMoveError(result.error);
      return;
    }
    onComplete();
  }

  function handleCancelComplete() {
    setCancelDialogOpen(false);
    onComplete();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[420px]">
          {view === "choice" && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Session</DialogTitle>
                <DialogDescription>
                  What would you like to do with{" "}
                  <strong>{clientName}</strong>&apos;s session scheduled for{" "}
                  {format(new Date(scheduledDate), "MMMM d, yyyy")} at{" "}
                  {formatTime12hr(scheduledTime)}?
                </DialogDescription>
              </DialogHeader>
              <Separator />
              <div className="flex flex-col gap-3 py-2">
                <button
                  type="button"
                  className="flex w-full items-start rounded-md border px-4 py-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setView("move")}
                >
                  <div className="min-w-0">
                    <div className="font-medium">Move Session</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Reschedule to a new date and time. Session will be marked as a make-up session.
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="flex w-full items-start rounded-md border border-destructive/50 px-4 py-3 text-left text-sm text-destructive transition-colors hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    onOpenChange(false);
                    setCancelDialogOpen(true);
                  }}
                >
                  <div className="min-w-0">
                    <div className="font-medium">Cancel Session</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Cancel this session and provide a reason.
                    </div>
                  </div>
                </button>
              </div>
            </>
          )}

          {view === "move" && (
            <>
              <DialogHeader>
                <DialogTitle>Move Session</DialogTitle>
                <DialogDescription>
                  Select a new date and time for <strong>{clientName}</strong>&apos;s session.
                  This will be marked as a make-up session.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {moveError && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {moveError}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newDate">New Date</Label>
                    <Input
                      id="newDate"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Time</Label>
                    <Select value={newTime} onValueChange={setNewTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatTime12hr(t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {therapists.length > 0 && (
                  <div className="space-y-2">
                    <Label>Therapist</Label>
                    <Select value={selectedTherapistId} onValueChange={setSelectedTherapistId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select therapist" />
                      </SelectTrigger>
                      <SelectContent>
                        {therapists.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.firstName} {t.lastName} ({roleLabels[t.role]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setView("choice")} disabled={isMoving}>
                  Back
                </Button>
                <Button
                  onClick={handleMove}
                  disabled={!newDate || !newTime || isMoving}
                >
                  {isMoving ? "Moving..." : "Confirm Move"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CancelSessionDialog
        sessionId={sessionId}
        clientName={clientName}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onComplete={handleCancelComplete}
      />
    </>
  );
}
