"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient, ActionState } from "@/actions/clients";
import { roleLabels } from "@/lib/auth/permissions";

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

interface CreateClientDialogProps {
  clinics: Clinic[];
  therapists: Therapist[];
}

const initialState: ActionState = {};

export function CreateClientDialog({ clinics, therapists }: CreateClientDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<string>("");
  const [state, formAction] = useFormState(createClient, initialState);

  useEffect(() => {
    if (state.success && state.data) {
      setOpen(false);
      router.push(`/clients/${(state.data as { id: string }).id}`);
    }
  }, [state.success, state.data, router]);

  const filteredTherapists = therapists.filter(
    (t) => !selectedClinic || t.primaryClinicId === selectedClinic
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register New Client</DialogTitle>
          <DialogDescription>
            Enter client and guardian information to register a new client.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="grid gap-4 py-4">
            {state.error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mainClinicId">Main Clinic</Label>
              <Select
                name="mainClinicId"
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis">Diagnosis</Label>
                <Input id="diagnosis" name="diagnosis" placeholder="Optional" />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-3 font-medium">Guardian Information</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardianName">Guardian Name</Label>
                    <Input id="guardianName" name="guardianName" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianRelation">Relationship</Label>
                    <Input
                      id="guardianRelation"
                      name="guardianRelation"
                      placeholder="e.g., Mother, Father"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardianPhone">Phone Number</Label>
                    <Input id="guardianPhone" name="guardianPhone" type="tel" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianEmail">Email</Label>
                    <Input id="guardianEmail" name="guardianEmail" type="email" />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="mb-3 font-medium">Therapy Assignment</h4>
              <div className="space-y-2">
                <Label htmlFor="primaryTherapistId">Primary Therapist</Label>
                <Select name="primaryTherapistId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a therapist (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTherapists.map((therapist) => (
                      <SelectItem key={therapist.id} value={therapist.id}>
                        {therapist.firstName} {therapist.lastName} ({roleLabels[therapist.role]})
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
                placeholder="Additional notes about the client"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingText="Creating...">Create Client</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
