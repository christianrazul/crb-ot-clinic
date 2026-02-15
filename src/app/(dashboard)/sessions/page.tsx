import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessionsInRange } from "@/actions/sessions";
import { getClinics } from "@/actions/users";
import { SessionsTable } from "./sessions-table";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{
    date?: string;
    clinic?: string;
    status?: string;
  }>;
}

export default async function SessionsPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_all_sessions")) {
    redirect("/dashboard");
  }

  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  const [sessionsResult, clinics] = await Promise.all([
    getSessionsInRange(monthStart, monthEnd, params.clinic),
    getClinics(),
  ]);

  if (sessionsResult.error) {
    return <div>Error: {sessionsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sessions</h2>
        <p className="text-muted-foreground">
          View and manage all therapy sessions
        </p>
      </div>

      <SessionsTable
        sessions={sessionsResult.data || []}
        clinics={clinics}
        selectedDate={selectedDate}
        selectedClinic={params.clinic}
        selectedStatus={params.status}
      />
    </div>
  );
}
