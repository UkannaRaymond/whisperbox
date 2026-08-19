import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";

import {
  cn,
  getOrCreateDeviceIdentifier,
  detectDevicePlatform,
  avatarColorFor,
  initialsFor,
  formatConversationTimestamp,
} from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-4")).toBe("px-2 py-4");
  });

  it("resolves conflicting tailwind utilities in favor of the last one", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    expect(cn("px-2", false && "hidden", undefined, "py-2")).toBe("px-2 py-2");
  });
});

describe("getOrCreateDeviceIdentifier", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("generates and persists a device id on first call", () => {
    const first = getOrCreateDeviceIdentifier();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(window.localStorage.getItem("whisperbox:device-identifier")).toBe(first);
  });

  it("returns the same id on every subsequent call (stable per browser install)", () => {
    const first = getOrCreateDeviceIdentifier();
    const second = getOrCreateDeviceIdentifier();
    expect(second).toBe(first);
  });
});

describe("detectDevicePlatform", () => {
  function withUserAgent(userAgent: string, fn: () => void) {
    const original = window.navigator.userAgent;
    Object.defineProperty(window.navigator, "userAgent", { value: userAgent, configurable: true });
    try {
      fn();
    } finally {
      Object.defineProperty(window.navigator, "userAgent", { value: original, configurable: true });
    }
  }

  it("detects Android", () => {
    withUserAgent("Mozilla/5.0 (Linux; Android 14)", () => {
      expect(detectDevicePlatform()).toBe("ANDROID");
    });
  });

  it("detects iOS", () => {
    withUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", () => {
      expect(detectDevicePlatform()).toBe("IOS");
    });
  });

  it("detects macOS", () => {
    withUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", () => {
      expect(detectDevicePlatform()).toBe("MACOS");
    });
  });

  it("detects Windows", () => {
    withUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", () => {
      expect(detectDevicePlatform()).toBe("WINDOWS");
    });
  });

  it("falls back to WEB for an unrecognized user agent", () => {
    withUserAgent("SomeExoticBrowser/1.0", () => {
      expect(detectDevicePlatform()).toBe("WEB");
    });
  });
});

describe("avatarColorFor", () => {
  it("is deterministic — the same id always gets the same color", () => {
    const a = avatarColorFor("user-123");
    const b = avatarColorFor("user-123");
    expect(a).toBe(b);
  });

  it("returns a color string for different ids (not necessarily different colors)", () => {
    expect(avatarColorFor("user-1")).toMatch(/^#[0-9a-f]{6}$/i);
    expect(avatarColorFor("user-2")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("initialsFor", () => {
  it("takes first+last initials for a full name", () => {
    expect(initialsFor("Jordan Hayes")).toBe("JH");
  });

  it("takes a single initial for a one-word name", () => {
    expect(initialsFor("product-team")).toBe("P");
  });

  it("ignores extra whitespace", () => {
    expect(initialsFor("  Sarah   Chen  ")).toBe("SC");
  });

  it("falls back to '?' for an empty name", () => {
    expect(initialsFor("")).toBe("?");
  });
});

describe("formatConversationTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T18:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a clock time for a timestamp from earlier today", () => {
    const result = formatConversationTimestamp("2026-06-15T14:23:00.000Z");
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it("shows a weekday abbreviation for a timestamp within the last week", () => {
    const result = formatConversationTimestamp("2026-06-12T14:23:00.000Z");
    expect(result).toMatch(/^[A-Z][a-z]{2}$/);
  });

  it("shows a short date for a timestamp older than a week", () => {
    const result = formatConversationTimestamp("2026-01-01T14:23:00.000Z");
    expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}/);
  });
});
