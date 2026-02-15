import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { hasPermission, roleLabels } from "@/lib/auth/permissions";
import { getClient, getTherapists } from "@/actions/clients";
import { getClinics } from "@/actions/users";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditClientDialog } from "./edit-client-dialog";
import { BackupTherapistsSection } from "./backup-therapists-section";
import { ClientStatus } from "@prisma/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusColors: Record<ClientStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  discharged: "destructive",
};

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user || !hasPermission(session.user.role, "view_all_clients")) {
    redirect("/dashboard");
  }

  const [clientResult, clinics, therapists] = await Promise.all([
    getClient(id),
    getClinics(),
    getTherapists(),
  ]);

  if (clientResult.error || !clientResult.data) {
    notFound();
  }

  const client = clientResult.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {client.firstName} {client.lastName}
            </h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant="outline">{client.mainClinic.code}</Badge>
              <Badge variant={statusColors[client.status]}>
                {client.status}
              </Badge>
            </div>
          </div>
        </div>
        <EditClientDialog
          client={client}
          clinics={clinics}
          therapists={therapists}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>Personal and medical details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {client.dateOfBirth
                    ? format(new Date(client.dateOfBirth), "MMMM d, yyyy")
                    : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diagnosis</p>
                <p className="font-medium">{client.diagnosis || "Not specified"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Enrollment Date</p>
                <p className="font-medium">
                  {format(new Date(client.enrollmentDate), "MMMM d, yyyy")}
                </p>
              </div>
              {client.dischargeDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Discharge Date</p>
                  <p className="font-medium">
                    {format(new Date(client.dischargeDate), "MMMM d, yyyy")}
                  </p>
                </div>
              )}
            </div>

            {client.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium whitespace-pre-wrap">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guardian Information</CardTitle>
            <CardDescription>Contact details for the guardian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{client.guardianName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Relationship</p>
                <p className="font-medium">
                  {client.guardianRelation || "Not specified"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">
                  {client.guardianPhone || "Not provided"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">
                  {client.guardianEmail || "Not provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary Therapist</CardTitle>
            <CardDescription>
              The main therapist assigned to this client
            </CardDescription>
          </CardHeader>
          <CardContent>
            {client.primaryTherapist ? (
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-lg font-medium text-primary">
                    {client.primaryTherapist.firstName[0]}
                    {client.primaryTherapist.lastName[0]}
                  </span>
                </div>
                <div>
                  <p className="font-medium">
                    {client.primaryTherapist.firstName}{" "}
                    {client.primaryTherapist.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {roleLabels[client.primaryTherapist.role]}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No primary therapist assigned</p>
            )}
          </CardContent>
        </Card>

        <BackupTherapistsSection
          clientId={client.id}
          backupTherapists={client.backupTherapists}
          therapists={therapists}
          primaryTherapistId={client.primaryTherapistId}
        />
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>
            View all sessions for this client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/clients/${client.id}/sessions`}>
            <Button variant="outline">View Sessions</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
