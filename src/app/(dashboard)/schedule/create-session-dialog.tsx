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
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createSession, createMultipleSessions, ActionState } from "@/actions/sessions";
import { roleLabels } from "@/lib/auth/permissions";
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

  // Multiple sessions state
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const resetForm = useCallback(() => {
    setSelectedClinic("");
    setSelectedClient("");
    setSelectedTherapist("");
    setSelectedDates([]);
  }, []);

  useEffect(() => {
    if (singleState.success || multipleState.success) {
      setOpen(false);
      resetForm();
    }
  }, [singleState.success, multipleState.success, resetForm]);

  const filteredClients = clients.filter(
    (c) => !selectedClinic || c.mainClinicId === selectedClinic
  );

  const filteredTherapists = therapists.filter(
    (t) => !selectedClinic || t.primaryClinicId === selectedClinic
  );

  const selectedClientData = clients.find((c) => c.id === selectedClient);
  const suggestedTherapist = selectedClientData?.primaryTherapistId;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
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
                <div className="py-4 space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor="sessionType">Session Type</Label>
                      <Select name="sessionType" defaultValue="regular">
                        <SelectTrigger>
                          <SelectValue placeholder="Select session type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular Session</SelectItem>
                          <SelectItem value="ot_evaluation">OT Evaluation</SelectItem>
                          <SelectItem value="make_up">Make Up Session</SelectItem>
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

                  <input type="hidden" name="advancePaymentId" value="" />
                  <input type="hidden" name="includePayment" value="false" />
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
                <div className="py-4 space-y-4">
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
                      <Label htmlFor="sessionType">Session Type</Label>
                      <Select name="sessionType" defaultValue="regular">
                        <SelectTrigger>
                          <SelectValue placeholder="Select session type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular Session</SelectItem>
                          <SelectItem value="ot_evaluation">OT Evaluation</SelectItem>
                          <SelectItem value="make_up">Make Up Session</SelectItem>
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

                  <input type="hidden" name="includePayment" value="false" />
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
