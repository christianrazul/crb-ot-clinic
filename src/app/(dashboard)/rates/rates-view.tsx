"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { SessionType, UserRole } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { upsertAllClientSessionRates } from "@/actions/client-rates";
import { upsertAllStaffSessionRates } from "@/actions/session-rates";

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface ClientRateRow {
  sessionType: SessionType;
  label: string;
  currentRate: number | null;
}

interface StaffRateRow {
  role: UserRole;
  label: string;
  currentRate: number | null;
}

interface RatesViewProps {
  clinics: Clinic[];
  selectedClinicId: string;
  clientRows: ClientRateRow[];
  staffRows: StaffRateRow[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function RatesView({
  clinics,
  selectedClinicId,
  clientRows,
  staffRows,
}: RatesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clientState, clientFormAction] = useFormState(upsertAllClientSessionRates, {});
  const [staffState, staffFormAction] = useFormState(upsertAllStaffSessionRates, {});

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("clinicId", clinicId);
    router.push(`/rates?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {clinics.length > 1 && (
        <Select value={selectedClinicId} onValueChange={handleClinicChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select clinic" />
          </SelectTrigger>
          <SelectContent>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <form action={clientFormAction}>
        <input type="hidden" name="clinicId" value={selectedClinicId} />
        <Card>
          <CardHeader>
            <CardTitle>Clinic Session Rates</CardTitle>
            <CardDescription>
              Rates charged to clients per session type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Type</TableHead>
                  <TableHead>Current Rate</TableHead>
                  <TableHead>New Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientRows.map((row) => (
                  <TableRow key={row.sessionType}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      {row.currentRate !== null ? (
                        formatCurrency(row.currentRate)
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        name={`rate_${row.sessionType}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        defaultValue={row.currentRate ?? ""}
                        className="w-32"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {clientState.error && (
              <p className="text-sm text-destructive">{clientState.error}</p>
            )}
            {clientState.success && (
              <p className="text-sm text-green-600">Rates saved successfully.</p>
            )}

            <div className="flex justify-start">
              <SubmitButton pendingText="Saving...">Save Changes</SubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>

      <form action={staffFormAction}>
        <input type="hidden" name="clinicId" value={selectedClinicId} />
        <Card>
          <CardHeader>
            <CardTitle>Staff Session Rates</CardTitle>
            <CardDescription>
              Rates paid per session for therapist roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Therapist Role</TableHead>
                  <TableHead>Current Rate</TableHead>
                  <TableHead>New Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffRows.map((row) => (
                  <TableRow key={row.role}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell>
                      {row.currentRate !== null ? (
                        formatCurrency(row.currentRate)
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        name={`staff_rate_${row.role}`}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        defaultValue={row.currentRate ?? ""}
                        className="w-32"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {staffState.error && (
              <p className="text-sm text-destructive">{staffState.error}</p>
            )}
            {staffState.success && (
              <p className="text-sm text-green-600">Staff rates saved successfully.</p>
            )}

            <div className="flex justify-start">
              <SubmitButton pendingText="Saving...">Save Staff Rates</SubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
