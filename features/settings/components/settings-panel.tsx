"use client";

import * as React from "react";
import { Loader2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserResponseDto } from "@/schemas/user.schema";
import { useAccountActions } from "@/features/chat/hooks/use-account-actions";

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { lock, signOut } = useAccountActions();
  const {
    data: me,
    isLoading,
    isError,
  } = useQuery<UserResponseDto>({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch<UserResponseDto>("/api/v1/users/me"),
  });
  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);

    try {
      const updated = await apiFetch<UserResponseDto>("/api/v1/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
          bio: bio.trim(),
          ...(avatarUrl.trim() ? { avatarUrl: avatarUrl.trim() } : {}),
        }),
      });
      queryClient.setQueryData(["users", "me"], updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't save your profile.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !me) {
    return <p className="text-destructive p-6 text-sm">Couldn&apos;t load your settings.</p>;
  }

  return (
    <div className="min-h-full overflow-y-auto">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Manage your profile, appearance, and device session.
        </p>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-8 p-6">
        <section className="space-y-4">
          <div>
            <h2 className="font-medium">Profile</h2>
            <p className="text-muted-foreground text-sm">
              Your username is used by other people to find you.
            </p>
          </div>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="settings-username" className="text-sm font-medium">
                Username
              </label>
              <Input id="settings-username" value={`@${me.username ?? ""}`} disabled />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-email" className="text-sm font-medium">
                Email
              </label>
              <Input id="settings-email" value={me.email} disabled />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-display-name" className="text-sm font-medium">
                Display name
              </label>
              <Input
                id="settings-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={64}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-avatar" className="text-sm font-medium">
                Avatar URL
              </label>
              <Input
                id="settings-avatar"
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-bio" className="text-sm font-medium">
                Bio
              </label>
              <Textarea
                id="settings-bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                maxLength={280}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            {saved && <p className="text-sm">Profile saved.</p>}
            <Button type="submit">Save profile</Button>
          </form>
        </section>

        <section className="space-y-4 border-t pt-6">
          <div>
            <h2 className="font-medium">Appearance</h2>
            <p className="text-muted-foreground text-sm">Choose the theme used by this device.</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              <Sun className="size-4" aria-hidden="true" /> Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
              <Moon className="size-4" aria-hidden="true" /> Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
            >
              System
            </Button>
          </div>
        </section>

        <section className="space-y-4 border-t pt-6">
          <div>
            <h2 className="font-medium">Session</h2>
            <p className="text-muted-foreground text-sm">
              Lock your encryption identity or sign out.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={lock}>
              Lock device
            </Button>
            <Button variant="destructive" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
