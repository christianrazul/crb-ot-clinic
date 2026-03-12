"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { markAttendanceAsPaid, getAttendanceRate, type ActionState } from "@/actions/attendance";
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
  session: { sessionType: string } | null;
}

interface AttendancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AttendanceLog | null;
}

const initialState: ActionState = {};

const SESSION_TYPE_LABELS: Record<string, string> = {
  regular: "Regular",
  ot_evaluation: "OT Evaluation",
  make_up: "Make-Up",
  st_session: "ST Session",
  sped_session: "SPED Session",
};

const SESSION_TYPES = Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface PaymentOption {
  value: string;
  label: string;
  method: string;
  source: string;
  showReference: boolean;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { value: "cash",          label: "Cash",                    method: "cash",         source: "client",     showReference: false },
  { value: "gcash",         label: "GCash",                   method: "gcash",        source: "client",     showReference: true  },
  { value: "bank_transfer", label: "Bank Transfer",           method: "bank_transfer",source: "client",     showReference: true  },
  { value: "dswd",          label: "DSWD",                    method: "cash",         source: "dswd",       showReference: false },
  { value: "cswdo",         label: "CSWDO",                   method: "cash",         source: "cswdo",      showReference: false },
  { value: "other_govt",    label: "Other Government Agency", method: "cash",         source: "other_govt", showReference: false },
];

export function AttendancePaymentDialog({ open, onOpenChange, log }: AttendancePaymentDialogProps) {
  const [state, formAction] = useFormState(markAttendanceAsPaid, initialState);
  const { data: session } = useSession();

  const [selectedSessionType, setSelectedSessionType] = useState("");
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [resolvedAmount, setResolvedAmount] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);

  const canCollectPayments = session?.user?.role
    ? hasPermission(session.user.role, "collect_payments")
    : false;

  const canMarkAsPaid = canCollectPayments && log?.paymentStatus === "UNPAID";

  const activePaymentOption = PAYMENT_OPTIONS.find((o) => o.value === selectedPaymentOption) ?? null;

  useEffect(() => {
    if (!open) {
      setSelectedSessionType("");
      setSelectedPaymentOption("");
      setPaymentNotes("");
      setReferenceNumber("");
      setResolvedAmount(null);
    } else if (log?.session?.sessionType) {
      setSelectedSessionType(log.session.sessionType);
    }
  }, [open, log]);

  useEffect(() => {
    if (!open || !log || !canMarkAsPaid || !selectedSessionType) {
      setResolvedAmount(null);
      return;
    }

    setIsLoadingRate(true);
    getAttendanceRate(log.clinicId, selectedSessionType).then((result) => {
      setResolvedAmount(result.data ?? null);
      setIsLoadingRate(false);
    });
  }, [open, log, canMarkAsPaid, selectedSessionType]);

  useEffect(() => {
    if (state.success) {
      onOpenChange(false);
    }
  }, [state.success, onOpenChange]);

  if (!log) {
    return null;
  }

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
        </div>

        {canMarkAsPaid && (
          <>
            <Separator />

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="attendanceLogId" value={log.id} />
              <input type="hidden" name="paymentMethod" value={activePaymentOption?.method ?? ""} />
              <input type="hidden" name="paymentSource" value={activePaymentOption?.source ?? ""} />
              <input type="hidden" name="sessionType" value={selectedSessionType} />

              <div className="space-y-1.5">
                <Label htmlFor="sessionType">Session Type</Label>
                <Select
                  value={selectedSessionType}
                  onValueChange={setSelectedSessionType}
                >
                  <SelectTrigger id="sessionType">
                    <SelectValue placeholder="Select session type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Session Rate</span>
                <span className="font-medium">
                  {!selectedSessionType
                    ? "-"
                    : isLoadingRate
                    ? "Resolving..."
                    : resolvedAmount !== null && resolvedAmount > 0
                    ? `₱${resolvedAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                    : "No rate found"}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentOption">Mode of Payment</Label>
                <Select
                  value={selectedPaymentOption}
                  onValueChange={(val) => {
                    setSelectedPaymentOption(val);
                    setReferenceNumber("");
                  }}
                >
                  <SelectTrigger id="paymentOption">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="gcash">GCash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="dswd">DSWD</SelectItem>
                    <SelectItem value="cswdo">CSWDO</SelectItem>
                    <SelectItem value="other_govt">Other Government Agency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {activePaymentOption?.showReference && (
                <div className="space-y-1.5">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    name="referenceNumber"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="paymentNotes">Notes</Label>
                <Textarea
                  id="paymentNotes"
                  name="paymentNotes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Optional remarks..."
                  rows={2}
                />
              </div>

              {state.error && (
                <div className="rounded-md bg-destructive/15 p-2 text-xs text-destructive">
                  {state.error}
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <SubmitButton
                  pendingText="Marking..."
                  disabled={!selectedPaymentOption || !selectedSessionType}
                >
                  Mark as Paid
                </SubmitButton>
              </DialogFooter>
            </form>
          </>
        )}

        {!canMarkAsPaid && (
          <>
            {state.error && (
              <div className="rounded-md bg-destructive/15 p-2 text-xs text-destructive">
                {state.error}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
