"use client";

import { Sidebar } from "@/components/layout/sidebar";

interface DashboardShellProps {
  userRole: string;
  children: React.ReactNode;
}

export function DashboardShell({ userRole, children }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={userRole} />
      <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
        {children}
      </main>
    </div>
  );
}
