"use client";

import { AnimatePresence, motion } from "framer-motion";

/**
 * Typing Indicator (10-FRONTEND.md § UI Components: "Typing Indicator").
 * Pure presentation — `useTyping` (../hooks/use-typing.ts) owns the
 * actual socket wiring; this just renders whatever set of user ids it's
 * given, respecting reduced-motion via the app-wide MotionConfig
 * (providers/motion-provider.tsx).
 */
export function TypingIndicator({ typingUserIds }: { typingUserIds: Set<string> }) {
  const isTyping = typingUserIds.size > 0;

  return (
    <AnimatePresence>
      {isTyping && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="text-muted-foreground flex items-center gap-1.5 px-4 py-1 text-xs"
          role="status"
          aria-live="polite"
        >
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="bg-muted-foreground size-1.5 rounded-full"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </span>
          {typingUserIds.size === 1 ? "Typing…" : `${typingUserIds.size} people typing…`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
