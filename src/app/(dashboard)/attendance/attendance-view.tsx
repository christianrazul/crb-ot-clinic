"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AttendanceTable } from "./attendance-table";
import { LogAttendanceDialog } from "./log-attendance-dialog";

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
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  primaryTherapist: { id: string; firstName: string; lastName: string } | null;
  loggedBy: { id: string; firstName: string; lastName: string };
}

interface AttendanceViewProps {
  logs: AttendanceLog[];
  clients: Client[];
  clinics: Clinic[];
  userClinicId: string | null;
}

const dateFilterOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export function AttendanceView({ logs, clients, clinics, userClinicId }: AttendanceViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentClinic = searchParams.get("clinic") || "";
  const currentDate = searchParams.get("date") || "today";

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all-clinics") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/attendance?${params.toString()}`);
  };

  const showClinicFilter = !userClinicId && clinics.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showClinicFilter && (
            <Select
              value={currentClinic || "all-clinics"}
              onValueChange={(value) => updateFilters("clinic", value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Clinics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-clinics">All Clinics</SelectItem>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            value={currentDate}
            onValueChange={(value) => updateFilters("date", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Today" />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <LogAttendanceDialog
          clients={clients}
          clinics={clinics}
          userClinicId={userClinicId}
        />
      </div>

      <AttendanceTable logs={logs} />
    </div>
  );
}
