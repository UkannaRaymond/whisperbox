import Link from "next/link";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = {
  title: "Create Your Account",
  description:
    "Create your WhisperBox account and start having private, end-to-end encrypted conversations.",
};

export default function RegisterPage() {
  return (
    <>
      <AuthHeading
        title="Create your account"
        description="Your messages are encrypted on your device before they're sent."
      />
      <RegisterForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
