import { CircleAlert } from "lucide-react";

/** Server-side error shown under a form (wrong password, taken username, ...). */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
