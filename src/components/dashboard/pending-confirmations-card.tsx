"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRole } from "@prisma/client";
import { format } from "date-fns";
import { Check, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { roleLabels } from "@/lib/auth/permissions";
import { formatTime12hr } from "@/lib/utils";
import { confirmSessionStart } from "@/actions/sessions";

interface PendingSession {
  id: string;
  scheduledDate: Date;
  scheduledTime: string;
  startedAt: Date | null;
  clinic: { id: string; name: string; code: string };
  client: { id: string; firstName: string; lastName: string };
  therapist: { id: string; firstName: string; lastName: string; role: UserRole };
  startedBy: { id: string; firstName: string; lastName: string } | null;
}

interface PendingConfirmationsCardProps {
  sessions: PendingSession[];
}

export function PendingConfirmationsCard({ sessions }: PendingConfirmationsCardProps) {
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  async function handleConfirm(sessionId: string) {
    setConfirmingIds((prev) => new Set(prev).add(sessionId));
    const result = await confirmSessionStart(sessionId);
    setConfirmingIds((prev) => {
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
    if (result.success) {
      setConfirmedIds((prev) => new Set(prev).add(sessionId));
    }
  }

  const visibleSessions = sessions.filter((s) => !confirmedIds.has(s.id));
  const displaySessions = visibleSessions.slice(0, 5);
  const hasMore = visibleSessions.length > 5;

  if (sessions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Pending Confirmations
        </CardTitle>
        <Badge variant="secondary" className="h-6">
          {visibleSessions.length}
        </Badge>
      </CardHeader>
      <CardContent>
        {visibleSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All sessions confirmed
          </p>
        ) : (
          <div className="space-y-3">
            {displaySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {session.client.firstName} {session.client.lastName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {session.clinic.code}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {format(new Date(session.scheduledDate), "MMM d")} at{" "}
                      {formatTime12hr(session.scheduledTime)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.therapist.firstName} {session.therapist.lastName} ({roleLabels[session.therapist.role]})
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleConfirm(session.id)}
                  disabled={confirmingIds.has(session.id)}
                >
                  {confirmingIds.has(session.id) ? (
                    "..."
                  ) : (
                    <>
                      <Check className="mr-1 h-3 w-3" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            ))}

            {hasMore && (
              <Link href="/confirmations">
                <Button variant="ghost" className="w-full" size="sm">
                  View All ({visibleSessions.length})
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
