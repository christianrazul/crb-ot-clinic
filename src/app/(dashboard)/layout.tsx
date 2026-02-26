import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { SessionProvider } from "next-auth/react";
import { getPendingConfirmationsCount } from "@/actions/sessions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const pendingConfirmationsCount = await getPendingConfirmationsCount();

  return (
    <SessionProvider session={session}>
      <DashboardShell
        userRole={session.user.role}
        pendingConfirmationsCount={pendingConfirmationsCount}
      >
        {children}
      </DashboardShell>
    </SessionProvider>
  );
}
