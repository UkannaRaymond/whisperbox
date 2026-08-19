import type { Metadata } from "next";

import { SetUsernameForm } from "@/features/auth/components/set-username-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Choose a username" };

export default function SetUsernamePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a username</CardTitle>
        <CardDescription>This is how your contacts will find and recognize you.</CardDescription>
      </CardHeader>
      <CardContent>
        <SetUsernameForm />
      </CardContent>
    </Card>
  );
}
