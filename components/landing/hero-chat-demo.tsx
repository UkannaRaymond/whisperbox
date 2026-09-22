"use client";

import * as React from "react";
import { Check, CheckCheck, Clock, Lock, Send } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { cn, avatarColorFor } from "@/lib/utils";
import { BubbleFrame, BubbleSpacer } from "@/features/chat/components/bubble-frame";

const PLAINTEXT = "Landed! Sending the address now.";
const REPLY = "Perfect, see you soon";
const GLYPHS = "0123456789abcdef";

/** Fixed placeholder so server and client render identical markup before the effect runs. */
const SEALED = "9f3ac17e5b04d2a86c71e0f4b9a3d58c2e";

type Receipt = "pending" | "sent" | "delivered" | "read";

function scrambled(length: number): string {
  let out = "";

  for (let i = 0; i < length; i++) {
    out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
  }

  return out;
}

/**
 * The landing page's one animated moment: a message arrives as ciphertext,
 * decrypts on screen, and the reply's receipt ticks turn blue. Uses the same
 * BubbleFrame as the real chat. Decorative (aria-hidden); with reduced motion
 * it renders the finished state immediately.
 */
export function HeroChatDemo() {
  const reduced = useReducedMotion();

  const [revealed, setRevealed] = React.useState(0);
  const [noise, setNoise] = React.useState(SEALED);
  const [replyVisible, setReplyVisible] = React.useState(false);
  const [receipt, setReceipt] = React.useState<Receipt>("pending");

  React.useEffect(() => {
    if (reduced) {
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];

    // Keep the not-yet-decrypted tail flickering like live ciphertext.
    intervals.push(setInterval(() => setNoise(scrambled(PLAINTEXT.length)), 70));

    timers.push(
      setTimeout(() => {
        let n = 0;

        const reveal = setInterval(() => {
          n += 1;
          setRevealed(n);

          if (n >= PLAINTEXT.length) {
            clearInterval(reveal);
          }
        }, 34);

        intervals.push(reveal);
      }, 1200),
    );

    timers.push(setTimeout(() => setReplyVisible(true), 3200));

    timers.push(setTimeout(() => setReceipt("sent"), 3600));

    timers.push(setTimeout(() => setReceipt("delivered"), 4100));

    timers.push(setTimeout(() => setReceipt("read"), 4900));

    return () => {
      timers.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [reduced]);

  // Reduced-motion users see the finished state without
  // requiring state updates from inside the effect.
  const effectiveRevealed = reduced ? PLAINTEXT.length : revealed;

  const effectiveReplyVisible = reduced || replyVisible;

  const effectiveReceipt: Receipt = reduced ? "read" : receipt;

  const done = effectiveRevealed >= PLAINTEXT.length;

  const rest = noise.slice(effectiveRevealed, PLAINTEXT.length);

  return (
    <div
      aria-hidden="true"
      className="bg-card mx-auto w-full max-w-105 overflow-hidden rounded-2xl shadow-2xl ring-1 shadow-black/15 ring-black/5"
    >
      {/* Header */}
      <div className="bg-panel flex h-15 items-center gap-3 border-b px-4">
        <span
          className="flex size-10 items-center justify-center rounded-full text-sm font-medium text-[#0b0d14]"
          style={{
            backgroundColor: avatarColorFor("nia"),
          }}
        >
          NA
        </span>

        <div>
          <p className="text-[16px] leading-5 font-semibold">Nia Adeyemi</p>

          <p className="text-primary text-[13px] leading-4">Online</p>
        </div>
      </div>

      {/* Conversation */}
      <div className="chat-wallpaper flex h-85 flex-col px-3 py-3 sm:h-90">
        <p className="bg-notice text-notice-foreground mx-auto flex w-fit max-w-[92%] items-start gap-2 rounded-lg px-3 py-2 text-center text-[12px] leading-4.5">
          <Lock className="mt-0.5 size-3 shrink-0" />
          Messages in this chat are end-to-end encrypted.
        </p>

        <div className="my-3 flex justify-center">
          <span className="bg-bubble-in text-bubble-meta rounded-lg px-3 py-1 text-xs font-medium shadow-[0_1px_0.5px_rgb(11_20_26/0.13)]">
            Today
          </span>
        </div>

        <div className="flex pl-2">
          <BubbleFrame
            own={false}
            tail
            meta={<time>2:41 PM</time>}
            className="max-w-[92%] sm:max-w-[92%] lg:max-w-[92%]"
          >
            <p className="relative">
              {/* Sizing layer: reserves the bubble's final width so nothing shifts while decrypting. */}
              <span className={cn("block whitespace-nowrap", !done && "invisible")}>
                {PLAINTEXT}
                <BubbleSpacer own={false} />
              </span>

              {!done && (
                <span className="absolute inset-0 block overflow-hidden whitespace-nowrap">
                  <span>{PLAINTEXT.slice(0, effectiveRevealed)}</span>

                  <span className="text-bubble-meta font-mono text-[13px] tracking-tight">
                    {effectiveRevealed === 0 ? SEALED.slice(0, PLAINTEXT.length) : rest}
                  </span>
                </span>
              )}
            </p>
          </BubbleFrame>
        </div>

        <div
          className={cn(
            "mt-1 flex justify-end pr-2 transition-all duration-200",
            effectiveReplyVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          <BubbleFrame
            own
            tail
            meta={
              <>
                <time>2:41 PM</time>

                {effectiveReceipt === "pending" && <Clock className="size-3.5" />}

                {effectiveReceipt === "sent" && <Check className="size-4" />}

                {effectiveReceipt === "delivered" && <CheckCheck className="size-4" />}

                {effectiveReceipt === "read" && <CheckCheck className="text-tick-read size-4" />}
              </>
            }
          >
            <p>
              {REPLY}
              <BubbleSpacer own />
            </p>
          </BubbleFrame>
        </div>
      </div>

      {/* Composer (static) */}
      <div className="bg-panel flex items-center gap-2 border-t px-3 py-2">
        <span className="bg-background text-muted-foreground flex-1 rounded-3xl px-4 py-2.5 text-[15px]">
          Type a message
        </span>

        <span className="text-muted-foreground flex size-11 items-center justify-center rounded-full">
          <Send className="size-5" />
        </span>
      </div>
    </div>
  );
}
