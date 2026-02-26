import { Card, CardContent } from "@/components/ui/card";
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
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Patient</span>
            <span>Time</span>
          </div>

          {report.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {report.sessions.map((session) => (
                <div key={session.id} className="grid grid-cols-[1fr_auto] gap-2 text-sm">
                  <span className="truncate">{session.patientName}</span>
                  <span className="text-muted-foreground">{formatTime12hr(session.scheduledTime)}</span>
                </div>
              ))}
            </div>
          )}
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