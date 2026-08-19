import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-level loading UI shown by Next.js while a segment's data is being
 * fetched. Feature-level loading states (e.g. a message list skeleton)
 * should live with that feature; this is the app-wide fallback.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-4 w-full max-w-sm" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
