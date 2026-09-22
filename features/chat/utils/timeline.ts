import type { TimelineEntry } from "@/features/offline/types/offline.types";

/** What the message list needs to know about an entry, whether it's confirmed or still queued. */
export function entryMeta(entry: TimelineEntry, currentUserId: string | undefined) {
  if (entry.kind === "pending") {
    return {
      key: entry.operation.id,
      createdAt: entry.operation.createdAt,
      senderKey: "me",
      isOwn: true,
    };
  }
  return {
    key: entry.message.id,
    createdAt: entry.message.createdAt,
    senderKey: entry.message.senderId,
    isOwn: entry.message.senderId === currentUserId,
  };
}

/** Local calendar-day key, e.g. "2026-9-21" — used to decide where day separators go. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Today", "Yesterday", a weekday for the last week, then a full date. */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export type TimelineItem =
  | { type: "day"; key: string; label: string }
  | {
      type: "message";
      key: string;
      entry: TimelineEntry;
      isOwn: boolean;
      /** First bubble of a run from the same sender — gets the tail and a little extra space above. */
      startsRun: boolean;
    };

/** Flattens the timeline into day separators + messages, marking where each sender's run begins. */
export function buildTimelineItems(
  timeline: TimelineEntry[],
  currentUserId: string | undefined,
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let lastDay: string | null = null;
  let lastSender: string | null = null;

  for (const entry of timeline) {
    const meta = entryMeta(entry, currentUserId);
    const day = dayKey(meta.createdAt);

    if (day !== lastDay) {
      items.push({ type: "day", key: `day-${day}`, label: formatDayLabel(meta.createdAt) });
      lastDay = day;
      lastSender = null;
    }

    items.push({
      type: "message",
      key: meta.key,
      entry,
      isOwn: meta.isOwn,
      startsRun: meta.senderKey !== lastSender,
    });
    lastSender = meta.senderKey;
  }

  return items;
}
