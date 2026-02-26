"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

interface DashboardShellProps {
  userRole: string;
  pendingConfirmationsCount: number;
  children: React.ReactNode;
}

export function DashboardShell({
  userRole,
  pendingConfirmationsCount,
  children,
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={userRole}
        pendingConfirmationsCount={pendingConfirmationsCount}
        isOpen={isSidebarOpen}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}