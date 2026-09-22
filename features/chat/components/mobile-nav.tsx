"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, MessageCircle, Search, Settings, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notifications";
import { useConversations } from "../hooks/use-conversations";

const ITEMS = [
  { href: "/conversations", label: "Chats", icon: MessageCircle },
  { href: "/search", label: "Search", icon: Search },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Bottom tab bar for phones — the mobile counterpart of the desktop icon rail. Hidden inside an open chat. */
export function MobileNav() {
  const pathname = usePathname();
  const { data: conversations } = useConversations();
  const { data: unreadNotifications } = useUnreadNotificationCount();

  const badges: Record<string, number> = {
    "/conversations": conversations?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0,
    "/notifications": unreadNotifications?.count ?? 0,
  };

  return (
    <nav
      aria-label="Primary"
      className="bg-panel flex shrink-0 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        const badge = badges[href] ?? 0;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 pt-2 pb-2.5"
          >
            <span
              className={cn(
                "relative flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                active ? "bg-primary/15 text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5.5" aria-hidden="true" />
              {badge > 0 && (
                <span
                  className="bg-primary text-primary-foreground absolute top-0 right-2.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold"
                  aria-label={`${badge} unread`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            <span
              className={cn(
                "max-w-full truncate text-[11px] leading-none",
                active ? "text-foreground font-semibold" : "text-muted-foreground font-medium",
              )}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
