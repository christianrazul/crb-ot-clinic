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
import { TherapistDailyReport } from "@/actions/sessions";

interface DailyReportCardProps {
  report: TherapistDailyReport;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
}

export function DailyReportCard({ report }: DailyReportCardProps) {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No sessions scheduled today.
                  </TableCell>
                </TableRow>
              ) : (
                report.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.patientName}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatTime12hr(session.scheduledTime)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-1 border-t pt-3 text-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Therapist Rate</span>
            <span>{formatCurrency(report.therapistRate)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Expected Sessions</span>
            <span>{report.expectedSessionCount}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Actual Sessions</span>
            <span>{report.actualSessionCount}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Expected Income</span>
            <span>{formatCurrency(report.expectedIncome)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold">
            <span>Actual Income</span>
            <span>{formatCurrency(report.actualIncome)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
