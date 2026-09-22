"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import * as OfflineDb from "@/features/offline/services/offline-db";
import { useConversations } from "@/features/chat/hooks/use-conversations";
import { useContacts } from "@/features/contacts/hooks/use-contacts";
import { useIdentityStore } from "@/features/auth/store/identity-store";

import type { ConversationResponseDto } from "@/schemas/conversation.schema";
import { tryDecryptMessageText } from "@/features/search/utils/decrypt-for-search";

export interface MessageSearchResult {
  messageId: string;
  conversationId: string;
  snippet: string;
  createdAt: string;
}

const MIN_QUERY_LENGTH = 2;
const MAX_MESSAGE_RESULTS = 30;
/** Caps how many locally cached messages get decrypted for one search — decrypting isn't free, and this keeps a broad query on a large local cache from freezing the tab. Once this many messages have been scanned (across all conversations, newest-first within each), the scan stops even if under MAX_MESSAGE_RESULTS. */
const MAX_MESSAGES_SCANNED = 2000;

function conversationLabel(conversation: ConversationResponseDto): string {
  if (conversation.type === "GROUP") return conversation.name ?? "";
  return conversation.otherMember?.displayName ?? conversation.otherMember?.username ?? "";
}

function buildSnippet(text: string, normalizedQuery: string, radius = 40): string {
  const idx = text.toLowerCase().indexOf(normalizedQuery);
  if (idx === -1) return text.slice(0, radius * 2);
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + normalizedQuery.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export function useSearch(rawQuery: string) {
  const query = rawQuery.trim();
  const normalizedQuery = query.toLowerCase();
  const isSearching = normalizedQuery.length >= MIN_QUERY_LENGTH;

  const { data: conversations } = useConversations();
  const { data: contacts } = useContacts();
  const privateKey = useIdentityStore((state) => state.privateKey);

  const conversationResults = React.useMemo(() => {
    if (!conversations || !isSearching) return [];
    return conversations.filter((conversation) => {
      const label = conversationLabel(conversation).toLowerCase();
      const username = conversation.otherMember?.username?.toLowerCase() ?? "";
      return label.includes(normalizedQuery) || username.includes(normalizedQuery);
    });
  }, [conversations, normalizedQuery, isSearching]);

  const contactResults = React.useMemo(() => {
    if (!contacts || !isSearching) return [];
    return contacts.filter((contact) => {
      const name = (
        contact.nickname ??
        contact.user.displayName ??
        contact.user.username ??
        ""
      ).toLowerCase();
      const username = contact.user.username?.toLowerCase() ?? "";
      return name.includes(normalizedQuery) || username.includes(normalizedQuery);
    });
  }, [contacts, normalizedQuery, isSearching]);

  const messageSearch = useQuery<MessageSearchResult[]>({
    queryKey: ["search", "messages", normalizedQuery],
    queryFn: async () => {
      if (!privateKey) return [];

      const localConversations = await OfflineDb.getAllConversations();
      const results: MessageSearchResult[] = [];
      let scanned = 0;

      conversationLoop: for (const conversation of localConversations) {
        const messages = await OfflineDb.getMessagesForConversation(conversation.id);
        // Newest first within each conversation — `getMessagesForConversation`
        // returns oldest-first (see its doc comment), so walk it backwards.
        for (let i = messages.length - 1; i >= 0; i--) {
          if (scanned++ >= MAX_MESSAGES_SCANNED) break conversationLoop;

          const message = messages[i];
          if (!message || message.deleted) continue;

          const plaintext = await tryDecryptMessageText(message, privateKey);
          if (plaintext && plaintext.toLowerCase().includes(normalizedQuery)) {
            results.push({
              messageId: message.id,
              conversationId: conversation.id,
              snippet: buildSnippet(plaintext, normalizedQuery),
              createdAt: message.createdAt,
            });
            if (results.length >= MAX_MESSAGE_RESULTS) break conversationLoop;
          }
        }
      }

      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return results;
    },
    enabled: Boolean(privateKey) && isSearching,
    staleTime: 5_000,
  });

  return {
    query,
    isSearching,
    /** True only when message search can't run at all right now (no unlocked identity) — distinct from it having run and found nothing. */
    messagesUnavailable: isSearching && !privateKey,
    conversations: conversationResults,
    contacts: contactResults,
    messages: messageSearch.data ?? [],
    isLoadingMessages: messageSearch.isFetching,
  };
}
