import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { isTherapist } from "@/lib/auth/permissions";
import { getSessions } from "@/actions/sessions";
import { MyScheduleView } from "./my-schedule-view";
import { format, parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function MySchedulePage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !isTherapist(session.user.role)) {
    redirect("/dashboard");
  }

  const selectedDate = params.date ? parseISO(params.date) : new Date();

  const sessionsResult = await getSessions(selectedDate);

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
      />
    </div>
  );
}
