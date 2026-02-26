import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessions, getSessionsInRange, getClientsForScheduling } from "@/actions/sessions";
import { getClinics } from "@/actions/users";
import { getTherapists } from "@/actions/clients";
import { ScheduleView } from "./schedule-view";
import { CreateSessionDialog } from "./create-session-dialog";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";

type ViewMode = "daily" | "weekly";

interface PageProps {
  searchParams: Promise<{ date?: string; clinic?: string; view?: string }>;
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_all_sessions")) {
    redirect("/dashboard");
  }

  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const selectedClinic = params.clinic || undefined;
  const viewMode: ViewMode = params.view === "weekly" ? "weekly" : "daily";

  const sessionsResult = viewMode === "weekly"
    ? await getSessionsInRange(
        startOfWeek(selectedDate, { weekStartsOn: 1 }),
        endOfWeek(selectedDate, { weekStartsOn: 1 }),
        selectedClinic
      )
    : await getSessions(selectedDate, selectedClinic);

  const [clinics, clients, therapists] = await Promise.all([
    getClinics(),
    getClientsForScheduling(selectedClinic),
    getTherapists(selectedClinic),
  ]);

  if (sessionsResult.error) {
    return <div>Error: {sessionsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
          <p className="text-muted-foreground">
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <CreateSessionDialog
          clinics={clinics}
          clients={clients}
          therapists={therapists}
          defaultDate={format(selectedDate, "yyyy-MM-dd")}
          userRole={session.user.role}
          userPrimaryClinicId={session.user.primaryClinicId}
        />
      </div>

      <ScheduleView
        sessions={sessionsResult.data || []}
        clinics={clinics}
        selectedDate={selectedDate}
        selectedClinic={selectedClinic}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        viewMode={viewMode}
      />
    </div>
  );
}
