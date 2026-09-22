"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { apiFetch, ApiRequestError } from "@/lib/api-client";
import { usernameFormSchema, type UsernameFormValues } from "../schemas/auth-form.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { FormError } from "./form-error";

/**
 * Username step, shown right after sign-up (`/onboarding/username`,
 * reached via `useRequireUsername` redirecting anyone signed in without
 * one). Used to live inline on the register form itself; splitting it out
 * keeps that form to just what Better Auth's sign-up needs and lets this
 * step stand on its own — same `POST /api/v1/users/me/profile` call
 * (schemas/user.schema.ts#createProfileSchema), just one screen later.
 */
export function SetUsernameForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameFormSchema),
    defaultValues: { username: "" },
  });

  async function onSubmit(values: UsernameFormValues) {
    setServerError(null);

    try {
      await apiFetch("/api/v1/users/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
    } catch (err) {
      setServerError(
        err instanceof ApiRequestError
          ? err.message
          : "Couldn't set your username. Please try again.",
      );
      return;
    }

    router.push("/conversations");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-base md:text-sm"
                >
                  @
                </span>
                <FormControl>
                  <Input
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="ada_lovelace"
                    className="h-11 pl-8"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormDescription>
                Lowercase letters, numbers, and underscores only. This is how people find you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && <FormError>{serverError}</FormError>}

        <Button
          type="submit"
          size="lg"
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          Continue
        </Button>
      </form>
    </Form>
  );
}
