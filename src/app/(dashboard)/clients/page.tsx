import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getClients, getTherapists } from "@/actions/clients";
import { getClinics } from "@/actions/users";
import { ClientsTable } from "./clients-table";
import { CreateClientDialog } from "./create-client-dialog";

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "view_all_clients")) {
    redirect("/dashboard");
  }

  const [clientsResult, clinics, therapists] = await Promise.all([
    getClients(params.search),
    getClinics(),
    getTherapists(),
  ]);

  if (clientsResult.error) {
    return <div>Error: {clientsResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage client information and therapy assignments
          </p>
        </div>
        <CreateClientDialog clinics={clinics} therapists={therapists} />
      </div>

      <ClientsTable
        clients={clientsResult.data || []}
        clinics={clinics}
        therapists={therapists}
      />
    </div>
  );
}
