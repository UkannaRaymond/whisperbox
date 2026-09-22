"use client";

import * as React from "react";
import { Loader2, Plus, ShieldBan, Trash2, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, initialsFor, avatarColorFor } from "@/lib/utils";
import { ApiRequestError } from "@/lib/api-client";
import {
  useAddContact,
  useBlockContact,
  useContacts,
  useRemoveContact,
  useUnblockContact,
} from "@/features/contacts/hooks/use-contacts";

export function ContactsPanel() {
  const { data: contacts, isLoading, isError } = useContacts();
  const addContact = useAddContact();
  const removeContact = useRemoveContact();
  const blockContact = useBlockContact();
  const unblockContact = useUnblockContact();
  const [handle, setHandle] = React.useState("");
  const [showBlocked, setShowBlocked] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const visibleContacts = contacts?.filter((contact) => contact.blocked === showBlocked) ?? [];

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = handle.trim();
    if (!value) return;
    setError(null);

    try {
      await addContact.mutateAsync({ handle: value });
      setHandle("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't add this contact.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Contacts</h1>
            <p className="text-muted-foreground text-sm">People you can start conversations with.</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBlocked((value) => !value)}
          >
            {showBlocked ? "Show contacts" : "Show blocked"}
          </Button>
        </div>

        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <Input
            value={handle}
            onChange={(event) => setHandle(event.target.value)}
            placeholder="Username or email"
            aria-label="Username or email"
          />
          <Button type="submit" disabled={!handle.trim() || addContact.isPending}>
            {addContact.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Add
          </Button>
        </form>
        {error && <p className="text-destructive mt-2 text-sm">{error}</p>}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          {isLoading && (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading contacts…
            </div>
          )}

          {isError && (
            <p className="text-destructive py-16 text-center text-sm">
              Couldn't load your contacts. Try refreshing.
            </p>
          )}

          {!isLoading && !isError && visibleContacts.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center text-sm">
              <UserRound className="size-8" aria-hidden="true" />
              <p>{showBlocked ? "No blocked contacts." : "You have no contacts yet."}</p>
            </div>
          )}

          <div className="space-y-2">
            {visibleContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-card flex items-center gap-3 rounded-xl border p-3"
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                    avatarColorFor(contact.user.displayName ?? contact.user.username),
                  )}
                >
                  {initialsFor(contact.user.displayName ?? contact.user.username)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {contact.nickname || contact.user.displayName || contact.user.username || "Unnamed user"}
                  </p>
                  {contact.nickname && contact.user.username && (
                    <p className="text-muted-foreground truncate text-xs">@{contact.user.username}</p>
                  )}
                  <p className="text-muted-foreground text-xs">{contact.blocked ? "Blocked" : contact.user.status}</p>
                </div>

                {contact.blocked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={unblockContact.isPending}
                    onClick={() => unblockContact.mutate(contact.contactId)}
                  >
                    Unblock
                  </Button>
                ) : (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Block ${contact.user.displayName ?? contact.user.username ?? "contact"}`}
                      disabled={blockContact.isPending}
                      onClick={() => blockContact.mutate(contact.contactId)}
                    >
                      <ShieldBan className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${contact.user.displayName ?? contact.user.username ?? "contact"}`}
                      disabled={removeContact.isPending}
                      onClick={() => removeContact.mutate(contact.contactId)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
