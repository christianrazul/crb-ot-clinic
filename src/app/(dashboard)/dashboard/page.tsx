import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { hasPermission, isTherapist } from "@/lib/auth/permissions";
import { format } from "date-fns";
import { Calendar, Users, ClipboardList, DollarSign } from "lucide-react";
import { PendingConfirmationsCard } from "@/components/dashboard/pending-confirmations-card";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const canViewAll = hasPermission(user.role, "view_all_sessions");
  const isTherapistUser = isTherapist(user.role);

  const canVerify = hasPermission(user.role, "verify_sessions");

  const [todaySessions, activeClients, pendingConfirmations] = await Promise.all([
    db.session.count({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: "scheduled",
        ...(isTherapistUser && { therapistId: user.id }),
        ...(canViewAll && user.primaryClinicId && { clinicId: user.primaryClinicId }),
      },
    }),
    canViewAll
      ? db.client.count({
          where: {
            status: "active",
            ...(user.primaryClinicId && { mainClinicId: user.primaryClinicId }),
          },
        })
      : 0,
    canVerify
      ? db.session.findMany({
          where: {
            status: "in_progress",
            startedAt: { not: null },
            verifiedAt: null,
            ...(user.primaryClinicId && { clinicId: user.primaryClinicId }),
          },
          include: {
            clinic: { select: { id: true, name: true, code: true } },
            client: { select: { id: true, firstName: true, lastName: true } },
            therapist: { select: { id: true, firstName: true, lastName: true, role: true } },
            startedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { startedAt: "asc" },
        })
      : [],
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Welcome back, {user.name?.split(" ")[0]}
        </h2>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Sessions
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaySessions}</div>
            <p className="text-xs text-muted-foreground">
              {isTherapistUser ? "your scheduled sessions" : "scheduled sessions"}
            </p>
          </CardContent>
        </Card>

        {canViewAll && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Clients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeClients}</div>
                <p className="text-xs text-muted-foreground">
                  enrolled clients
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Confirmations
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingConfirmations.length}</div>
                <p className="text-xs text-muted-foreground">
                  sessions to confirm
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {hasPermission(user.role, "view_financial_reports") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                will show after Phase 3
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {canVerify && pendingConfirmations.length > 0 && (
        <PendingConfirmationsCard sessions={pendingConfirmations} />
      )}

      {isTherapistUser && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Access your most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View your schedule in &quot;My Schedule&quot; to see your upcoming sessions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
