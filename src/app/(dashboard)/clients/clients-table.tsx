"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClientStatus, Gender, UserRole } from "@prisma/client";
import { Search, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge } from "@/components/ui/role-badge";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  diagnosis: string | null;
  guardianName: string;
  status: ClientStatus;
  mainClinic: {
    id: string;
    name: string;
    code: string;
  };
  primaryTherapist: {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  } | null;
}

interface Clinic {
  id: string;
  name: string;
  code: string;
}

interface Therapist {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

interface ClientsTableProps {
  clients: Client[];
  clinics: Clinic[];
  therapists: Therapist[];
}

const statusColors: Record<ClientStatus, "default" | "secondary" | "destructive"> = {
  active: "default",
  inactive: "secondary",
  discharged: "destructive",
};

export function ClientsTable({ clients, clinics }: ClientsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    router.push(`/clients?${params.toString()}`);
  }

  function handleClinicChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("clinic");
    } else {
      params.set("clinic", value);
    }
    router.push(`/clients?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        {clinics.length > 1 && (
          <Select
            value={searchParams.get("clinic") || "all"}
            onValueChange={handleClinicChange}
          >
            <SelectTrigger className="w-auto min-w-[180px]">
              <SelectValue placeholder="All Clinics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clinics</SelectItem>
              {clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Guardian</TableHead>
              <TableHead>Clinic</TableHead>
              <TableHead>Primary Therapist</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {client.firstName} {client.lastName}
                      </div>
                      {client.gender && (
                        <div className="text-sm text-muted-foreground capitalize">
                          {client.gender}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.guardianName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.mainClinic.code}</Badge>
                  </TableCell>
                  <TableCell>
                    {client.primaryTherapist ? (
                      <div className="text-sm">
                        <div>
                          {client.primaryTherapist.firstName}{" "}
                          {client.primaryTherapist.lastName}
                        </div>
                        <div className="mt-0.5">
                          <RoleBadge role={client.primaryTherapist.role} />
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[client.status]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/clients/${client.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
