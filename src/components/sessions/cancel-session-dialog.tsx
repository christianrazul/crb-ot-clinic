"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cancelSession } from "@/actions/sessions";

interface CancelSessionDialogProps {
  sessionId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function CancelSessionDialog({
  sessionId,
  clientName,
  open,
  onOpenChange,
  onComplete,
}: CancelSessionDialogProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setIsCancelling(true);
    await cancelSession(sessionId, cancelReason);
    setIsCancelling(false);
    setCancelReason("");
    onComplete?.();
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setCancelReason("");
    }
    onOpenChange(newOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Session</DialogTitle>
          <DialogDescription>
            You are about to cancel the session with <strong>{clientName}</strong>.
            Please provide a reason for cancellation.
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
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
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
  );
}
