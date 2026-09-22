"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Loader2, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { LogoMark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { signOut } from "@/lib/auth-client";
import { useIdentityStore } from "../store/identity-store";
import { FormError } from "./form-error";

/**
 * Wraps the whole signed-in app shell: until this device's encryption identity
 * is unlocked, the person sees this screen instead of the chat UI (on phones the
 * chat list and the conversation are separate screens, so the gate has to sit
 * above both).
 */
export function IdentityUnlockGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, error, checkStatus, createIdentity, unlock, resetDevice } = useIdentityStore();
  const [passphrase, setPassphrase] = React.useState("");
  const [confirmPassphrase, setConfirmPassphrase] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [confirmingReset, setConfirmingReset] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  React.useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  if (status === "checking") {
    return (
      <div className="bg-background flex min-h-dvh flex-1 flex-col items-center justify-center gap-5">
        <LogoMark className="size-14" />
        <Loader2
          className="text-muted-foreground size-5 animate-spin"
          aria-label="Checking encryption status"
        />
      </div>
    );
  }

  if (status === "unlocked") {
    return <>{children}</>;
  }

  const isFirstTime = status === "no-identity";
  const mismatch = isFirstTime && confirmPassphrase.length > 0 && passphrase !== confirmPassphrase;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (isFirstTime) {
        await createIdentity(passphrase);
      } else {
        await unlock(passphrase);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetDevice() {
    setResetting(true);
    try {
      await resetDevice();
      setPassphrase("");
      setConfirmPassphrase("");
      setConfirmingReset(false);
    } finally {
      setResetting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <AuthShell>
      <AnimatePresence mode="wait">
        <motion.div
          key={isFirstTime ? "create" : "unlock"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
            {isFirstTime ? (
              <ShieldCheck className="size-6" aria-hidden="true" />
            ) : (
              <KeyRound className="size-6" aria-hidden="true" />
            )}
          </div>

          <div className="mb-6 space-y-1.5">
            <h1 className="text-[26px] leading-tight font-bold tracking-[-0.03em]">
              {isFirstTime ? "Secure this device" : "Unlock your messages"}
            </h1>
            <p className="text-muted-foreground text-[15px] leading-6">
              {isFirstTime
                ? "Choose a passphrase to protect your encryption key on this device. It's never sent to the server."
                : "Enter your passphrase to decrypt messages on this device."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="passphrase">Passphrase</Label>
              <PasswordInput
                id="passphrase"
                autoComplete={isFirstTime ? "new-password" : "current-password"}
                autoFocus
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                required
                minLength={isFirstTime ? 8 : undefined}
                className="h-11"
              />
              {isFirstTime && (
                <p className="text-muted-foreground text-sm">
                  At least 8 characters. If you forget it, messages on this device can&apos;t be
                  recovered.
                </p>
              )}
            </div>

            {isFirstTime && (
              <div className="grid gap-2">
                <Label htmlFor="confirm-passphrase">Confirm passphrase</Label>
                <PasswordInput
                  id="confirm-passphrase"
                  autoComplete="new-password"
                  value={confirmPassphrase}
                  onChange={(event) => setConfirmPassphrase(event.target.value)}
                  required
                  minLength={8}
                  aria-invalid={mismatch}
                  className="h-11"
                />
                {mismatch && (
                  <p role="alert" className="text-destructive text-sm font-medium">
                    Passphrases do not match
                  </p>
                )}
              </div>
            )}

            {error && <FormError>{error}</FormError>}

            <Button
              type="submit"
              size="lg"
              disabled={
                submitting ||
                (isFirstTime
                  ? passphrase.length < 8 || passphrase !== confirmPassphrase
                  : passphrase.length === 0)
              }
              className="w-full"
            >
              {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {isFirstTime ? "Create encryption key" : "Unlock"}
            </Button>
          </form>

          {!isFirstTime && !confirmingReset && (
            <button
              type="button"
              onClick={() => setConfirmingReset(true)}
              className="text-muted-foreground hover:text-foreground mt-5 w-full text-center text-sm underline-offset-4 hover:underline"
            >
              Forgot your passphrase?
            </button>
          )}

          {!isFirstTime && confirmingReset && (
            <div className="border-destructive/30 bg-destructive/5 mt-5 flex flex-col gap-3 rounded-lg border p-3">
              <div className="flex gap-2">
                <TriangleAlert
                  className="text-destructive mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p className="text-sm">
                  Resetting removes the encryption key stored on THIS device only. Messages already
                  encrypted to your old key — on this device — won&apos;t be readable afterward.
                  You&apos;ll set a new passphrase and this device will re-register itself for new
                  messages.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmingReset(false)}
                  disabled={resetting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => void handleResetDevice()}
                  disabled={resetting}
                >
                  {resetting ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RotateCcw aria-hidden="true" />
                  )}
                  Reset this device
                </Button>
              </div>
            </div>
          )}

          <div className="border-border mt-6 border-t pt-4 text-center">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </AuthShell>
  );
}
