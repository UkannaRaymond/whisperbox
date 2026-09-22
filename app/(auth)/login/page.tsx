import Link from "next/link";
import type { Metadata } from "next";

import { AuthHeading } from "@/components/auth/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <AuthHeading title="Welcome back" description="Sign in to pick up your conversations." />
      <LoginForm />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        New to WhisperBox?{" "}
        <Link href="/register" className="text-primary font-semibold underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
