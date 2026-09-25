"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";
  const themeResolved = resolvedTheme !== undefined;

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={themeResolved ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
      title={themeResolved ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
      onClick={() => {
        if (themeResolved) {
          setTheme(isDark ? "light" : "dark");
        }
      }}
      className={cn(
        "border-border/80 bg-background/75 hover:bg-background size-10 rounded-full shadow-sm backdrop-blur-md",
        className,
      )}
    >
      {themeResolved ? (
        isDark ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )
      ) : (
        <Moon className="size-4" />
      )}

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
