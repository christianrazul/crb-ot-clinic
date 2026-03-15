import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getUsers, getClinics } from "@/actions/users";
import { UsersTable } from "./users-table";
import { CreateUserDialog } from "./create-user-dialog";

interface PageProps {
  searchParams: Promise<{ clinic?: string; search?: string; page?: string }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user || !hasPermission(session.user.role, "manage_users")) {
    redirect("/dashboard");
  }

  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const [usersResult, clinics] = await Promise.all([
    getUsers(params.clinic, params.search, page),
    getClinics(),
  ]);

  if (usersResult.error) {
    return <div>Error: {usersResult.error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
          <p className="text-muted-foreground">
            Manage staff accounts and permissions
          </p>
        </div>
        <CreateUserDialog clinics={clinics} />
      </div>

      <UsersTable users={usersResult.data || []} clinics={clinics} total={usersResult.total ?? 0} page={page} />
    </div>
  );
}
