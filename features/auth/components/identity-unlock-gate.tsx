"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIdentityStore } from "../store/identity-store";

/**
 * Gates chat access behind unlocking (or first-time creating) this
 * device's RSA identity keypair — a minimal stand-in for
 * 10-FRONTEND.md's "Verify Device" screen, scoped to what's actually
 * needed to decrypt messages: the passphrase-derived key that decrypts
 * the private key stored in IndexedDB (features/encryption/services/
 * key-manager.service.ts). A fuller device-verification flow (fingerprint
 * comparison against a contact's device — the "Key fingerprint
 * comparison" feature in 07-CRYPTOGRAPHY.md — is NOT implemented here;
 * that's a separate, later piece of UI, not a passphrase gate.
 *
 * Sending messages does NOT require this — encrypting only needs
 * recipients' public keys, never this device's own private key (see
 * features/encryption/services/crypto.service.ts#encryptForRecipients).
 * This gate only blocks reading/decrypting, which does need it.
 */
export function IdentityUnlockGate({ children }: { children: React.ReactNode }) {
  const { status, error, checkStatus, createIdentity, unlock } = useIdentityStore();
  const [passphrase, setPassphrase] = React.useState("");
  const [confirmPassphrase, setConfirmPassphrase] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  if (status === "checking") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2
          className="text-muted-foreground size-6 animate-spin"
          aria-label="Checking encryption status"
        />
      </div>
    );
  }

  if (status === "unlocked") {
    return <>{children}</>;
  }

  const isFirstTime = status === "no-identity";

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

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={isFirstTime ? "create" : "unlock"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm"
        >
          <Card>
            <CardHeader className="items-center text-center">
              <div className="bg-primary text-primary-foreground mb-2 flex size-10 items-center justify-center rounded-full">
                {isFirstTime ? (
                  <ShieldCheck className="size-5" aria-hidden="true" />
                ) : (
                  <KeyRound className="size-5" aria-hidden="true" />
                )}
              </div>
              <CardTitle>{isFirstTime ? "Secure this device" : "Unlock your messages"}</CardTitle>
              <CardDescription>
                {isFirstTime
                  ? "Choose a passphrase to protect your encryption key on this device. It's never sent to the server."
                  : "Enter your passphrase to decrypt messages on this device."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                <div className="grid gap-2">
                  <Label htmlFor="passphrase">Passphrase</Label>
                  <Input
                    id="passphrase"
                    type="password"
                    autoComplete={isFirstTime ? "new-password" : "current-password"}
                    value={passphrase}
                    onChange={(event) => setPassphrase(event.target.value)}
                    required
                    // Only enforce a minimum length when CREATING a new
                    // passphrase. Applying the same rule to unlocking an
                    // EXISTING identity is wrong — if someone's real,
                    // already-stored passphrase happens to be shorter
                    // than this (e.g. set before this validation
                    // existed), the submit button silently stays
                    // disabled and clicking it does nothing at all, with
                    // no error shown — indistinguishable from a "broken"
                    // submit button.
                    minLength={isFirstTime ? 8 : undefined}
                  />
                </div>

                {isFirstTime && (
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-passphrase">Confirm passphrase</Label>
                    <Input
                      id="confirm-passphrase"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassphrase}
                      onChange={(event) => setConfirmPassphrase(event.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
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
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
