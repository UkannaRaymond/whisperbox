"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
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
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input autoComplete="username" placeholder="ada_lovelace" {...field} />
              </FormControl>
              <FormDescription>
                Lowercase letters, numbers, and underscores only. This is how people find you.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p role="alert" className="text-destructive text-sm font-medium">
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
          Continue
        </Button>
      </motion.form>
    </Form>
  );
}
