"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { loginFormSchema, type LoginFormValues } from "../schemas/auth-form.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * Login form (10-FRONTEND.md § Core Screens: "Login").
 *
 * Submits via `authClient.signIn.email` (lib/auth-client.ts) — the real
 * Better Auth React client, not a mocked/placeholder call. As documented
 * there, this will currently fail server-side with a disabled-provider
 * error until `lib/auth.ts`'s `emailAndPassword.enabled` is flipped to
 * `true` (a backend change, out of scope for this stage) — the failure
 * path below is real and renders whatever error Better Auth actually
 * returns, not a stubbed message.
 */
export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError(
        error.message ?? "Unable to sign in. Please check your credentials and try again.",
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
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
          Sign in
        </Button>
      </motion.form>
    </Form>
  );
}
