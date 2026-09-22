"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleHelp,
  Lock,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn, avatarColorFor, initialsFor } from "@/lib/utils";
import { LogoMark } from "@/components/shared/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/lib/auth-client";
import { useNetworkStatus } from "@/features/offline/hooks/use-network-status";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/use-notifications";
import { useAccountActions } from "../hooks/use-account-actions";

/**
 * Icon rail — the narrow leftmost column on desktop (hidden on phones, where
 * <MobileNav /> takes its place). Chats, Search, Contacts, Notifications and
 * Settings all route to real pages; Help is still a placeholder.
 */
export function IconRail({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();
  const { data: sessionData } = useSession();
  const { lock, signOut } = useAccountActions();
  const { status: networkStatus } = useNetworkStatus();
  const { data: unreadNotifications } = useUnreadNotificationCount();
  const unreadNotificationCount = unreadNotifications?.count ?? 0;

  const user = sessionData?.user;
  const displayName = user?.name ?? user?.email ?? "Account";

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        aria-label="Primary"
        className="bg-rail hidden w-16 shrink-0 flex-col items-center gap-1 border-r py-3 md:flex"
      >
        <Link href="/conversations" className="mb-3 rounded-xl" aria-label="WhisperBox home">
          <LogoMark className="size-9" />
        </Link>

        <RailLink
          icon={<MessageCircle className="size-5.5" aria-hidden="true" />}
          label="Chats"
          active={pathname.startsWith("/conversations")}
          badge={unreadCount}
          href="/conversations"
        />
        <RailLink
          icon={<Search className="size-5.5" aria-hidden="true" />}
          label="Search"
          active={pathname.startsWith("/search")}
          href="/search"
        />
        <RailLink
          icon={<Users className="size-5.5" aria-hidden="true" />}
          label="Contacts"
          active={pathname.startsWith("/contacts")}
          href="/contacts"
        />
        <RailLink
          icon={<Bell className="size-5.5" aria-hidden="true" />}
          label="Notifications"
          active={pathname.startsWith("/notifications")}
          badge={unreadNotificationCount}
          href="/notifications"
        />

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <span
              role="status"
              aria-label={networkStatus === "online" ? "Online" : "Offline"}
              className="flex size-10 items-center justify-center"
            >
              {networkStatus === "online" ? (
                <Wifi className="text-primary size-4.5" aria-hidden="true" />
              ) : (
                <WifiOff className="text-muted-foreground size-4.5" aria-hidden="true" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right">
            {networkStatus === "online" ? "Online" : "Offline — messages will queue"}
          </TooltipContent>
        </Tooltip>

        <RailLink
          icon={<Settings className="size-5.5" aria-hidden="true" />}
          label="Settings"
          active={pathname.startsWith("/settings")}
          href="/settings"
        />

        <RailLink
          icon={<CircleHelp className="size-5.5" aria-hidden="true" />}
          label="Help"
          disabled
          disabledReason="Help — coming soon"
        />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mt-1 rounded-full outline-offset-2"
                  aria-label="Account menu"
                >
                  <Avatar className="size-9">
                    <AvatarFallback
                      style={{
                        backgroundColor: avatarColorFor(user?.id ?? "me"),
                        color: "#0b0d14",
                      }}
                    >
                      {initialsFor(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{displayName}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="end" className="w-52">
            <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => lock()}>
              <Lock className="size-4" aria-hidden="true" />
              Lock device
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void signOut()} variant="destructive">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </TooltipProvider>
  );
}

function RailLink({
  icon,
  label,
  active,
  disabled,
  disabledReason,
  badge,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  badge?: number;
  href?: string;
}) {
  const className = cn(
    "relative flex size-10 items-center justify-center rounded-full transition-colors",
    active
      ? "bg-foreground/10 text-foreground"
      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
    disabled && "pointer-events-none opacity-40",
  );

  const content = (
    <>
      {icon}
      {badge !== undefined && badge > 0 && (
        <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {href && !disabled ? (
          <Link
            href={href}
            className={className}
            aria-label={label}
            aria-current={active ? "page" : undefined}
          >
            {content}
          </Link>
        ) : (
          <button type="button" disabled className={className} aria-label={label}>
            {content}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{disabled ? disabledReason : label}</TooltipContent>
    </Tooltip>
  );
}
