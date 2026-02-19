"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionStatus, UserRole } from "@prisma/client";
import {
  format,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SessionDetailsDialog, SessionWithDetails } from "@/components/sessions/session-details-dialog";

interface Session {
  id: string;
  scheduledDate: Date;
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
  weekStart: Date;
  weekEnd: Date;
  currentUserId: string;
  currentUserRole: UserRole | string;
}

const statusColors: Record<SessionStatus, string> = {
  scheduled: "bg-blue-100 border-blue-300 text-blue-800",
  in_progress: "bg-purple-100 border-purple-300 text-purple-800",
  completed: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-red-100 border-red-300 text-red-800",
  no_show: "bg-yellow-100 border-yellow-300 text-yellow-800",
};

const statusBadgeColors: Record<SessionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "default",
  in_progress: "default",
  completed: "secondary",
  cancelled: "destructive",
  no_show: "outline",
};

export function MyScheduleView({
  sessions,
  selectedDate,
  weekStart,
  weekEnd,
  currentUserId,
  currentUserRole,
}: MyScheduleViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedSession, setSelectedSession] = useState<SessionWithDetails | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function handleSessionClick(session: Session) {
    const sessionWithDetails: SessionWithDetails = {
      id: session.id,
      scheduledDate: session.scheduledDate,
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

  function navigateToWeek(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/my-schedule?${params.toString()}`);
  }

  function goToPreviousWeek() {
    navigateToWeek(subWeeks(selectedDate, 1));
  }

  function goToNextWeek() {
    navigateToWeek(addWeeks(selectedDate, 1));
  }

  function goToThisWeek() {
    navigateToWeek(new Date());
  }

  function getSessionsForDay(day: Date): Session[] {
    return sessions.filter((s) => isSameDay(new Date(s.scheduledDate), day));
  }

  const todaySessions = sessions.filter((s) =>
    isSameDay(new Date(s.scheduledDate), new Date())
  );

  const upcomingSessions = sessions.filter(
    (s) =>
      s.status === "scheduled" &&
      new Date(s.scheduledDate) >= new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToThisWeek}>
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {upcomingSessions.length} upcoming session{upcomingSessions.length !== 1 ? "s" : ""}
        </div>
      </div>

      {todaySessions.length > 0 && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Today&apos;s Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todaySessions
                .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                .map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-4 cursor-pointer transition-shadow hover:shadow-md",
                      statusColors[session.status]
                    )}
                    onClick={() => handleSessionClick(session)}
                  >
                    <div>
                      <div className="font-medium">
                        {session.client.firstName} {session.client.lastName}
                      </div>
                      <div className="text-sm">
                        {session.scheduledTime} at {session.clinic.code}
                      </div>
                    </div>
                    <Badge variant={statusBadgeColors[session.status]}>
                      {session.status === "in_progress" ? "In Progress" : session.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Week View</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {daysOfWeek.map((day) => {
              const daySessions = getSessionsForDay(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[120px] rounded-lg border p-2",
                    isCurrentDay && "border-primary bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "mb-2 text-center text-sm font-medium",
                      isCurrentDay && "text-primary"
                    )}
                  >
                    <div>{format(day, "EEE")}</div>
                    <div className="text-lg">{format(day, "d")}</div>
                  </div>
                  <div className="space-y-1">
                    {daySessions
                      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                      .map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "rounded px-1 py-0.5 text-xs cursor-pointer transition-shadow hover:shadow-md",
                            statusColors[session.status]
                          )}
                          onClick={() => handleSessionClick(session)}
                        >
                          <div className="font-medium">{session.scheduledTime}</div>
                          <div className="truncate">
                            {session.client.firstName} {session.client.lastName[0]}.
                          </div>
                        </div>
                      ))}
                    {daySessions.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground">
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
