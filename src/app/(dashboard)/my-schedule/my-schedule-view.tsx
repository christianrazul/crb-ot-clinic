"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionStatus, UserRole } from "@prisma/client";
import { format, addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatTime12hr } from "@/lib/utils";
import { SessionDetailsDialog, SessionWithDetails } from "@/components/sessions/session-details-dialog";

type ViewMode = "daily" | "weekly";

interface Session {
  id: string;
  scheduledDate?: Date;
  scheduledTime: string;
  durationMinutes?: number;
  status: SessionStatus;
  startedAt?: Date | null;
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  therapist: { id: string; firstName: string; lastName: string; role: UserRole };
}

interface MyScheduleViewProps {
  sessions: Session[];
  selectedDate: Date;
  currentUserId: string;
  currentUserRole: UserRole | string;
  viewMode: ViewMode;
}

const statusColors: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-800",
  in_progress: "bg-purple-100 border-purple-300 text-purple-800",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-red-100 border-red-300 text-red-800",
  no_show: "bg-yellow-100 border-yellow-300 text-yellow-800",
};

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

export function MyScheduleView({
  sessions,
  selectedDate,
  currentUserId,
  currentUserRole,
  viewMode,
}: MyScheduleViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleSessionClick(session: Session) {
    const sessionWithDetails: SessionWithDetails = {
      id: session.id,
      scheduledDate: session.scheduledDate || selectedDate,
      scheduledTime: session.scheduledTime,
      durationMinutes: session.durationMinutes || 60,
      status: session.status,
      startedAt: session.startedAt || null,
      clinic: session.clinic,
      client: session.client,
      therapist: session.therapist,
    };
    setSelectedSession(sessionWithDetails);
    setDialogOpen(true);
  }

  function navigateToDate(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/my-schedule?${params.toString()}`);
  }

  function handleViewModeChange(mode: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", mode);
    router.push(`/my-schedule?${params.toString()}`);
  }

  function goToPrevious() {
    const offset = viewMode === "weekly" ? 7 : 1;
    navigateToDate(subDays(selectedDate, offset));
  }

  function goToNext() {
    const offset = viewMode === "weekly" ? 7 : 1;
    navigateToDate(addDays(selectedDate, offset));
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

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function getSessionsForDay(day: Date) {
    return sessions.filter((s) => {
      if (!s.scheduledDate) return false;
      return isSameDay(new Date(s.scheduledDate), day);
    }).sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {viewMode === "weekly"
                  ? `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
                  : format(selectedDate, "MMM d, yyyy")}
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

          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="ghost" onClick={goToToday}>
            Today
          </Button>

          <Select value={viewMode} onValueChange={handleViewModeChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""}{" "}
          {viewMode === "weekly" ? "this week" : "today"}
        </div>
      </div>

      {viewMode === "daily" ? (
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
                    <div className="w-20 flex-shrink-0 text-sm font-medium text-muted-foreground pt-2">
                      {formatTime12hr(time)}
                    </div>
                    <div className="flex-1">
                      {timeSessions.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {timeSessions.map((s) => (
                            <div
                              key={s.id}
                              className={cn(
                                "rounded-lg border p-3 cursor-pointer transition-shadow hover:shadow-md",
                                statusColors[s.status]
                              )}
                              onClick={() => handleSessionClick(s)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {s.client.firstName} {s.client.lastName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {s.clinic.code}
                                </Badge>
                              </div>
                              <div className="mt-1 text-xs opacity-75">
                                {s.status === "in_progress" ? "In Progress" : s.status}
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const daySessions = getSessionsForDay(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="min-h-[120px]">
                    <div
                      className={cn(
                        "text-center text-sm font-medium pb-2 mb-2 border-b",
                        isToday && "text-blue-600"
                      )}
                    >
                      <div>{format(day, "EEE")}</div>
                      <div className={cn(
                        "text-lg",
                        isToday && "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                      )}>
                        {format(day, "d")}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {daySessions.length > 0 ? (
                        daySessions.map((s) => (
                          <div
                            key={s.id}
                            className={cn(
                              "rounded border p-1.5 cursor-pointer transition-shadow hover:shadow-md text-xs",
                              statusColors[s.status]
                            )}
                            onClick={() => handleSessionClick(s)}
                          >
                            <div className="font-medium truncate">
                              {s.client.firstName} {s.client.lastName}
                            </div>
                            <div className="opacity-75">
                              {formatTime12hr(s.scheduledTime)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground text-center py-4">
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
      )}

      <SessionDetailsDialog
        session={selectedSession}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
