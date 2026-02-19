"use client";

import { useEffect, useState, useCallback } from "react";
import { useFormState } from "react-dom";
import { UserRole } from "@prisma/client";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createSession, createMultipleSessions, ActionState } from "@/actions/sessions";
import { getSessionRate, getClientAdvancePayments } from "@/actions/payments";
import { roleLabels, hasPermission } from "@/lib/auth/permissions";
import { formatTime12hr } from "@/lib/utils";

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  mainClinicId: string;
  primaryTherapistId: string | null;
}

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  primaryClinicId: string | null;
}

interface AdvancePayment {
  id: string;
  amount: number | { toString(): string };
  sessionsPaid: number;
  sessionsUsed: number;
  sessionsRemaining: number;
  paymentDate: Date;
}

interface CreateSessionDialogProps {
  clinics: Clinic[];
  clients: Client[];
  therapists: Therapist[];
  defaultDate?: string;
  userRole?: string;
}

const initialState: ActionState = {};

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export function CreateSessionDialog({
  clinics,
  clients,
  therapists,
  defaultDate,
  userRole = "",
}: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");
  const [singleState, singleFormAction] = useFormState(
    createSession,
    initialState
  );
  const [multipleState, multipleFormAction] = useFormState(
    createMultipleSessions,
    initialState
  );

  // Payment state (shared between tabs)
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [paymentSource, setPaymentSource] = useState<string>("client");
  const [creditType, setCreditType] = useState<string>("regular");
  const [sessionsPaid, setSessionsPaid] = useState<number>(1);
  const [amount, setAmount] = useState<string>("");
  const [sessionRate, setSessionRate] = useState<number | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [advancePayments, setAdvancePayments] = useState<AdvancePayment[]>([]);
  const [useAdvancePayment, setUseAdvancePayment] = useState<string>("");

  // Multiple sessions state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [multiCreditType, setMultiCreditType] = useState<string>("advance");
  const [multiAmount, setMultiAmount] = useState<string>("");
  const [multiPaymentMethod, setMultiPaymentMethod] = useState<string>("cash");
  const [multiPaymentSource, setMultiPaymentSource] = useState<string>("client");
  const [multiReceiptNumber, setMultiReceiptNumber] = useState<string>("");
  const [multiPaymentNotes, setMultiPaymentNotes] = useState<string>("");

  const canCollectPayments = hasPermission(userRole, "collect_payments");

  const resetForm = useCallback(() => {
    setSelectedClinic("");
    setSelectedClient("");
    setSelectedTherapist("");
    setPaymentMethod("cash");
    setPaymentSource("client");
    setCreditType("regular");
    setSessionsPaid(1);
    setAmount("");
    setReceiptNumber("");
    setPaymentNotes("");
    setAdvancePayments([]);
    setUseAdvancePayment("");
    setSelectedDates([]);
    setMultiCreditType("advance");
    setMultiAmount("");
    setMultiPaymentMethod("cash");
    setMultiPaymentSource("client");
    setMultiReceiptNumber("");
    setMultiPaymentNotes("");
  }, []);

  useEffect(() => {
    if (singleState.success || multipleState.success) {
      setOpen(false);
      resetForm();
    }
  }, [singleState.success, multipleState.success, resetForm]);

  const fetchSessionRate = useCallback(async (clinicId: string, therapistRole: string) => {
    const result = await getSessionRate(clinicId, therapistRole);
    if (result.data !== undefined && result.data !== null) {
      setSessionRate(result.data);
      setAmount(result.data.toString());
      setMultiAmount((result.data * selectedDates.length).toString());
    }
  }, [selectedDates.length]);

  const fetchAdvancePayments = useCallback(async (clientId: string) => {
    const result = await getClientAdvancePayments(clientId);
    if (result.data) {
      setAdvancePayments(result.data);
    }
  }, []);

  useEffect(() => {
    if (selectedClient && canCollectPayments) {
      fetchAdvancePayments(selectedClient);
    } else {
      setAdvancePayments([]);
    }
  }, [selectedClient, canCollectPayments, fetchAdvancePayments]);

  useEffect(() => {
    if (selectedClinic && selectedTherapist) {
      const therapist = therapists.find((t) => t.id === selectedTherapist);
      if (therapist) {
        fetchSessionRate(selectedClinic, therapist.role);
      }
    }
  }, [selectedClinic, selectedTherapist, therapists, fetchSessionRate]);

  useEffect(() => {
    if (sessionRate && sessionsPaid > 0 && creditType !== "no_payment") {
      setAmount((sessionRate * sessionsPaid).toString());
    }
  }, [sessionRate, sessionsPaid, creditType]);

  // Update multi-session amount when dates or rate changes
  useEffect(() => {
    if (sessionRate && selectedDates.length > 0 && multiCreditType !== "no_payment") {
      setMultiAmount((sessionRate * selectedDates.length).toString());
    } else if (multiCreditType === "no_payment") {
      setMultiAmount("0");
    }
  }, [sessionRate, selectedDates.length, multiCreditType]);

  const filteredClients = clients.filter(
    (c) => !selectedClinic || c.mainClinicId === selectedClinic
  );

  const filteredTherapists = therapists.filter(
    (t) => !selectedClinic || t.primaryClinicId === selectedClinic
  );

  const selectedClientData = clients.find((c) => c.id === selectedClient);
  const suggestedTherapist = selectedClientData?.primaryTherapistId;

  const dialogWidth = canCollectPayments ? "sm:max-w-[900px]" : "sm:max-w-[500px]";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Session
        </Button>
      </DialogTrigger>
      <DialogContent className={`${dialogWidth} max-h-[90vh] overflow-hidden flex flex-col`}>
        <DialogHeader>
          <DialogTitle>Schedule Session</DialogTitle>
          <DialogDescription>
            Create a single session or schedule multiple sessions at once.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Session</TabsTrigger>
            <TabsTrigger value="multiple">Multiple Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="flex-1 overflow-hidden">
            <form action={singleFormAction} className="h-full flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className={`py-4 ${canCollectPayments ? "grid grid-cols-2 gap-6" : ""}`}>
                  {/* Left Column - Session Info */}
                  <div className="space-y-4">
                    {singleState.error && (
                      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {singleState.error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="clinicId">Clinic</Label>
                      <Select
                        name="clinicId"
                        value={selectedClinic}
                        onValueChange={setSelectedClinic}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a clinic" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client</Label>
                      <Select
                        name="clientId"
                        value={selectedClient}
                        onValueChange={setSelectedClient}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredClients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.firstName} {client.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="therapistId">Therapist</Label>
                      <Select
                        name="therapistId"
                        value={selectedTherapist || suggestedTherapist || ""}
                        onValueChange={setSelectedTherapist}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a therapist" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTherapists.map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id}>
                              {therapist.firstName} {therapist.lastName} (
                              {roleLabels[therapist.role]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Date</Label>
                        <Input
                          id="scheduledDate"
                          name="scheduledDate"
                          type="date"
                          defaultValue={defaultDate}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduledTime">Time</Label>
                        <Select name="scheduledTime" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {formatTime12hr(time)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <input type="hidden" name="durationMinutes" value="60" />
                  </div>

                  {/* Right Column - Payment */}
                  {canCollectPayments && (
                    <div className="space-y-4 border-l pl-6">
                      <h3 className="font-medium text-sm">Payment</h3>

                      {advancePayments.length > 0 && (
                        <div className="space-y-2">
                          <Label>Use Existing Advance Payment</Label>
                          <Select
                            value={useAdvancePayment}
                            onValueChange={(value) => {
                              setUseAdvancePayment(value);
                              if (value) {
                                setPaymentMethod("none");
                                setCreditType("advance");
                                setAmount("0");
                              } else {
                                setPaymentMethod("cash");
                                setCreditType("regular");
                                if (sessionRate) {
                                  setAmount(sessionRate.toString());
                                }
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pay now instead" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Pay now instead</SelectItem>
                              {advancePayments.map((ap) => (
                                <SelectItem key={ap.id} value={ap.id}>
                                  {ap.sessionsRemaining} session(s) remaining
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <input
                            type="hidden"
                            name="advancePaymentId"
                            value={useAdvancePayment}
                          />
                        </div>
                      )}

                      {!useAdvancePayment && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Payment Channel</Label>
                              <Select
                                name="paymentMethod"
                                value={paymentMethod}
                                onValueChange={setPaymentMethod}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="gcash">GCash</SelectItem>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                  <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Source</Label>
                              <Select
                                name="paymentSource"
                                value={paymentSource}
                                onValueChange={setPaymentSource}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="client">Client</SelectItem>
                                  <SelectItem value="dswd">DSWD</SelectItem>
                                  <SelectItem value="cswdo">CSWDO</SelectItem>
                                  <SelectItem value="other_govt">Other Govt</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Charged To</Label>
                              <Select
                                name="creditType"
                                value={creditType}
                                onValueChange={(value) => {
                                  setCreditType(value);
                                  if (value === "no_payment") {
                                    setAmount("0");
                                    setPaymentMethod("none");
                                  } else if (sessionRate) {
                                    setAmount((sessionRate * sessionsPaid).toString());
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="advance">Advance</SelectItem>
                                  <SelectItem value="no_payment">No Payment</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Sessions Paid</Label>
                              <Select
                                name="sessionsPaid"
                                value={sessionsPaid.toString()}
                                onValueChange={(value) => setSessionsPaid(parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <SelectItem key={n} value={n.toString()}>
                                      {n} session{n > 1 ? "s" : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Amount (PHP)</Label>
                              <Input
                                name="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Receipt #</Label>
                              <Input
                                name="receiptNumber"
                                value={receiptNumber}
                                onChange={(e) => setReceiptNumber(e.target.value)}
                                placeholder="Optional"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                              name="paymentNotes"
                              value={paymentNotes}
                              onChange={(e) => setPaymentNotes(e.target.value)}
                              placeholder="Optional payment notes"
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      <input
                        type="hidden"
                        name="includePayment"
                        value={useAdvancePayment || parseFloat(amount) > 0 || creditType === "no_payment" ? "true" : "false"}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton pendingText="Scheduling...">Schedule</SubmitButton>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="multiple" className="flex-1 overflow-hidden">
            <form action={multipleFormAction} className="h-full flex flex-col">
              <ScrollArea className="flex-1 pr-4">
                <div className={`py-4 ${canCollectPayments ? "grid grid-cols-2 gap-6" : ""}`}>
                  {/* Left Column - Session Info */}
                  <div className="space-y-4">
                    {multipleState.error && (
                      <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                        {multipleState.error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="clinicId">Clinic</Label>
                      <Select
                        name="clinicId"
                        value={selectedClinic}
                        onValueChange={setSelectedClinic}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a clinic" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client</Label>
                      <Select
                        name="clientId"
                        value={selectedClient}
                        onValueChange={setSelectedClient}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredClients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.firstName} {client.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="therapistId">Therapist</Label>
                      <Select
                        name="therapistId"
                        value={selectedTherapist || suggestedTherapist || ""}
                        onValueChange={setSelectedTherapist}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a therapist" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTherapists.map((therapist) => (
                            <SelectItem key={therapist.id} value={therapist.id}>
                              {therapist.firstName} {therapist.lastName} (
                              {roleLabels[therapist.role]})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Time (for all sessions)</Label>
                      <Select name="scheduledTime" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {formatTime12hr(time)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Dates ({selectedDates.length} selected)</Label>
                      <div className="border rounded-md p-2 flex justify-center min-h-[320px]">
                        <Calendar
                          mode="multiple"
                          selected={selectedDates}
                          onSelect={(dates) => setSelectedDates(dates || [])}
                          disabled={{ before: new Date() }}
                          className="rounded-md"
                          numberOfMonths={1}
                          fixedWeeks
                        />
                      </div>
                      {selectedDates.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {selectedDates
                            .sort((a, b) => a.getTime() - b.getTime())
                            .map((d) => format(d, "MMM d"))
                            .join(", ")}
                        </div>
                      )}
                    </div>

                    <input type="hidden" name="durationMinutes" value="60" />
                    <input
                      type="hidden"
                      name="selectedDates"
                      value={JSON.stringify(selectedDates.map((d) => format(d, "yyyy-MM-dd")))}
                    />
                  </div>

                  {/* Right Column - Payment */}
                  {canCollectPayments && (
                    <div className="space-y-4 border-l pl-6">
                      <h3 className="font-medium text-sm">Payment</h3>

                      <div className="rounded-md bg-muted p-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Sessions:</span>
                          <span className="font-medium">{selectedDates.length}</span>
                        </div>
                        {sessionRate && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span>Rate per session:</span>
                              <span>PHP {sessionRate.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium border-t pt-1 mt-1">
                              <span>Total:</span>
                              <span>PHP {(sessionRate * selectedDates.length).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Payment Channel</Label>
                          <Select
                            name="paymentMethod"
                            value={multiPaymentMethod}
                            onValueChange={setMultiPaymentMethod}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="gcash">GCash</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="none">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Source</Label>
                          <Select
                            name="paymentSource"
                            value={multiPaymentSource}
                            onValueChange={setMultiPaymentSource}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client">Client</SelectItem>
                              <SelectItem value="dswd">DSWD</SelectItem>
                              <SelectItem value="cswdo">CSWDO</SelectItem>
                              <SelectItem value="other_govt">Other Govt</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Charged To</Label>
                        <Select
                          name="creditType"
                          value={multiCreditType}
                          onValueChange={(value) => {
                            setMultiCreditType(value);
                            if (value === "no_payment") {
                              setMultiAmount("0");
                              setMultiPaymentMethod("none");
                            } else if (sessionRate) {
                              setMultiAmount((sessionRate * selectedDates.length).toString());
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="advance">Advance Payment</SelectItem>
                            <SelectItem value="no_payment">No Payment (Govt Assistance)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount (PHP)</Label>
                          <Input
                            name="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={multiAmount}
                            onChange={(e) => setMultiAmount(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Receipt #</Label>
                          <Input
                            name="receiptNumber"
                            value={multiReceiptNumber}
                            onChange={(e) => setMultiReceiptNumber(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                          name="paymentNotes"
                          value={multiPaymentNotes}
                          onChange={(e) => setMultiPaymentNotes(e.target.value)}
                          placeholder="Optional payment notes"
                          rows={2}
                        />
                      </div>

                      <input
                        type="hidden"
                        name="includePayment"
                        value={selectedDates.length > 0 ? "true" : "false"}
                      />
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton
                  pendingText="Creating..."
                  disabled={selectedDates.length === 0}
                >
                  Create {selectedDates.length} Session{selectedDates.length !== 1 ? "s" : ""}
                </SubmitButton>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
