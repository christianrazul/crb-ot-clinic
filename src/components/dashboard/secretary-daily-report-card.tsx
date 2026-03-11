import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTime12hr } from "@/lib/utils";
import { SecretaryDailyReport } from "@/actions/sessions";

interface SecretaryDailyReportCardProps {
  report: SecretaryDailyReport;
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

export function SecretaryDailyReportCard({ report }: SecretaryDailyReportCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Therapist</TableHead>
                <TableHead>Mode of Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No sessions scheduled today.
                  </TableCell>
                </TableRow>
              ) : (
                report.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.patientName}</TableCell>
                    <TableCell>{formatTime12hr(session.scheduledTime)}</TableCell>
                    <TableCell>
                      <Badge variant={sessionStatusVariant(session.status)}>
                        {formatSessionStatus(session.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatSessionType(session.sessionType)}</TableCell>
                    <TableCell>{session.therapistName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPaymentMethod(session.modeOfPayment)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex items-center justify-between font-semibold">
            <span>Total Expected Income</span>
            <span>{formatCurrency(report.totalExpectedIncome)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Actual Received Income</span>
            <span>{formatCurrency(report.actualReceivedIncome)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
