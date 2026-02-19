import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
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
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          userRole={session.user.role}
          pendingConfirmationsCount={pendingConfirmationsCount}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
