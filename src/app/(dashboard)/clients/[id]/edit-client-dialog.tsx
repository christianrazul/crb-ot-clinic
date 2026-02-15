"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { ClientStatus, UserRole } from "@prisma/client";
import { Pencil } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateClient, ActionState } from "@/actions/clients";
import { roleLabels } from "@/lib/auth/permissions";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  diagnosis: string | null;
  guardianName: string;
  guardianPhone: string | null;
  guardianEmail: string | null;
  guardianRelation: string | null;
  status: ClientStatus;
  notes: string | null;
  mainClinicId: string;
  primaryTherapistId: string | null;
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  primaryClinicId: string | null;
}

interface EditClientDialogProps {
  client: Client;
  clinics: Clinic[];
  therapists: Therapist[];
}

const initialState: ActionState = {};

const statusLabels: Record<ClientStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  discharged: "Discharged",
};

export function EditClientDialog({ client, clinics, therapists }: EditClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState(client.mainClinicId);
  const [state, formAction] = useFormState(updateClient, initialState);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state.success]);

  const filteredTherapists = therapists.filter(
    (t) => !selectedClinic || t.primaryClinicId === selectedClinic
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client</DialogTitle>
          <DialogDescription>
            Update client information.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="id" value={client.id} />
          <div className="grid gap-4 py-4">
            {state.error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mainClinicId">Main Clinic</Label>
                <Select
                  name="mainClinicId"
                  value={selectedClinic}
                  onValueChange={setSelectedClinic}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={client.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={client.firstName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={client.lastName}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={
                    client.dateOfBirth
                      ? format(new Date(client.dateOfBirth), "yyyy-MM-dd")
                      : ""
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Input
                  id="diagnosis"
                  name="diagnosis"
                  defaultValue={client.diagnosis || ""}
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-3 font-medium">Guardian Information</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardianName">Guardian Name</Label>
                    <Input
                      id="guardianName"
                      name="guardianName"
                      defaultValue={client.guardianName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianRelation">Relationship</Label>
                    <Input
                      id="guardianRelation"
                      name="guardianRelation"
                      defaultValue={client.guardianRelation || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardianPhone">Phone Number</Label>
                    <Input
                      id="guardianPhone"
                      name="guardianPhone"
                      type="tel"
                      defaultValue={client.guardianPhone || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianEmail">Email</Label>
                    <Input
                      id="guardianEmail"
                      name="guardianEmail"
                      type="email"
                      defaultValue={client.guardianEmail || ""}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-3 font-medium">Therapy Assignment</h4>
              <div className="space-y-2">
                <Label htmlFor="primaryTherapistId">Primary Therapist</Label>
                <Select
                  name="primaryTherapistId"
                  defaultValue={client.primaryTherapistId || undefined}
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={client.notes || ""}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Saving...">Save Changes</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
