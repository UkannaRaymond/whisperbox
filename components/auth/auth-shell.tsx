import Link from "next/link";
import { Lock } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

/**
 * Shared frame for every pre-chat screen (sign in, sign up, username step,
 * device unlock): a deep brand band across the top with a card overlapping it.
 * Plain markup only, so it works from both server and client components.
 */
export function AuthShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="chat-wallpaper flex min-h-dvh flex-1 flex-col">
      <div aria-hidden="true" className="bg-brand-deep absolute inset-x-0 top-0 h-60 sm:h-64" />

      <div className="relative z-10 mx-auto flex w-full max-w-115 flex-1 flex-col px-4 pt-6 pb-8 sm:pt-10">
        <Link
          href="/"
          className="text-brand-deep-foreground mb-7 self-start rounded-md outline-offset-4"
        >
          <Logo variant="inverse" />
        </Link>

        <div className={cn("bg-card rounded-2xl p-6 shadow-xl shadow-black/10 sm:p-8", className)}>
          {children}
        </div>

        <p className="text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-center text-[13px]">
          <Lock className="size-3.5" aria-hidden="true" />
          Your messages are end-to-end encrypted
        </p>
      </div>
    </div>
  );
}

export function AuthHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 space-y-1.5">
      <h1 className="text-[26px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
      <p className="text-muted-foreground text-[15px] leading-6">{description}</p>
    </div>
  );
}
