"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { roleLabels } from "@/lib/auth/permissions";
import { formatTime12hr, cn } from "@/lib/utils";
import {
  getTherapistPayoutReport,
  TherapistPayoutSummary,
} from "@/actions/payments";

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface TherapistPayoutViewProps {
  clinics: Clinic[];
  selectedClinic?: string;
  initialStartDate?: string;
  initialEndDate?: string;
}

type DatePreset = "this_week" | "this_month" | "last_month" | "custom";

export function TherapistPayoutView({
  clinics,
  selectedClinic,
  initialStartDate,
  initialEndDate,
}: TherapistPayoutViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TherapistPayoutSummary[]>([]);
  const [expandedTherapists, setExpandedTherapists] = useState<Set<string>>(new Set());

  const now = new Date();
  const defaultStart = startOfMonth(now);
  const defaultEnd = endOfMonth(now);

  const [startDate, setStartDate] = useState<Date>(
    initialStartDate ? new Date(initialStartDate) : defaultStart
  );
  const [endDate, setEndDate] = useState<Date>(
    initialEndDate ? new Date(initialEndDate) : defaultEnd
  );
  const [datePreset, setDatePreset] = useState<DatePreset>("this_month");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await getTherapistPayoutReport(startDate, endDate, selectedClinic);
      if (result.data) {
        setData(result.data);
      }
      setLoading(false);
    }

    loadData();
  }, [startDate, endDate, selectedClinic]);

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clinicId && clinicId !== "all") {
      params.set("clinic", clinicId);
    } else {
      params.delete("clinic");
    }
    params.set("start", format(startDate, "yyyy-MM-dd"));
    params.set("end", format(endDate, "yyyy-MM-dd"));
    router.push(`/reports/therapist-payouts?${params.toString()}`);
  }

  function handlePresetChange(preset: DatePreset) {
    setDatePreset(preset);
    let newStart: Date;
    let newEnd: Date;

    switch (preset) {
      case "this_week":
        newStart = startOfWeek(now, { weekStartsOn: 1 });
        newEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "this_month":
        newStart = startOfMonth(now);
        newEnd = endOfMonth(now);
        break;
      case "last_month":
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        newStart = startOfMonth(lastMonth);
        newEnd = endOfMonth(lastMonth);
        break;
      case "custom":
        return;
      default:
        return;
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    updateUrlParams(newStart, newEnd);
  }

  function updateUrlParams(start: Date, end: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("start", format(start, "yyyy-MM-dd"));
    params.set("end", format(end, "yyyy-MM-dd"));
    router.push(`/reports/therapist-payouts?${params.toString()}`);
  }

  function handleStartDateSelect(date: Date | undefined) {
    if (date) {
      setStartDate(date);
      setDatePreset("custom");
      updateUrlParams(date, endDate);
    }
  }

  function handleEndDateSelect(date: Date | undefined) {
    if (date) {
      setEndDate(date);
      setDatePreset("custom");
      updateUrlParams(startDate, date);
    }
  }

  function toggleTherapist(therapistId: string) {
    setExpandedTherapists((prev) => {
      const next = new Set(prev);
      if (next.has(therapistId)) {
        next.delete(therapistId);
      } else {
        next.add(therapistId);
      }
      return next;
    });
  }

  const totalOwed = data.reduce((sum, t) => sum + t.totalOwed, 0);
  const totalPaid = data.reduce((sum, t) => sum + t.totalPaid, 0);
  const totalSessions = data.reduce((sum, t) => sum + t.sessionsCompleted, 0);
  const totalSessionsPaid = data.reduce((sum, t) => sum + t.sessionsPaid, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={selectedClinic || "all"}
          onValueChange={handleClinicChange}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Clinics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clinics</SelectItem>
            {clinics.map((clinic) => (
              <SelectItem key={clinic.id} value={clinic.id}>
                {clinic.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={datePreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_week">This Week</SelectItem>
            <SelectItem value="this_month">This Month</SelectItem>
            <SelectItem value="last_month">Last Month</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={startDate} onSelect={handleStartDateSelect} />
          </PopoverContent>
        </Popover>

        <span className="text-muted-foreground">to</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "MMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={endDate} onSelect={handleEndDateSelect} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Sessions</div>
          <div className="text-2xl font-bold">{totalSessions}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Sessions Paid</div>
          <div className="text-2xl font-bold">{totalSessionsPaid}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Owed</div>
          <div className="text-2xl font-bold">P{totalOwed.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Paid</div>
          <div className="text-2xl font-bold">P{totalPaid.toLocaleString()}</div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Therapist</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Total Owed</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No completed sessions in this period
                </TableCell>
              </TableRow>
            ) : (
              data.map((therapist) => (
                <>
                  <TableRow
                    key={therapist.therapistId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleTherapist(therapist.therapistId)}
                  >
                    <TableCell>
                      {expandedTherapists.has(therapist.therapistId) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{therapist.therapistName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[therapist.therapistRole]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{therapist.sessionsCompleted}</TableCell>
                    <TableCell className="text-right">{therapist.sessionsPaid}</TableCell>
                    <TableCell className="text-right">P{therapist.totalOwed.toLocaleString()}</TableCell>
                    <TableCell className="text-right">P{therapist.totalPaid.toLocaleString()}</TableCell>
                  </TableRow>
                  {expandedTherapists.has(therapist.therapistId) && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Client</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {therapist.sessions.map((session) => (
                                <TableRow key={session.id}>
                                  <TableCell>
                                    {format(new Date(session.scheduledDate), "MMM d, yyyy")}
                                  </TableCell>
                                  <TableCell>{formatTime12hr(session.scheduledTime)}</TableCell>
                                  <TableCell>{session.clientName}</TableCell>
                                  <TableCell>
                                    {session.isPaid ? (
                                      <Badge className="bg-green-100 text-green-800">Paid</Badge>
                                    ) : (
                                      <Badge variant="outline">Unpaid</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    P{session.amount.toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
