import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="noise bg-background relative flex min-h-screen flex-col overflow-hidden">
      {/* Background grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] mask-[linear-gradient(to_bottom,black_0%,transparent_90%)] bg-size-[24px_24px]"
      />

      {/* Header */}
      <header className="border-border/60 relative z-10 flex h-18 shrink-0 items-center justify-between border-b px-6 md:px-10">
        <Link
          href="/"
          className="text-foreground font-mono text-[17px] font-semibold tracking-[-0.04em]"
        >
          whisperbox<span className="text-primary">.</span>
        </Link>

        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground font-mono text-[11px] tracking-tight transition-colors"
        >
          sign in <span aria-hidden="true">↗</span>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex w-full flex-1 flex-col justify-center px-6 pt-20 pb-24 md:px-10 md:pt-24 md:pb-28 lg:pr-10 lg:pl-[15%]">
        <div className="max-w-162.5">
          {/* Eyebrow */}
          <div className="text-primary mb-8 flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
            <span className="bg-success pulse-soft size-1.5 rounded-full" />
            private by default
          </div>

          {/* Heading */}
          <h1 className="text-foreground max-w-170 text-[54px] leading-[0.98] font-semibold tracking-[-0.055em] sm:text-[68px] md:text-[76px]">
            A quieter place
            <br />
            <span className="text-muted-foreground">to talk.</span>
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mt-8 max-w-125 text-[15px] leading-[1.7] tracking-[-0.01em] sm:text-base lg:-ml-2">
            whisperbox keeps your conversations close. Messages are encrypted on your device before
            they travel anywhere.
          </p>

          {/* Actions */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-11 rounded-xl px-6 text-sm font-medium shadow-none"
            >
              <Link href="/register">
                Create your account
                <ArrowRight className="ml-1 size-4" aria-hidden="true" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/80 hover:bg-muted/30 h-11 rounded-xl bg-transparent px-6 text-sm font-medium shadow-none"
            >
              <Link href="/login">I already have one</Link>
            </Button>
          </div>
        </div>

        {/* Values */}
        <div className="border-border/60 mt-24 grid max-w-162.5 grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-3 sm:gap-4">
          <Value icon={<LockKeyhole />} label="encrypted" detail="on your device" />

          <Value icon={<KeyRound />} label="zero knowledge" detail="by design" />

          <Value icon={<Radio />} label="real time" detail="when connected" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border/60 text-muted-foreground relative z-10 flex shrink-0 items-center justify-between border-t px-6 py-5 font-mono text-[9px] tracking-[0.04em] md:px-10">
        <span>whisperbox / private conversations</span>

        <span className="hidden sm:block">nothing readable leaves your device</span>
      </footer>
    </main>
  );
}

function Value({ icon, label, detail }: { icon: React.ReactNode; label: string; detail: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-primary flex size-8 items-center justify-center">{icon}</span>

      <span className="font-mono text-[10px] leading-4">
        <span className="text-foreground block">{label}</span>

        <span className="text-muted-foreground block">{detail}</span>
      </span>
    </div>
  );
}
