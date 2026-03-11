"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ClipboardList,
  CreditCard,
  Settings,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasPermission, isTherapist, roleLabels } from "@/lib/auth/permissions";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRole } from "@prisma/client";

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
    title: "Attendance",
    href: "/attendance",
    icon: ClipboardList,
    permission: "manage_attendance",
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
    title: "Client Management",
    href: "/clients",
    icon: Users,
    permission: "view_all_clients",
  },
  {
    title: "Staff Management",
    href: "/admin/users",
    icon: Settings,
    permission: "manage_users",
  },
  {
    title: "Session Rates",
    href: "/rates",
    icon: CreditCard,
    permission: "manage_rates",
  },
];

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?";

  const roleLabel = user?.role ? roleLabels[user.role as UserRole] : "";

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
    <div className="hidden h-full w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-20 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="CRB OT Clinic logo" width={32} height={32} className="rounded-full" />
          <span className="text-3xl text-primary" style={{ fontFamily: "var(--font-indigo-sky)", color: "#95cdfe" }}>CRB OT Clinic</span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <p className="text-sm font-medium">{user?.name}</p>
                <Badge variant="secondary" className="text-xs">
                  {roleLabel}
                </Badge>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/account">My Account</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
