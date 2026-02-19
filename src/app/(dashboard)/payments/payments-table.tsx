"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaymentMethod, PaymentSource, CreditType } from "@prisma/client";

interface Payment {
  id: string;
  amount: number | { toString(): string };
  paymentMethod: PaymentMethod;
  paymentSource: PaymentSource;
  creditType: CreditType;
  receiptNumber: string | null;
  paymentDate: Date;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    primaryTherapist: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
  recordedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  paymentSessions: Array<{
    session: {
      id: string;
      scheduledDate: Date;
      therapist: {
        id: string;
        firstName: string;
        lastName: string;
      };
    };
  }>;
}

interface PaymentsTableProps {
  payments: Payment[];
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
  none: "None",
};

const paymentSourceLabels: Record<PaymentSource, string> = {
  client: "Client",
  dswd: "DSWD",
  cswdo: "CSWDO",
  other_govt: "Other Govt",
};

const creditTypeLabels: Record<CreditType, string> = {
  regular: "Regular",
  advance: "Advance",
  no_payment: "No Payment",
};

const creditTypeBadgeVariant: Record<CreditType, "default" | "secondary" | "outline"> = {
  regular: "default",
  advance: "secondary",
  no_payment: "outline",
};

function formatCurrency(amount: number | { toString(): string }): string {
  const numAmount = typeof amount === "number" ? amount : parseFloat(amount.toString());
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(numAmount);
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No payments found for this period
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient Name</TableHead>
          <TableHead>Primary Therapist</TableHead>
          <TableHead>Payment Channel</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Charged To</TableHead>
          <TableHead>Receipt #</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((payment) => {
          const sessionTherapist = payment.paymentSessions[0]?.session?.therapist;
          const therapist = sessionTherapist || payment.client.primaryTherapist;

          return (
            <TableRow key={payment.id}>
              <TableCell className="font-medium">
                {payment.client.firstName} {payment.client.lastName}
              </TableCell>
              <TableCell>
                {therapist
                  ? `${therapist.firstName} ${therapist.lastName}`
                  : "-"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {paymentMethodLabels[payment.paymentMethod]}
                </Badge>
              </TableCell>
              <TableCell>
                {paymentSourceLabels[payment.paymentSource]}
              </TableCell>
              <TableCell>
                <Badge variant={creditTypeBadgeVariant[payment.creditType]}>
                  {creditTypeLabels[payment.creditType]}
                </Badge>
              </TableCell>
              <TableCell>
                {payment.receiptNumber || "-"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(payment.amount)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
