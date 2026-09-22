import { cn } from "@/lib/utils";

/**
 * The visual shell of one chat bubble: color, corner radius, optional tail, and
 * the timestamp/receipt slot. Purely presentational (no hooks), so the landing
 * page demo renders the exact same bubbles as the real chat.
 *
 * Timestamp placement: by default `meta` floats in the bottom-right corner and
 * text content should end with <BubbleSpacer /> so the last line never runs
 * underneath it. Pass `metaInline` when the bubble holds more than text
 * (attachments) and the meta should sit on its own row instead.
 */
export function BubbleFrame({
  own,
  tail = false,
  meta,
  metaInline = false,
  className,
  children,
}: {
  own: boolean;
  tail?: boolean;
  meta: React.ReactNode;
  metaInline?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "bubble relative w-fit max-w-[85%] rounded-lg px-2.5 pt-1.5 pb-1.5 text-[15px] leading-5 sm:max-w-[75%] lg:max-w-[65%]",
        own
          ? "bg-bubble-out text-bubble-out-foreground"
          : "bg-bubble-in text-bubble-in-foreground",
        tail && (own ? "bubble-tail-out rounded-tr-none" : "bubble-tail-in rounded-tl-none"),
        className,
      )}
    >
      {children}
      {metaInline ? (
        <div className="text-bubble-meta mt-0.5 flex items-center justify-end gap-1 text-[11px] leading-none">
          {meta}
        </div>
      ) : (
        <div className="text-bubble-meta absolute right-2 bottom-1.5 flex items-center gap-1 text-[11px] leading-none">
          {meta}
        </div>
      )}
    </div>
  );
}

/** Invisible inline block reserving room for the floating timestamp at the end of the last line. */
export function BubbleSpacer({ own }: { own: boolean }) {
  return (
    <span aria-hidden="true" className={cn("inline-block h-3", own ? "w-19" : "w-13")} />
  );
}
