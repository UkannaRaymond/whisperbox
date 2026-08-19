import Link from "next/link";

/**
 * Shared shell for the auth route group. A route group (`(auth)`) so both pages share this
 * layout without it affecting the URL path.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold">
            WhisperBox
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
