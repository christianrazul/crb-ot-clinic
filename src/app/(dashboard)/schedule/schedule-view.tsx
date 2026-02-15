"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SessionStatus, UserRole } from "@prisma/client";
import { format, addDays, subDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { roleLabels } from "@/lib/auth/permissions";

interface Session {
  id: string;
  scheduledTime: string;
  status: SessionStatus;
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  therapist: { id: string; firstName: string; lastName: string; role: UserRole };
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface ScheduleViewProps {
  sessions: Session[];
  clinics: Clinic[];
  selectedDate: Date;
  selectedClinic?: string;
}

const statusColors: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-800",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-red-100 border-red-300 text-red-800",
  no_show: "bg-yellow-100 border-yellow-300 text-yellow-800",
};

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export function ScheduleView({
  sessions,
  clinics,
  selectedDate,
  selectedClinic,
}: ScheduleViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigateToDate(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/schedule?${params.toString()}`);
  }

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clinicId && clinicId !== "all") {
      params.set("clinic", clinicId);
    } else {
      params.delete("clinic");
    }
    router.push(`/schedule?${params.toString()}`);
  }

  function goToPreviousDay() {
    navigateToDate(subDays(selectedDate, 1));
  }

  function goToNextDay() {
    navigateToDate(addDays(selectedDate, 1));
  }

  function goToToday() {
    navigateToDate(new Date());
  }

  const sessionsByTime: Record<string, Session[]> = {};
  for (const s of sessions) {
    const time = s.scheduledTime;
    if (!sessionsByTime[time]) {
      sessionsByTime[time] = [];
    }
    sessionsByTime[time].push(s);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && navigateToDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="ghost" onClick={goToToday}>
            Today
          </Button>
        </div>

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeSlots.map((time) => {
              const timeSessions = sessionsByTime[time] || [];
              return (
                <div key={time} className="flex gap-4">
                  <div className="w-16 flex-shrink-0 text-sm font-medium text-muted-foreground pt-2">
                    {time}
                  </div>
                  <div className="flex-1">
                    {timeSessions.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {timeSessions.map((s) => (
                          <div
                            key={s.id}
                            className={cn(
                              "rounded-lg border p-3",
                              statusColors[s.status]
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {s.client.firstName} {s.client.lastName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {s.clinic.code}
                              </Badge>
                            </div>
                            <div className="mt-1 text-sm">
                              {s.therapist.firstName} {s.therapist.lastName}
                            </div>
                            <div className="mt-1 text-xs opacity-75">
                              {roleLabels[s.therapist.role]}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-12 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                        No sessions
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No sessions scheduled for this day
        </div>
      )}
    </div>
  );
}
