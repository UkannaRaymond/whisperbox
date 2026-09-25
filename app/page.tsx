import Link from "next/link";
import { CloudOff, FileLock2, KeyRound, Lock } from "lucide-react";

import { HeroChatDemo } from "@/components/landing/hero-chat-demo";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Messaging, Without the Trust",
  description:
    "WhisperBox provides end-to-end encrypted messaging where your conversations are encrypted on your device before they are sent.",
};

const FEATURES = [
  {
    icon: KeyRound,
    title: "Locked before it leaves your device",
    body: "Each message is encrypted with keys that stay on your devices. The server only ever handles scrambled data.",
  },
  {
    icon: CloudOff,
    title: "Keeps working offline",
    body: "Write without a connection. Your messages wait in a queue and send the moment you're back online.",
  },
  {
    icon: FileLock2,
    title: "Files are private too",
    body: "Photos and documents up to 500 MB are encrypted the same way as your messages.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col">
        {/* Hero: the product's own wallpaper, with the product on it. */}
        <section className="chat-wallpaper">
          <header className="relative z-10 mx-auto flex h-18 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
            <Link href="/" className="rounded-md" aria-label="WhisperBox home">
              <Logo />
            </Link>
            <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
              <ThemeToggle className="mr-1 sm:mr-2" />
              <Button asChild variant="ghost" size="sm" className="text-sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="text-sm">
                <Link href="/register">Get started</Link>
              </Button>
            </nav>
          </header>

          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-16 lg:pb-28">
            <div className="relative z-10">
              <div className="border-primary/20 bg-background/55 text-primary mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-md">
                <span className="bg-primary size-1.5 animate-pulse rounded-full" />
                Private by design
              </div>
              <h1 className="max-w-xl text-[42px] leading-[1.02] font-bold tracking-[-0.045em] text-balance sm:text-[56px] lg:text-[64px]">
                Messaging that stays between you and them
              </h1>
              <p className="text-muted-foreground mt-6 max-w-lg text-lg leading-8 text-pretty">
                WhisperBox encrypts every message on your device before it&apos;s sent. Not even our
                servers can read what you write.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-7 text-base">
                  <Link href="/register">Create your account</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-background/70 h-12 px-7 text-base"
                >
                  <Link href="/login">I already have one</Link>
                </Button>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                All you need is an email address.
              </p>
            </div>

            <div className="relative z-10 lg:translate-y-2">
              <div
                className="bg-primary/10 absolute -inset-5 -z-10 rounded-4xl blur-2xl"
                aria-hidden="true"
              />
              <HeroChatDemo />
            </div>
          </div>
        </section>

        {/* Why it's private */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <h2 className="max-w-2xl text-[30px] leading-[1.1] font-bold tracking-[-0.035em] text-balance sm:text-[38px]">
              Privacy that doesn&apos;t depend on trusting us
            </h2>

            <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title}>
                  <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                    <Icon className="size-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm text-base leading-7">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="bg-brand-deep text-brand-deep-foreground">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-[30px] leading-[1.1] font-bold tracking-[-0.035em] sm:text-[36px]">
                Start a private conversation
              </h2>
              <p className="mt-3 max-w-md text-base leading-7 text-white/80">
                Create an account, set a passphrase for this device, and invite someone you trust.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              className="h-12 shrink-0 bg-white px-7 text-base text-[#06503f] hover:bg-white/90"
            >
              <Link href="/register">Create your account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-background border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-2 px-5 py-6 text-sm sm:flex-row sm:items-center sm:px-8">
          <span className="flex items-center gap-1.5">
            <Lock className="size-3.5" aria-hidden="true" />
            Your messages are end-to-end encrypted
          </span>
          <span>© {new Date().getFullYear()} WhisperBox</span>
        </div>
      </footer>
    </div>
  );
}
