"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useFormState } from "react-dom";
import { SessionType } from "@prisma/client";
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

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface RateRow {
  sessionType: SessionType;
  label: string;
  currentRate: number | null;
}

interface RatesViewProps {
  clinics: Clinic[];
  selectedClinicId: string;
  rows: RateRow[];
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function RatesView({ clinics, selectedClinicId, rows }: RatesViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction] = useFormState(upsertAllClientSessionRates, {});

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

      <form action={formAction}>
        <input type="hidden" name="clinicId" value={selectedClinicId} />
        <Card>
          <CardHeader>
            <CardTitle>Session Rates</CardTitle>
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
                {rows.map((row) => (
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

            {state.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            {state.success && (
              <p className="text-sm text-green-600">Rates saved successfully.</p>
            )}

            <div className="flex justify-start">
              <SubmitButton pendingText="Saving...">Save Changes</SubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
