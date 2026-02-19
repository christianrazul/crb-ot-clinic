import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getPayments } from "@/actions/payments";
import { getClinics } from "@/actions/users";
import { PaymentsView } from "./payments-view";
import { parseISO } from "date-fns";

interface PageProps {
  searchParams: Promise<{ date?: string; clinic?: string; filter?: string }>;
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_payments")) {
    redirect("/dashboard");
  }

  const selectedDate = params.date ? parseISO(params.date) : new Date();
  const selectedClinic = params.clinic || undefined;
  const dateFilter = (params.filter as "day" | "week" | "month") || "day";

  const [paymentsResult, clinics] = await Promise.all([
    getPayments(dateFilter, selectedDate, selectedClinic),
    getClinics(),
  ]);

  if (paymentsResult.error) {
    return <div>Error: {paymentsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground">
          Track and manage payment records
        </p>
      </div>

      <PaymentsView
        payments={paymentsResult.data?.payments || []}
        total={paymentsResult.data?.total || 0}
        clinics={clinics}
        selectedDate={selectedDate}
        selectedClinic={selectedClinic}
        dateFilter={dateFilter}
      />
    </div>
  );
}
