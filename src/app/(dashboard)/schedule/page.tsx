import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getSessions, getClientsForScheduling } from "@/actions/sessions";
import { getClinics } from "@/actions/users";
import { getTherapists } from "@/actions/clients";
import { ScheduleView } from "./schedule-view";
import { CreateSessionDialog } from "./create-session-dialog";
import { format, parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string; clinic?: string }>;
}

export default async function SchedulePage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_all_sessions")) {
    redirect("/dashboard");
  }

  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const selectedClinic = params.clinic || undefined;

  const [sessionsResult, clinics, clients, therapists] = await Promise.all([
    getSessions(selectedDate, selectedClinic),
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
        />
      </div>

      <ScheduleView
        sessions={sessionsResult.data || []}
        clinics={clinics}
        selectedDate={selectedDate}
        selectedClinic={selectedClinic}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
      />
    </div>
  );
}
