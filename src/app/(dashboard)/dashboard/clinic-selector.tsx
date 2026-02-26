"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClinicOption {
  id: string;
  name: string;
}

interface ClinicSelectorProps {
  clinics: ClinicOption[];
  selectedClinicId?: string;
  allowAllClinics?: boolean;
}

export function DashboardClinicSelector({
  clinics,
  selectedClinicId,
  allowAllClinics = false,
}: ClinicSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clinicId === "all") {
      params.delete("clinicId");
    } else {
      params.set("clinicId", clinicId);
    }
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <Select value={selectedClinicId || "all"} onValueChange={handleClinicChange}>
      <SelectTrigger className="w-[220px]" disabled={clinics.length <= 1}>
        <SelectValue placeholder="Select clinic" />
      </SelectTrigger>
      <SelectContent>
        {allowAllClinics && <SelectItem value="all">All Clinics</SelectItem>}
        {clinics.map((clinic) => (
          <SelectItem key={clinic.id} value={clinic.id}>
            {clinic.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}