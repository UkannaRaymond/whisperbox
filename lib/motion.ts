import type { Transition, Variants } from "framer-motion";

/**
 * Shared animation timing. The TRD caps animation duration at 150–250ms —
 * `base` and `emphasis` stay inside that range so no feature has to
 * reinvent timing values.
 */
export const transitions = {
  base: { duration: 0.15, ease: "easeOut" } satisfies Transition,
  emphasis: { duration: 0.25, ease: "easeOut" } satisfies Transition,
} as const;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: transitions.base },
};

/**
 * Stagger helper for lists (e.g. a contact list or message group)
 * animating in together rather than all at once.
 */
export const listContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};
