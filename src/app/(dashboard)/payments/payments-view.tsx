"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PaymentsTable } from "./payments-table";
import { PaymentMethod, PaymentSource, CreditType } from "@prisma/client";

interface Payment {
  id: string;
  amount: number | { toString(): string };
  paymentMethod: PaymentMethod;
  paymentSource: PaymentSource;
  creditType: CreditType;
  receiptNumber: string | null;
  paymentDate: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    primaryTherapist: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
  recordedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  paymentSessions: Array<{
    session: {
      id: string;
      scheduledDate: Date;
      therapist: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface PaymentsViewProps {
  payments: Payment[];
  total: number;
  clinics: Clinic[];
  selectedDate: Date;
  selectedClinic?: string;
  dateFilter: "day" | "week" | "month";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function PaymentsView({
  payments,
  total,
  clinics,
  selectedDate,
  selectedClinic,
  dateFilter,
}: PaymentsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigateToDate(date: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(date, "yyyy-MM-dd"));
    router.push(`/payments?${params.toString()}`);
  }

  function handleClinicChange(clinicId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (clinicId && clinicId !== "all") {
      params.set("clinic", clinicId);
    } else {
      params.delete("clinic");
    }
    router.push(`/payments?${params.toString()}`);
  }

  function handleFilterChange(filter: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("filter", filter);
    router.push(`/payments?${params.toString()}`);
  }

  function goToPrevious() {
    const amount = dateFilter === "day" ? 1 : dateFilter === "week" ? 7 : 30;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - amount);
    navigateToDate(newDate);
  }

  function goToNext() {
    const amount = dateFilter === "day" ? 1 : dateFilter === "week" ? 7 : 30;
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + amount);
    navigateToDate(newDate);
  }

  function goToToday() {
    navigateToDate(new Date());
  }

  function getDateRangeLabel(): string {
    if (dateFilter === "day") {
      return format(selectedDate, "MMMM d, yyyy");
    } else if (dateFilter === "week") {
      const weekStart = new Date(selectedDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    } else {
      return format(selectedDate, "MMMM yyyy");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {getDateRangeLabel()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && navigateToDate(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="icon" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button variant="ghost" onClick={goToToday}>
            Today
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateFilter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={selectedClinic || "all"}
            onValueChange={handleClinicChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Clinics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Records</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsTable payments={payments} />
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            {payments.length} payment{payments.length !== 1 ? "s" : ""}
          </div>
          <div className="text-lg font-semibold">
            Total: {formatCurrency(total)}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
