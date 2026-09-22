import { cn } from "@/lib/utils";

/**
 * WhisperBox mark: a chat bubble with a keyhole in it. `inverse` is for
 * placing on the deep brand color (auth band, closing call-to-action).
 */
export function LogoMark({
  className,
  variant = "brand",
}: {
  className?: string;
  variant?: "brand" | "inverse";
}) {
  const inverse = variant === "inverse";

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-9 shrink-0", className)}
    >
      <rect width="32" height="32" rx="9" className={inverse ? "fill-white" : "fill-primary"} />
      <path
        d="M9.5 8.5h13A3.5 3.5 0 0 1 26 12v6.5a3.5 3.5 0 0 1-3.5 3.5H16.5l-5 3.6V22h-2A3.5 3.5 0 0 1 6 18.5V12a3.5 3.5 0 0 1 3.5-3.5z"
        className={inverse ? "fill-brand-deep" : "fill-primary-foreground"}
      />
      <circle cx="16" cy="14.2" r="2.3" className={inverse ? "fill-white" : "fill-primary"} />
      <path d="M14.9 15.8h2.2l.8 3.6h-3.8z" className={inverse ? "fill-white" : "fill-primary"} />
    </svg>
  );
}

export function Logo({
  className,
  variant = "brand",
}: {
  className?: string;
  variant?: "brand" | "inverse";
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark variant={variant} />
      <span className="text-[19px] font-bold tracking-[-0.03em]">WhisperBox</span>
    </span>
  );
}
