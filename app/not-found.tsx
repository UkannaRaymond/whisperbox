import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <div className="bg-accent text-accent-foreground flex size-12 items-center justify-center rounded-full">
        <LockKeyhole className="size-6" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold">Nothing sealed here</h1>
        <p className="text-muted-foreground max-w-sm text-sm text-balance">
          The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Back to WhisperBox</Link>
      </Button>
    </div>
  );
}
