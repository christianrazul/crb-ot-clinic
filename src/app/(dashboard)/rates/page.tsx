import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission, roleLabels, therapistRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { getClientSessionRates } from "@/actions/client-rates";
import { getStaffSessionRates } from "@/actions/session-rates";
import { SESSION_TYPE_LABELS } from "@/lib/session-types";
import { SessionType } from "@prisma/client";
import { RatesView } from "./rates-view";

interface PageProps {
  searchParams: Promise<{ clinicId?: string }>;
}

export default async function RatesPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "manage_rates")) {
    redirect("/dashboard");
  }

  const clinics = await db.clinic.findMany({
    where: {
      isActive: true,
      ...(session.user.primaryClinicId && { id: session.user.primaryClinicId }),
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  if (clinics.length === 0) {
    return <div className="text-muted-foreground">No clinics found.</div>;
  }

  const selectedClinicId = params.clinicId || clinics[0].id;
  const [clientRatesResult, staffRatesResult] = await Promise.all([
    getClientSessionRates(selectedClinicId),
    getStaffSessionRates(selectedClinicId),
  ]);

  const clientRateMap = clientRatesResult.data ?? new Map();
  const staffRateMap = staffRatesResult.data ?? new Map();

  const allSessionTypes = Object.values(SessionType);
  const clientRows = allSessionTypes.map((type) => ({
    sessionType: type,
    label: SESSION_TYPE_LABELS[type],
    currentRate: clientRateMap.get(type)?.ratePerSession ?? null,
  }));

  const staffRows = therapistRoles.map((role) => ({
    role,
    label: roleLabels[role],
    currentRate: staffRateMap.get(role)?.ratePerSession ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Session Rates</h2>
        <p className="text-muted-foreground">
          Manage client session rates by session type and staff session rates by therapist role.
        </p>
      </div>

      <RatesView
        clinics={clinics}
        selectedClinicId={selectedClinicId}
        clientRows={clientRows}
        staffRows={staffRows}
      />
    </div>
  );
}
