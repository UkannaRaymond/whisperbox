import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const avatarColors = ["#1d4ed8", "#15803d", "#a16207", "#be185d", "#6d28d9", "#0e7490"];

export function initialsFor(value?: string | null) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);

  if (!words.length) return "?";

  if (words.length === 1) {
    return words[0]?.[0]?.toUpperCase() ?? "?";
  }

  return `${words[0]?.[0] ?? ""}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function avatarColorFor(value?: string | null) {
  const input = value ?? "";

  const hash = [...input].reduce((total, character) => total + character.charCodeAt(0), 0);

  return avatarColors[hash % avatarColors.length];
}

export function formatConversationTimestamp(value?: string | number | Date | null) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();

  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const differenceInMs = now.getTime() - date.getTime();
  const differenceInDays = differenceInMs / (1000 * 60 * 60 * 24);

  if (differenceInDays >= 0 && differenceInDays < 7) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export type DevicePlatform = "WINDOWS" | "MACOS" | "LINUX" | "ANDROID" | "IOS" | "WEB";

export function detectDevicePlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "WEB";

  const userAgent = navigator.userAgent;
  const platform = navigator.platform ?? "";

  if (/Android/i.test(userAgent)) return "ANDROID";

  if (/iPhone|iPad|iPod/i.test(userAgent)) return "IOS";

  if (/Windows/i.test(userAgent) || /Win/i.test(platform)) {
    return "WINDOWS";
  }

  if (/Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform)) {
    return "MACOS";
  }

  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) {
    return "LINUX";
  }

  return "WEB";
}

export function getOrCreateDeviceIdentifier() {
  const key = "whisperbox:device-identifier";

  if (typeof window === "undefined") {
    return "server-device";
  }

  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const identifier =
    typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, identifier);

  return identifier;
}
