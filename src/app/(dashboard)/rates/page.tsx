import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { getClientSessionRates } from "@/actions/client-rates";
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
  const ratesResult = await getClientSessionRates(selectedClinicId);
  const rateMap = ratesResult.data ?? new Map();

  const allSessionTypes = Object.values(SessionType);
  const rows = allSessionTypes.map((type) => ({
    sessionType: type,
    label: SESSION_TYPE_LABELS[type],
    currentRate: rateMap.get(type)?.ratePerSession ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Client Session Rates</h2>
        <p className="text-muted-foreground">
          Set the rates charged to clients per session type. Changes take effect immediately.
        </p>
      </div>

      <RatesView
        clinics={clinics}
        selectedClinicId={selectedClinicId}
        rows={rows}
      />
    </div>
  );
}
