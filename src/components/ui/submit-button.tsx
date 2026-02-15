"use client";

import { useFormStatus } from "react-dom";
import { Button, ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  pendingText?: string;
}

export function SubmitButton({
  children,
  pendingText,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? (pendingText || "Submitting...") : children}
    </Button>
  );
}
