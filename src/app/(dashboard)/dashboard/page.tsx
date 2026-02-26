import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { hasPermission, isTherapist } from "@/lib/auth/permissions";
import { getDailyRevenue } from "@/actions/payments";
import { getExpectedIncomeToday } from "@/actions/attendance";
import { format } from "date-fns";
import { Calendar, ClipboardList, DollarSign } from "lucide-react";
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
  const canViewFinancials = hasPermission(user.role, "view_financial_reports");

  const [todaySessions, attendanceRecordsToday, pendingConfirmations, dailyRevenueResult, expectedIncomeResult] = await Promise.all([
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
    db.attendanceLog.count({
      where: {
        loggedAt: {
          gte: today,
          lt: tomorrow,
        },
        ...(isTherapistUser && { primaryTherapistId: user.id }),
        ...(canViewAll && user.primaryClinicId && { clinicId: user.primaryClinicId }),
      },
    }),
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
    canViewFinancials ? getDailyRevenue(new Date()) : { data: 0 },
    canViewFinancials ? getExpectedIncomeToday() : { data: 0 },
  ]);

  const dailyRevenue = dailyRevenueResult.data || 0;
  const expectedIncomeToday = expectedIncomeResult.data || 0;

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  }

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

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sessions</h3>
          <div className="grid gap-4">
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
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Attendance</h3>
          <div className="grid gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Attendance Records Today
                </CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceRecordsToday}/{todaySessions}</div>
                <p className="text-xs text-muted-foreground">
                  recorded attendance / expected sessions
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>

      {(canViewAll || (canVerify && pendingConfirmations.length > 0)) && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Confirmations</h3>
          {canViewAll && (
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          )}
          {canVerify && pendingConfirmations.length > 0 && (
            <PendingConfirmationsCard sessions={pendingConfirmations} />
          )}
        </section>
      )}

      {canViewFinancials && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payments</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Today&apos;s Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dailyRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  collected today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Expected Income Today
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(expectedIncomeToday)}</div>
                <p className="text-xs text-muted-foreground">
                  collectible from today&apos;s attendance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
                <CardDescription>
                  Reports data is consolidated into dashboard for daily operations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>Collected today: {formatCurrency(dailyRevenue)}</p>
                <p>Expected income today: {formatCurrency(expectedIncomeToday)}</p>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
