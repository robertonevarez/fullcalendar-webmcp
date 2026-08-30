/**
 * Shared motion language — keep CSS tokens in globals.css in sync.
 * Ease: strong ease-in-out (Emil Kowalski / animations.dev).
 */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Micro-interactions: press, chevron, dots, button chrome. */
export const DURATION_FAST_S = 0.2;

/** Content enter / accordion expand. */
export const DURATION_NORMAL_S = 0.35;

/** Photo crossfade (cinematic; still uses EASE_IN_OUT). */
export const DURATION_CROSSFADE_S = 1.1;

export const AUTOPLAY_MS = 5500;

/** Stagger step between mount children. */
export const STAGGER_S = 0.05;

/** Parent for staggered mount sequences. */
export const mountContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: STAGGER_S,
      delayChildren: STAGGER_S,
    },
  },
} as const;

/** Single block: fade + slight rise. */
export const mountItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION_NORMAL_S,
      ease: EASE_IN_OUT,
    },
  },
} as const;

/** Nested list stagger inside a mounted section. */
export const mountList = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: STAGGER_S,
    },
  },
} as const;
