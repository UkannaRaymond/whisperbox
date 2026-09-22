"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquare, Search, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { avatarColorFor, formatConversationTimestamp, initialsFor } from "@/lib/utils";
import { useIdentityStore } from "@/features/auth/store/identity-store";

import type { ConversationResponseDto } from "@/schemas/conversation.schema";
import type { ContactResponseDto } from "@/schemas/contact.schema";
import { MessageSearchResult, useSearch } from "@/features/chat/hooks/use-search";

/** Search — the destination behind the icon rail's "Search" button, which previously only focused the sidebar's inline conversation-name filter. See use-search.ts's doc comment for what this can and can't find, and why. */
export function SearchPanel() {
  const [query, setQuery] = React.useState("");
  const router = useRouter();
  const status = useIdentityStore((state) => state.status);
  const { isSearching, messagesUnavailable, conversations, contacts, messages, isLoadingMessages } =
    useSearch(query);

  const hasAnyResults = conversations.length > 0 || contacts.length > 0 || messages.length > 0;

  return (
    <div className="flex h-full flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="mb-3 text-lg font-semibold">Search</h1>
        <div className="relative">
          <Search
            className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search conversations, contacts, and messages"
            className="pl-8"
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 px-6 py-4">
          {!isSearching && (
            <p className="text-muted-foreground py-16 text-center text-sm">
              Type at least 2 characters to search.
            </p>
          )}

          {isSearching && !hasAnyResults && !isLoadingMessages && (
            <p className="text-muted-foreground py-16 text-center text-sm">
              No results for "{query}".
            </p>
          )}

          {conversations.length > 0 && (
            <ResultSection title="Conversations">
              {conversations.map((conversation) => (
                <ConversationResultRow
                  key={conversation.id}
                  conversation={conversation}
                  onClick={() => router.push(`/conversations/${conversation.id}`)}
                />
              ))}
            </ResultSection>
          )}

          {contacts.length > 0 && (
            <ResultSection title="Contacts" icon={<Users className="size-4" aria-hidden="true" />}>
              {contacts.map((contact) => (
                <ContactResultRow key={contact.id} contact={contact} />
              ))}
            </ResultSection>
          )}

          {isSearching && (
            <ResultSection
              title="Messages"
              icon={<MessageSquare className="size-4" aria-hidden="true" />}
            >
              {isLoadingMessages && messages.length === 0 && (
                <div className="text-muted-foreground flex items-center gap-2 px-1 py-3 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Searching your synced messages…
                </div>
              )}

              {messagesUnavailable && (
                <p className="text-muted-foreground px-1 py-3 text-sm">
                  Unlock your messages to search their contents.
                </p>
              )}

              {!messagesUnavailable &&
                !isLoadingMessages &&
                messages.length === 0 &&
                isSearching && (
                  <p className="text-muted-foreground px-1 py-3 text-sm">
                    No matching messages found on this device.
                  </p>
                )}

              {messages.map((result) => (
                <MessageResultRow
                  key={result.messageId}
                  result={result}
                  onClick={() => router.push(`/conversations/${result.conversationId}`)}
                />
              ))}

              {messages.length > 0 && (
                <p className="text-muted-foreground px-1 pt-1 text-xs">
                  Only searches messages already synced to this device.
                </p>
              )}
            </ResultSection>
          )}

          {status !== "unlocked" && isSearching && (
            <p className="text-muted-foreground text-center text-xs">
              Some results may be limited until your messages are unlocked.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ResultSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="text-muted-foreground flex items-center gap-1.5 px-1 text-xs font-medium tracking-wide uppercase">
        {icon}
        {title}
      </h2>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function ConversationResultRow({
  conversation,
  onClick,
}: {
  conversation: ConversationResponseDto;
  onClick: () => void;
}) {
  const label =
    conversation.type === "GROUP"
      ? (conversation.name ?? "Group")
      : (conversation.otherMember?.displayName ??
        conversation.otherMember?.username ??
        "Direct message");

  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex items-center gap-3 rounded-lg px-2 py-2 text-left"
    >
      <Avatar className="size-9">
        <AvatarFallback
          style={{ backgroundColor: avatarColorFor(conversation.id), color: "#0b0d14" }}
        >
          {initialsFor(label)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {conversation.otherMember?.username && (
          <p className="text-muted-foreground truncate text-xs">
            @{conversation.otherMember.username}
          </p>
        )}
      </div>
    </button>
  );
}

function ContactResultRow({ contact }: { contact: ContactResponseDto }) {
  const router = useRouter();
  const name = contact.nickname ?? contact.user.displayName ?? contact.user.username ?? "Unknown";

  return (
    <button
      type="button"
      onClick={() => router.push("/contacts")}
      className="hover:bg-accent flex items-center gap-3 rounded-lg px-2 py-2 text-left"
    >
      <Avatar className="size-9">
        <AvatarFallback
          style={{ backgroundColor: avatarColorFor(contact.contactId), color: "#0b0d14" }}
        >
          {initialsFor(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {contact.user.username && (
          <p className="text-muted-foreground truncate text-xs">@{contact.user.username}</p>
        )}
      </div>
    </button>
  );
}

function MessageResultRow({
  result,
  onClick,
}: {
  result: MessageSearchResult;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent flex flex-col gap-0.5 rounded-lg px-2 py-2 text-left"
    >
      <p className="line-clamp-2 text-sm">{result.snippet}</p>
      <p className="text-muted-foreground text-xs">
        {formatConversationTimestamp(result.createdAt)}
      </p>
    </button>
  );
}
