import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getAttendanceLogs, getClientsForAttendance } from "@/actions/attendance";
import { getClinics } from "@/actions/users";
import { AttendanceView } from "./attendance-view";

interface PageProps {
  searchParams: Promise<{ clinic?: string; date?: string }>;
}

export default async function AttendancePage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "manage_attendance")) {
    redirect("/dashboard");
  }

  const dateFilter = (params.date as "today" | "week" | "month" | "all") || "today";

  const [logsResult, clients, clinics] = await Promise.all([
    getAttendanceLogs(params.clinic, dateFilter),
    getClientsForAttendance(params.clinic),
    getClinics(),
  ]);

  if (logsResult.error) {
    return <div>Error: {logsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Attendance</h2>
          <p className="text-muted-foreground">
            Log and track client attendance
          </p>
        </div>
      </div>

      <AttendanceView
        logs={logsResult.data || []}
        clients={clients}
        clinics={clinics}
        userClinicId={session.user.primaryClinicId}
      />
    </div>
  );
}
