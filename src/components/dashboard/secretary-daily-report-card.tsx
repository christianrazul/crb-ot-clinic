import { Card, CardContent } from "@/components/ui/card";
import { formatTime12hr } from "@/lib/utils";
import { SecretaryDailyReport } from "@/actions/sessions";

interface SecretaryDailyReportCardProps {
  report: SecretaryDailyReport;
}

function formatSessionType(sessionType: string): string {
  if (sessionType === "ot_evaluation") return "OT Evaluation";
  if (sessionType === "make_up") return "Make Up Session";
  if (sessionType === "regular") return "Regular Session";

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
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Patient</span>
            <span>Therapist</span>
            <span>Session Type</span>
            <span className="text-right">Time</span>
          </div>

          {report.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions scheduled today.</p>
          ) : (
            <div className="space-y-2">
              {report.sessions.map((session) => (
                <div key={session.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 text-sm">
                  <span className="truncate">{session.patientName}</span>
                  <span className="truncate text-left">{session.therapistName}</span>
                  <span className="truncate text-left">{formatSessionType(session.sessionType)}</span>
                  <span className="text-right text-muted-foreground">{formatTime12hr(session.scheduledTime)}</span>
                </div>
              ))}
            </div>
          )}
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
