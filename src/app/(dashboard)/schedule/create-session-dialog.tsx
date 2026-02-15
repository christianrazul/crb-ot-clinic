"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { UserRole } from "@prisma/client";
import { Plus } from "lucide-react";
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
import { createSession, createRecurringSessions, ActionState } from "@/actions/sessions";
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
}

const initialState: ActionState = {};

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

const daysOfWeek = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export function CreateSessionDialog({
  clinics,
  clients,
  therapists,
  defaultDate,
}: CreateSessionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [singleState, singleFormAction] = useFormState(
    createSession,
    initialState
  );
  const [recurringState, recurringFormAction] = useFormState(
    createRecurringSessions,
    initialState
  );

  useEffect(() => {
    if (singleState.success || recurringState.success) {
      setOpen(false);
      setSelectedClinic("");
      setSelectedClient("");
    }
  }, [singleState.success, recurringState.success]);

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Session</DialogTitle>
          <DialogDescription>
            Create a single session or set up recurring sessions.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">Single Session</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
          </TabsList>

          <TabsContent value="single">
            <form action={singleFormAction}>
              <div className="grid gap-4 py-4">
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
                    defaultValue={suggestedTherapist || undefined}
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

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton pendingText="Scheduling...">Schedule</SubmitButton>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="recurring">
            <form action={recurringFormAction}>
              <div className="grid gap-4 py-4">
                {recurringState.error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {recurringState.error}
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
                    defaultValue={suggestedTherapist || undefined}
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
                    <Label htmlFor="dayOfWeek">Day of Week</Label>
                    <Select name="dayOfWeek" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day.value} value={day.value}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      defaultValue={defaultDate}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      required
                    />
                  </div>
                </div>

                <input type="hidden" name="durationMinutes" value="60" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <SubmitButton pendingText="Creating...">Create Recurring Sessions</SubmitButton>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
