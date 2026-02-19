"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logAttendance, ActionState } from "@/actions/attendance";

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
  guardianName: string;
  guardianRelation: string | null;
  primaryTherapistId: string | null;
  primaryTherapist: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface LogAttendanceDialogProps {
  clients: Client[];
  clinics: Clinic[];
  userClinicId: string | null;
}

const initialState: ActionState = {};

export function LogAttendanceDialog({
  clients,
  clinics,
  userClinicId,
}: LogAttendanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>(userClinicId || "");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [guardianName, setGuardianName] = useState<string>("");
  const [guardianRelation, setGuardianRelation] = useState<string>("");
  const [primaryTherapistId, setPrimaryTherapistId] = useState<string>("");
  const [state, formAction] = useFormState(logAttendance, initialState);

  const filteredClients = clients.filter(
    (c) => !selectedClinic || c.mainClinicId === selectedClinic
  );

  const selectedClientData = clients.find((c) => c.id === selectedClient);

  useEffect(() => {
    if (selectedClientData) {
      setGuardianName(selectedClientData.guardianName || "");
      setGuardianRelation(selectedClientData.guardianRelation || "");
      setPrimaryTherapistId(selectedClientData.primaryTherapistId || "");
    }
  }, [selectedClientData]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setSelectedClient("");
      setGuardianName("");
      setGuardianRelation("");
      setPrimaryTherapistId("");
      if (!userClinicId) {
        setSelectedClinic("");
      }
    }
  }, [state.success, userClinicId]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedClient("");
      setGuardianName("");
      setGuardianRelation("");
      setPrimaryTherapistId("");
      if (!userClinicId) {
        setSelectedClinic("");
      }
    }
  };

  const showClinicSelect = !userClinicId && clinics.length > 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Log Attendance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Client Attendance</DialogTitle>
          <DialogDescription>
            Record a client&apos;s visit to the clinic.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="grid gap-4 py-4">
            {state.error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            {showClinicSelect && (
              <div className="space-y-2">
                <Label htmlFor="clinicId">Clinic</Label>
                <Select
                  name="clinicId"
                  value={selectedClinic}
                  onValueChange={(value) => {
                    setSelectedClinic(value);
                    setSelectedClient("");
                  }}
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
            )}

            {!showClinicSelect && userClinicId && (
              <input type="hidden" name="clinicId" value={userClinicId} />
            )}

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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input
                  id="guardianName"
                  name="guardianName"
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianRelation">Relationship</Label>
                <Input
                  id="guardianRelation"
                  name="guardianRelation"
                  value={guardianRelation}
                  onChange={(e) => setGuardianRelation(e.target.value)}
                  placeholder="e.g., Mother"
                />
              </div>
            </div>

            {selectedClientData?.primaryTherapist && (
              <div className="space-y-2">
                <Label>Primary Therapist</Label>
                <Input
                  value={`${selectedClientData.primaryTherapist.firstName} ${selectedClientData.primaryTherapist.lastName}`}
                  disabled
                  className="bg-muted"
                />
                <input
                  type="hidden"
                  name="primaryTherapistId"
                  value={primaryTherapistId}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Optional notes"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Logging...">Log Attendance</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
