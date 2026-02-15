"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasPermission, isTherapist } from "@/lib/auth/permissions";
import { signOut } from "next-auth/react";

interface SidebarProps {
  userRole: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  therapistOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "My Schedule",
    href: "/my-schedule",
    icon: CalendarDays,
    therapistOnly: true,
  },
  {
    title: "Schedule",
    href: "/schedule",
    icon: Calendar,
    permission: "view_all_sessions",
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
    permission: "view_all_clients",
  },
  {
    title: "Sessions",
    href: "/sessions",
    icon: ClipboardList,
    permission: "view_all_sessions",
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
    permission: "view_payments",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    permission: "view_reports",
  },
  {
    title: "Admin",
    href: "/admin/users",
    icon: Settings,
    permission: "manage_users",
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter((item) => {
    if (item.therapistOnly) {
      return isTherapist(userRole);
    }
    if (item.permission) {
      return hasPermission(userRole, item.permission as never);
    }
    return true;
  });

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="text-lg">CRB OT Clinic</span>
        </Link>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="grid gap-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2",
                    isActive && "bg-secondary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
