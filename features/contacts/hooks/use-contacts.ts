"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { AddContactDto, ContactResponseDto, UpdateContactDto } from "@/schemas/contact.schema";

export const contactsQueryKey = ["contacts"] as const;

export function useContacts() {
  return useQuery<ContactResponseDto[]>({
    queryKey: contactsQueryKey,
    queryFn: () => apiFetch<ContactResponseDto[]>("/api/v1/contacts"),
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: AddContactDto) =>
      apiFetch<ContactResponseDto>("/api/v1/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsQueryKey });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: UpdateContactDto }) =>
      apiFetch<ContactResponseDto>(`/api/v1/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsQueryKey });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      await apiFetch<void>(`/api/v1/contacts/${contactId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsQueryKey });
    },
  });
}

export function useBlockContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) =>
      apiFetch<ContactResponseDto>(`/api/v1/contacts/${contactId}/block`, {
        method: "PUT",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsQueryKey });
    },
  });
}

export function useUnblockContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) =>
      apiFetch<ContactResponseDto>(`/api/v1/contacts/${contactId}/block`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactsQueryKey });
    },
  });
}
