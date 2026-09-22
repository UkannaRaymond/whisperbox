import { AuthShell } from "@/components/auth/auth-shell";

/**
 * Shared shell for the auth route group. A route group (`(auth)`) so both pages share this
 * layout without it affecting the URL path.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
