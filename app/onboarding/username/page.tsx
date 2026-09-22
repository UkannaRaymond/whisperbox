import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-shell";
import { SetUsernameForm } from "@/features/auth/components/set-username-form";

export const metadata: Metadata = { title: "Choose a username" };

export default function SetUsernamePage() {
  return (
    <>
      <AuthHeading
        title="Choose a username"
        description="One last step. This is how your contacts will find and recognize you."
      />
      <SetUsernameForm />
    </>
  );
}
