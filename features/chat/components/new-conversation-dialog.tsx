"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body: ApiEnvelope<T> = await response.json();
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error?.message ?? `Request to ${path} failed (${response.status})`);
  }
  return body.data;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Start a conversation with ___" — the caller types a username or email
 * (not a raw user id, which nobody has memorized) and this resolves it via
 * `GET /api/v1/users/lookup`, then creates (or reuses, per
 * conversation.service.ts's existing-direct-conversation check) a DIRECT
 * conversation via `POST /api/v1/conversations`.
 *
 * This intentionally skips a full contacts-first flow (send/accept a
 * contact request before messaging) — that's a separate, larger feature
 * (features/contacts/actions is still an empty stub) that whoever's
 * building contacts next can layer on top of this.
 */
export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const router = useRouter();
  const [handle, setHandle] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!handle.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await apiFetch<{ id: string }>(
        `/api/v1/users/lookup?handle=${encodeURIComponent(handle.trim())}`,
      );

      const conversation = await apiFetch<{ id: string }>("/api/v1/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "DIRECT", memberIds: [user.id] }),
      });

      setHandle("");
      onOpenChange(false);
      router.push(`/conversations/${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start that conversation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New conversation</DialogTitle>
            <DialogDescription>
              Enter the username or email of the person you want to message.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-4">
            <Label htmlFor="new-conversation-handle">Username or email</Label>
            <Input
              id="new-conversation-handle"
              autoFocus
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder="e.g. alice or alice@example.com"
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !handle.trim()}>
              {isSubmitting ? "Starting…" : "Start conversation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
