"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime12hr } from "@/lib/utils";
import { OwnerDailyReport } from "@/actions/sessions";
import { Download } from "lucide-react";
import { format } from "date-fns";

interface OwnerDailyReportCardProps {
  report: OwnerDailyReport;
}

function formatSessionStatus(status: string): string {
  const map: Record<string, string> = {
    scheduled: "Scheduled",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    no_show: "No Show",
  };
  return map[status] ?? status;
}

function sessionStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "in_progress") return "secondary";
  if (status === "no_show" || status === "cancelled") return "destructive";
  return "outline";
}

function formatSessionType(sessionType: string): string {
  if (sessionType === "ot_evaluation") return "OT Evaluation";
  if (sessionType === "make_up") return "Make Up";
  if (sessionType === "regular") return "Regular";
  if (sessionType === "st_session") return "ST Session";
  if (sessionType === "sped_session") return "SPED Tutorial";

  return sessionType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return "—";
  const map: Record<string, string> = {
    cash: "Cash",
    gcash: "GCash",
    bank_transfer: "Bank Transfer",
    none: "—",
  };
  return map[method] ?? method;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

function escapeCsvValue(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function OwnerDailyReportCard({ report }: OwnerDailyReportCardProps) {
  function handleExportCsv() {
    const headers = ["Client", "Time", "Status", "Type", "Therapist", "Therapist Rate", "Clinic Rate", "Payment", "Mode of Payment", "Profit"];

    const rows = report.sessions.map((session) => {
      const isCancelled = session.status === "cancelled";
      return [
        session.patientName,
        formatTime12hr(session.scheduledTime),
        formatSessionStatus(session.status),
        formatSessionType(session.sessionType),
        session.therapistName,
        isCancelled ? "—" : session.therapistRate > 0 ? session.therapistRate.toFixed(2) : "",
        isCancelled ? "—" : session.clientRate > 0 ? session.clientRate.toFixed(2) : "",
        isCancelled ? "—" : session.paymentStatus === "paid" ? "Paid" : "Unpaid",
        isCancelled ? "—" : formatPaymentMethod(session.modeOfPayment),
        isCancelled ? "—" : session.clientRate > 0 || session.therapistRate > 0 ? (session.clientRate - session.therapistRate).toFixed(2) : "",
      ];
    });

    const summaryRows = [
      [],
      ["Expected from Clients", "", "", "", "", "", "", "", "", report.totalClientExpected.toFixed(2)],
      ["Therapist Payout", "", "", "", "", "", "", "", "", (-report.totalTherapistPayout).toFixed(2)],
      ["Collected Revenue", "", "", "", "", "", "", "", "", report.totalClientReceived.toFixed(2)],
      ["Net Income", "", "", "", "", "", "", "", "", report.netIncome.toFixed(2)],
    ];

    const allRows = [headers, ...rows, ...summaryRows];
    const csv = allRows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const clinicSlug = report.clinicName
      ? `-${report.clinicName.toLowerCase().replace(/\s+/g, "-")}`
      : "";
    link.download = `daily-report${clinicSlug}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Today&apos;s Report</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Therapist</TableHead>
                <TableHead className="text-right">Therapist Rate</TableHead>
                <TableHead className="text-right">Clinic Rate</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead>Mode of Payment</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    No sessions scheduled today.
                  </TableCell>
                </TableRow>
              ) : (
                report.sessions.map((session) => (
                  <TableRow key={session.id} className={session.status === "cancelled" ? "opacity-60" : ""}>
                    <TableCell className="font-medium">{session.patientName}</TableCell>
                    <TableCell>{formatTime12hr(session.scheduledTime)}</TableCell>
                    <TableCell>
                      <Badge variant={sessionStatusVariant(session.status)}>
                        {formatSessionStatus(session.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatSessionType(session.sessionType)}</TableCell>
                    <TableCell>{session.therapistName}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {session.status === "cancelled"
                        ? <span className="line-through">—</span>
                        : session.therapistRate > 0 ? formatCurrency(session.therapistRate) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "cancelled"
                        ? <span className="line-through text-muted-foreground">—</span>
                        : session.clientRate > 0 ? formatCurrency(session.clientRate) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {session.status === "cancelled"
                        ? <span className="line-through text-muted-foreground">—</span>
                        : <Badge variant={session.paymentStatus === "paid" ? "default" : "outline"}>
                            {session.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                          </Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.status === "cancelled"
                        ? <span className="line-through">—</span>
                        : formatPaymentMethod(session.modeOfPayment)}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.status === "cancelled"
                        ? <span className="line-through text-muted-foreground">—</span>
                        : session.clientRate > 0 || session.therapistRate > 0
                          ? formatCurrency(session.clientRate - session.therapistRate)
                          : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Expected from Clients</span>
            <span>{formatCurrency(report.totalClientExpected)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Therapist Payout</span>
            <span>({formatCurrency(report.totalTherapistPayout)})</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 font-semibold">
            <span>Collected Revenue</span>
            <span>{formatCurrency(report.totalClientReceived)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Net Income</span>
            <span className={report.netIncome >= 0 ? "" : "text-destructive"}>
              {formatCurrency(report.netIncome)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
