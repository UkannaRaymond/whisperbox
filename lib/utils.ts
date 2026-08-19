import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicting utility classes
 * (e.g. `px-2` vs `px-4`) in favor of the last one supplied.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const DEVICE_IDENTIFIER_STORAGE_KEY = "whisperbox:device-identifier";

/**
 * A stable id for *this browser install*, persisted in localStorage (not
 * secure storage — it's not a secret, just a way to tell "the same
 * physical device logging in again" apart from "a brand new device"). Used
 * by `POST /v1/devices` (features/auth/store/identity-store.ts) so
 * re-registering the same device's key on every login updates one row via
 * `findOrCreate` instead of piling up a new `Device` row each time.
 */
export function getOrCreateDeviceIdentifier(): string {
  if (typeof window === "undefined") return "server";

  const existing = window.localStorage.getItem(DEVICE_IDENTIFIER_STORAGE_KEY);
  if (existing) return existing;

  const generated = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_IDENTIFIER_STORAGE_KEY, generated);
  return generated;
}

/** Best-effort platform guess for `Device.platform`, from the UA string. Falls back to WEB. */
export function detectDevicePlatform(): "WINDOWS" | "MACOS" | "LINUX" | "ANDROID" | "IOS" | "WEB" {
  if (typeof navigator === "undefined") return "WEB";

  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "ANDROID";
  if (/iphone|ipad|ipod/i.test(ua)) return "IOS";
  if (/mac/i.test(ua)) return "MACOS";
  if (/win/i.test(ua)) return "WINDOWS";
  if (/linux/i.test(ua)) return "LINUX";
  return "WEB";
}

/**
 * A fixed palette of avatar background colors, each picked to read
 * clearly against the dark "sealed correspondence" surface
 * (app/globals.css) at both the icon-rail and list-item sizes this is
 * used at. Deliberately not the `--primary` violet for every avatar —
 * that's reserved for the app's own accent (active states, the compose
 * button, sent-message bubbles); contact avatars get their own varied
 * identity so the eye can tell people apart at a glance in a long list,
 * the same way a real contacts app assigns each person a stable color.
 */
const AVATAR_PALETTE = [
  "#2dd4bf", // teal
  "#f472b6", // pink
  "#a78bfa", // violet
  "#4ade80", // green
  "#fb923c", // orange
  "#60a5fa", // blue
  "#facc15", // yellow
  "#fb7185", // rose
] as const;

/** Deterministic per-id avatar color — the same user/conversation always gets the same color, without a color column anywhere in the schema. */
export function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index]!;
}

/** Initials for an avatar fallback — "Jordan Hayes" -> "JH", "product-team" -> "P". Mirrors how real chat apps derive initials from a display name, not just the first letter. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

/**
 * Conversation-list-style relative timestamp: clock time for today
 * ("10:42"), weekday abbreviation for the last 7 days ("Tue"), and a
 * short date beyond that — the same three-tier scheme most chat apps
 * use so a list of dozens of conversations stays scannable instead of
 * showing a full timestamp on every row.
 */
export function formatConversationTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAgo = Math.floor((startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (daysAgo <= 0) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  if (daysAgo < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
