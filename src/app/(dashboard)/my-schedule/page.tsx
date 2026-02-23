import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { isTherapist } from "@/lib/auth/permissions";
import { getSessions, getSessionsInRange } from "@/actions/sessions";
import { MyScheduleView } from "./my-schedule-view";
import { format, parseISO, startOfWeek, endOfWeek } from "date-fns";

type ViewMode = "daily" | "weekly";

interface PageProps {
  searchParams: Promise<{ date?: string; view?: string }>;
}

export default async function MySchedulePage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !isTherapist(session.user.role)) {
    redirect("/dashboard");
  }

  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const viewMode: ViewMode = params.view === "weekly" ? "weekly" : "daily";

  const sessionsResult = viewMode === "weekly"
    ? await getSessionsInRange(
        startOfWeek(selectedDate, { weekStartsOn: 1 }),
        endOfWeek(selectedDate, { weekStartsOn: 1 })
      )
    : await getSessions(selectedDate);

  if (sessionsResult.error) {
    return <div>Error: {sessionsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Schedule</h2>
        <p className="text-muted-foreground">
          {format(selectedDate, "EEEE, MMMM d, yyyy")}
        </p>
      </div>

      <MyScheduleView
        sessions={sessionsResult.data || []}
        selectedDate={selectedDate}
        currentUserId={session.user.id}
        currentUserRole={session.user.role}
        viewMode={viewMode}
      />
    </div>
  );
}
