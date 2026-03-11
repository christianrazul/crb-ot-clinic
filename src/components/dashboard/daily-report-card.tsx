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
import { TherapistDailyReport } from "@/actions/sessions";

interface DailyReportCardProps {
  report: TherapistDailyReport;
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
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No sessions scheduled today.
                  </TableCell>
                </TableRow>
              ) : (
                report.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.patientName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTime12hr(session.scheduledTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={sessionStatusVariant(session.status)}>
                        {formatSessionStatus(session.status)}
                      </Badge>
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
