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
import { OwnerDailyReport } from "@/actions/sessions";

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function OwnerDailyReportCard({ report }: OwnerDailyReportCardProps) {
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
                <TableHead className="text-right">Therapist Rate</TableHead>
                <TableHead className="text-right">Clinic Rate</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
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
                    <TableCell className="text-right text-muted-foreground">
                      {session.therapistRate > 0 ? formatCurrency(session.therapistRate) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {session.clientRate > 0 ? formatCurrency(session.clientRate) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={session.paymentStatus === "paid" ? "default" : "outline"}>
                        {session.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.paymentAmount > 0 ? formatCurrency(session.paymentAmount) : "—"}
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
