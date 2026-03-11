import { Card, CardContent } from "@/components/ui/card";
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

export function SecretaryDailyReportCard({ report }: SecretaryDailyReportCardProps) {
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
