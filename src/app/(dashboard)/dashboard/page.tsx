import { auth } from "@/lib/auth/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { hasPermission, isTherapist } from "@/lib/auth/permissions";
import { getDailyRevenue } from "@/actions/payments";
import { getExpectedIncomeToday } from "@/actions/attendance";
import { getSecretaryDailyReport, getTherapistDailyReport, getOwnerDailyReport } from "@/actions/sessions";
import { DashboardClinicSelector } from "./clinic-selector";
import { format } from "date-fns";
import { Calendar, ClipboardList, DollarSign } from "lucide-react";
import { DailyReportCard } from "@/components/dashboard/daily-report-card";
import { SecretaryDailyReportCard } from "@/components/dashboard/secretary-daily-report-card";
import { OwnerDailyReportCard } from "@/components/dashboard/owner-daily-report-card";

interface DashboardPageProps {
  searchParams: Promise<{ clinicId?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const user = session?.user;
  const params = await searchParams;

  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const canViewAll = hasPermission(user.role, "view_all_sessions");
  const isTherapistUser = isTherapist(user.role);
  const isSecretaryUser = user.role === "secretary";
  const isOwnerUser = user.role === "owner";

  const canViewFinancials = hasPermission(user.role, "view_financial_reports");

  const clinics = await db.clinic.findMany({
    where: {
      isActive: true,
      ...(user.primaryClinicId && { id: user.primaryClinicId }),
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  if (clinics.length === 0) return null;

  const canUseAllClinics = canViewAll && !user.primaryClinicId;
  const selectedClinic = clinics.find((clinic) => clinic.id === params.clinicId);
  const selectedClinicId = selectedClinic?.id || (canUseAllClinics ? undefined : user.primaryClinicId || clinics[0].id);

  const [
    todaySessions,
    attendanceRecordsToday,
    dailyRevenueResult,
    expectedIncomeResult,
    therapistDailyReportResult,
    secretaryDailyReportResult,
    ownerDailyReportResult,
  ] = await Promise.all([
    db.session.count({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { not: "cancelled" },
        ...(isTherapistUser && { therapistId: user.id }),
        ...(canViewAll && selectedClinicId && { clinicId: selectedClinicId }),
      },
    }),
    db.attendanceLog.count({
      where: {
        loggedAt: {
          gte: today,
          lt: tomorrow,
        },
        ...(isTherapistUser && { primaryTherapistId: user.id }),
        ...(canViewAll && selectedClinicId && { clinicId: selectedClinicId }),
      },
    }),
    canViewFinancials ? getDailyRevenue(new Date(), selectedClinicId) : { data: 0 },
    canViewFinancials ? getExpectedIncomeToday(selectedClinicId) : { data: 0 },
    isTherapistUser ? getTherapistDailyReport(selectedClinicId) : { data: undefined },
    isSecretaryUser ? getSecretaryDailyReport(selectedClinicId) : { data: undefined },
    isOwnerUser ? getOwnerDailyReport(selectedClinicId) : { data: undefined },
  ]);

  const dailyRevenue = dailyRevenueResult.data || 0;
  const expectedIncomeToday = expectedIncomeResult.data || 0;
  const hasTherapistDailyReportError =
    "error" in therapistDailyReportResult && Boolean(therapistDailyReportResult.error);
  const hasSecretaryDailyReportError =
    "error" in secretaryDailyReportResult && Boolean(secretaryDailyReportResult.error);
  const hasOwnerDailyReportError =
    "error" in ownerDailyReportResult && Boolean(ownerDailyReportResult.error);
  const therapistDailyReport = isTherapistUser && !hasTherapistDailyReportError
    ? therapistDailyReportResult.data
    : undefined;
  const secretaryDailyReport = isSecretaryUser && !hasSecretaryDailyReportError
    ? secretaryDailyReportResult.data
    : undefined;
  const ownerDailyReport = isOwnerUser && !hasOwnerDailyReportError
    ? ownerDailyReportResult.data
    : undefined;

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
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
          <DashboardClinicSelector
            clinics={clinics}
            selectedClinicId={selectedClinicId}
            allowAllClinics={canUseAllClinics}
          />
        </div>
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

      {(isTherapistUser || isSecretaryUser || isOwnerUser) && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Daily Report</h3>
          {isTherapistUser && therapistDailyReport ? (
            <DailyReportCard report={therapistDailyReport} />
          ) : isSecretaryUser && secretaryDailyReport ? (
            <SecretaryDailyReportCard report={secretaryDailyReport} />
          ) : isOwnerUser && ownerDailyReport ? (
            <OwnerDailyReportCard report={ownerDailyReport} />
          ) : (
            <Card>
              <CardHeader>
                <CardDescription>
                  Unable to load report for today.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}
