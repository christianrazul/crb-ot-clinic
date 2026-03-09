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

function formatSessionType(sessionType: string): string {
  if (sessionType === "ot_evaluation") return "OT Evaluation";
  if (sessionType === "make_up") return "Make Up";
  if (sessionType === "regular") return "Regular";

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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Therapist</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No sessions scheduled today.
                  </TableCell>
                </TableRow>
              ) : (
                report.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.patientName}</TableCell>
                    <TableCell>{formatTime12hr(session.scheduledTime)}</TableCell>
                    <TableCell>{formatSessionType(session.sessionType)}</TableCell>
                    <TableCell>{session.therapistName}</TableCell>
                    <TableCell className="text-right">{formatCurrency(session.therapistRate)}</TableCell>
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
          <div className="flex items-center justify-between font-semibold">
            <span>Total Expected Income</span>
            <span>{formatCurrency(report.totalExpectedIncome)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Total Received Income</span>
            <span>{formatCurrency(report.totalReceivedIncome)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
