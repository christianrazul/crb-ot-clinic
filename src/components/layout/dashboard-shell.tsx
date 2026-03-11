"use client";

import { MobileSidebar, Sidebar } from "@/components/layout/sidebar";

interface DashboardShellProps {
  userRole: string;
  children: React.ReactNode;
}

export function DashboardShell({ userRole, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 items-center border-b bg-background px-2 md:hidden">
          <MobileSidebar userRole={userRole} />
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
