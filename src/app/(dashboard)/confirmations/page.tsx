import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getPendingConfirmations } from "@/actions/sessions";
import { getClinics } from "@/actions/users";
import { ConfirmationsView } from "./confirmations-view";

interface PageProps {
  searchParams: Promise<{ clinic?: string }>;
}

export default async function ConfirmationsPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "verify_sessions")) {
    redirect("/dashboard");
  }

  const selectedClinic = params.clinic || undefined;

  const [sessionsResult, clinics] = await Promise.all([
    getPendingConfirmations(selectedClinic),
    getClinics(),
  ]);

  if (sessionsResult.error) {
    return <div>Error: {sessionsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Session Verifications</h2>
        <p className="text-muted-foreground">
          Verify completed sessions before collecting payment
        </p>
      </div>

      <ConfirmationsView
        sessions={sessionsResult.data || []}
        clinics={clinics}
        selectedClinic={selectedClinic}
      />
    </div>
  );
}
