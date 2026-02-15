"use client";

import { useState } from "react";
import { UserRole } from "@prisma/client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { addBackupTherapist, removeBackupTherapist } from "@/actions/clients";
import { roleLabels } from "@/lib/auth/permissions";

interface BackupTherapist {
  id: string;
  priority: number;
  therapist: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface BackupTherapistsSectionProps {
  clientId: string;
  backupTherapists: BackupTherapist[];
  therapists: Therapist[];
  primaryTherapistId: string | null;
}

export function BackupTherapistsSection({
  clientId,
  backupTherapists,
  therapists,
  primaryTherapistId,
}: BackupTherapistsSectionProps) {
  const [selectedTherapist, setSelectedTherapist] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);

  const existingIds = new Set([
    primaryTherapistId,
    ...backupTherapists.map((bt) => bt.therapist.id),
  ]);

  const availableTherapists = therapists.filter((t) => !existingIds.has(t.id));

  async function handleAdd() {
    if (!selectedTherapist) return;
    setIsAdding(true);
    await addBackupTherapist(clientId, selectedTherapist);
    setSelectedTherapist("");
    setIsAdding(false);
  }

  async function handleRemove(therapistId: string) {
    await removeBackupTherapist(clientId, therapistId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Therapists</CardTitle>
        <CardDescription>
          Alternative therapists when the primary is unavailable
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {backupTherapists.length > 0 ? (
          <div className="space-y-2">
            {backupTherapists.map((bt) => (
              <div
                key={bt.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">#{bt.priority}</Badge>
                  <div>
                    <p className="font-medium">
                      {bt.therapist.firstName} {bt.therapist.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {roleLabels[bt.therapist.role]}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(bt.therapist.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No backup therapists assigned
          </p>
        )}

        {availableTherapists.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedTherapist} onValueChange={setSelectedTherapist}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a therapist to add" />
              </SelectTrigger>
              <SelectContent>
                {availableTherapists.map((therapist) => (
                  <SelectItem key={therapist.id} value={therapist.id}>
                    {therapist.firstName} {therapist.lastName} (
                    {roleLabels[therapist.role]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAdd}
              disabled={!selectedTherapist || isAdding}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
