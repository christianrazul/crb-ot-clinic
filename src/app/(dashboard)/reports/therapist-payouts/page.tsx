import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getClinics } from "@/actions/users";
import { TherapistPayoutView } from "./therapist-payout-view";

interface PageProps {
  searchParams: Promise<{ clinic?: string; start?: string; end?: string }>;
}

export default async function TherapistPayoutsPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_financial_reports")) {
    redirect("/dashboard");
  }

  const clinics = await getClinics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Therapist Payouts</h2>
        <p className="text-muted-foreground">
          Track completed sessions and calculate therapist earnings
        </p>
      </div>

      <TherapistPayoutView
        clinics={clinics}
        selectedClinic={params.clinic}
        initialStartDate={params.start}
        initialEndDate={params.end}
      />
    </div>
  );
}
