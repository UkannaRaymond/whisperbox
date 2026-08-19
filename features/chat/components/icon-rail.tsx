"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Lock,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  CircleHelp,
  Users,
  Bell,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn, avatarColorFor, initialsFor } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "@/lib/auth-client";
import { useIdentityStore } from "@/features/auth/store/identity-store";
import { useNetworkStatus } from "@/features/offline/hooks/use-network-status";

/**
 * Icon rail — the narrow leftmost column in the reference screenshot's
 * "NexMessage" layout, previously absent entirely (WhisperBox had a
 * single "Messages" panel and nothing else). Every icon here either does
 * something real or is honestly disabled with a tooltip explaining why —
 * this app has no contacts/notifications/settings pages built yet, and
 * faking those destinations would be worse than not having the icon.
 */
export function IconRail({
  unreadCount,
  onSearchClick,
}: {
  unreadCount: number;
  onSearchClick: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData } = useSession();
  const lock = useIdentityStore((state) => state.lock);
  const { status: networkStatus } = useNetworkStatus();

  const user = sessionData?.user;
  const displayName = user?.name ?? user?.email ?? "Account";

  async function handleSignOut() {
    lock();
    await signOut();
    router.push("/login");
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="bg-sidebar flex w-14 shrink-0 flex-col items-center gap-1 border-r py-3">
        <Link
          href="/conversations"
          className="bg-primary text-primary-foreground mb-2 flex size-9 items-center justify-center rounded-xl"
          aria-label="WhisperBox home"
        >
          <MessageCircle className="size-5" aria-hidden="true" />
        </Link>

        <RailButton
          icon={<MessageCircle className="size-5" aria-hidden="true" />}
          label="Chats"
          active={pathname.startsWith("/conversations")}
          badge={unreadCount > 0 ? unreadCount : undefined}
          href="/conversations"
        />

        <RailButton
          icon={<Search className="size-5" aria-hidden="true" />}
          label="Search"
          onClick={onSearchClick}
        />

        <RailButton
          icon={<Users className="size-5" aria-hidden="true" />}
          label="Contacts"
          disabled
          disabledReason="Contacts — coming soon"
        />

        <RailButton
          icon={<Bell className="size-5" aria-hidden="true" />}
          label="Notifications"
          disabled
          disabledReason="Notifications — coming soon"
        />

        <div className="flex-1" />

        <RailButton
          icon={
            networkStatus === "online" ? (
              <Wifi className="size-5 text-green-500" aria-hidden="true" />
            ) : (
              <WifiOff className="size-5 text-muted-foreground/50" aria-hidden="true" />
            )
          }
          label={networkStatus === "online" ? "Online" : "Offline"}
          muted={networkStatus !== "online"}
        />

        <RailButton
          icon={<Settings className="size-5" aria-hidden="true" />}
          label="Settings"
          disabled
          disabledReason="Settings — coming soon"
        />

        <RailButton
          icon={<CircleHelp className="size-5" aria-hidden="true" />}
          label="Help"
          disabled
          disabledReason="Help — coming soon"
        />

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1 size-9 rounded-full p-0"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    <AvatarFallback
                      style={{
                        backgroundColor: avatarColorFor(user?.id ?? "me"),
                        color: "#0b0d14",
                      }}
                    >
                      {initialsFor(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{displayName}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => lock()}>
              <Lock className="size-4" aria-hidden="true" />
              Lock device
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>
    </TooltipProvider>
  );
}

function RailButton({
  icon,
  label,
  active,
  muted,
  disabled,
  disabledReason,
  badge,
  onClick,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  muted?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  badge?: number;
  onClick?: () => void;
  href?: string;
}) {
  const className = cn(
    "relative size-9 rounded-lg",
    active && "bg-primary/15 text-primary",
    muted && "text-muted-foreground/50",
  );

  const content = (
    <>
      {icon}
      {badge !== undefined && <RailBadge count={badge} />}
    </>
  );

  const button = href ? (
    <Button variant="ghost" size="icon" className={className} aria-label={label} asChild>
      <Link href={href}>{content}</Link>
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      onClick={onClick}
      className={className}
      aria-label={label}
    >
      {content}
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{disabled ? disabledReason : label}</TooltipContent>
    </Tooltip>
  );
}

function RailBadge({ count }: { count: number }) {
  return (
    <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
      {count > 99 ? "99+" : count}
    </Badge>
  );
}
