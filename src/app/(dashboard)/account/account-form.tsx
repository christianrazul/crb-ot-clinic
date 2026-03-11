"use client";

import { useEffect } from "react";
import { useFormState } from "react-dom";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfile, changePassword } from "@/actions/profile";

interface AccountFormProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const initialState = { error: undefined, success: undefined, data: undefined };

export function AccountForm({ user }: AccountFormProps) {
  const [profileState, profileAction] = useFormState(updateProfile, initialState);
  const [passwordState, passwordAction] = useFormState(changePassword, initialState);

  useEffect(() => {
    if (profileState.success) {
      const emailChanged = (profileState.data as { emailChanged?: boolean })?.emailChanged;
      if (emailChanged) {
        signOut({ callbackUrl: "/login" });
      }
    }
  }, [profileState.success, profileState.data]);

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={profileAction} className="space-y-4">
            {profileState.error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {profileState.error}
              </div>
            )}
            {profileState.success && !(profileState.data as { emailChanged?: boolean })?.emailChanged && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                Profile updated successfully
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={user.firstName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={user.lastName}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
              />
              <p className="text-xs text-muted-foreground">
                Changing your email will sign you out immediately.
              </p>
            </div>
            <SubmitButton pendingText="Saving...">Save changes</SubmitButton>
          </form>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter your current password to set a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            {passwordState.error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {passwordState.error}
              </div>
            )}
            {passwordState.success && (
              <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-700">
                Password changed successfully
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
              />
            </div>
            <SubmitButton pendingText="Updating...">Update password</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
