"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { avatarColorFor, initialsFor } from "@/lib/utils";
import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { useContacts } from "@/features/contacts/hooks/use-contacts";

interface NewGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * "Start a group" — picks members from the caller's contacts
 * (features/contacts, built alongside this) rather than requiring
 * usernames typed one at a time. Creates a GROUP conversation via the
 * same `POST /v1/conversations` endpoint `new-conversation-dialog.tsx`
 * uses for DIRECT ones — `createConversationSchema` already supports
 * both; only the UI for GROUP was missing.
 */
export function NewGroupDialog({ open, onOpenChange }: NewGroupDialogProps) {
  const router = useRouter();
  const { data: contacts, isLoading: isLoadingContacts } = useContacts();
  const [name, setName] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setName("");
    setSelected(new Set());
    setError(null);
  }

  function toggleMember(contactId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || selected.size === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const conversation = await apiFetch<{ id: string }>("/api/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          name: name.trim(),
          memberIds: Array.from(selected),
        }),
      });

      reset();
      onOpenChange(false);
      router.push(`/conversations/${conversation.id}`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't create that group.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>Name the group and pick members from your contacts.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-group-name">Group name</Label>
              <Input
                id="new-group-name"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Weekend trip"
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label>Members</Label>
              {isLoadingContacts && (
                <div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading contacts…
                </div>
              )}
              {!isLoadingContacts && contacts?.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  You don't have any contacts yet — add some first.
                </p>
              )}
              {!!contacts?.length && (
                <ScrollArea className="h-56 rounded-md border">
                  <div className="flex flex-col p-1">
                    {contacts
                      .filter((contact) => !contact.blocked)
                      .map((contact) => {
                        const label =
                          contact.nickname ?? contact.user.displayName ?? contact.user.username ?? "Unknown";
                        return (
                          <label
                            key={contact.id}
                            htmlFor={`new-group-member-${contact.contactId}`}
                            className="hover:bg-accent flex cursor-pointer items-center gap-3 rounded-md px-2 py-2"
                          >
                            <Checkbox
                              id={`new-group-member-${contact.contactId}`}
                              checked={selected.has(contact.contactId)}
                              onCheckedChange={() => toggleMember(contact.contactId)}
                            />
                            <Avatar className="size-7">
                              <AvatarFallback
                                style={{
                                  backgroundColor: avatarColorFor(contact.contactId),
                                  color: "#0b0d14",
                                }}
                              >
                                {initialsFor(label)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm">{label}</span>
                          </label>
                        );
                      })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || !name.trim() || selected.size === 0}>
              {isSubmitting ? "Creating…" : `Create group${selected.size ? ` (${selected.size})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
