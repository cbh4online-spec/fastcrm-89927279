/**
 * FastCRM V2 — Motion Design System
 * ---------------------------------
 * Tokens, easings e variants partilhados pelas experiências V2
 * (App V2, Backoffice V2 e landing premium).
 *
 * Princípios:
 * - Animações curtas, subtis e funcionais.
 * - Easing único e consistente em toda a app.
 * - Respeitar `prefers-reduced-motion` automaticamente quando relevante.
 */

import type { Variants, Transition } from "framer-motion";

// ─────────────────────────────────────────────
// Easings
// ─────────────────────────────────────────────

/** Easing premium (out-expo style) — uso geral */
export const EASE_PREMIUM = [0.16, 1, 0.3, 1] as const;
/** Easing rápido para microinterações (hover, press) */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Easing para entradas mais dramáticas (modais, drawers) */
export const EASE_DRAMATIC = [0.19, 1, 0.22, 1] as const;

// ─────────────────────────────────────────────
// Durações (em segundos para framer-motion)
// ─────────────────────────────────────────────

export const DUR = {
  micro: 0.18,   // hover, press, toggle
  short: 0.26,   // cards, menus
  medium: 0.34,  // drawers, modais
  long: 0.42,    // page transitions
} as const;

// ─────────────────────────────────────────────
// Transitions standard
// ─────────────────────────────────────────────

export const tShort: Transition = { duration: DUR.short, ease: EASE_PREMIUM };
export const tMedium: Transition = { duration: DUR.medium, ease: EASE_PREMIUM };
export const tMicro: Transition = { duration: DUR.micro, ease: EASE_OUT };

// ─────────────────────────────────────────────
// Variants reutilizáveis
// ─────────────────────────────────────────────

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: tShort },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tShort },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1, transition: tShort },
};

export const slideRight: Variants = {
  hidden: { x: "100%", opacity: 0.6 },
  visible: { x: 0, opacity: 1, transition: { duration: DUR.medium, ease: EASE_DRAMATIC } },
  exit: { x: "100%", opacity: 0.6, transition: { duration: DUR.short, ease: EASE_OUT } },
};

export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.short, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.micro, ease: EASE_OUT } },
};

/** Stagger container — entrega filhos em sequência */
export const staggerContainer = (stagger = 0.05, delayChildren = 0.04): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** Item para usar dentro de staggerContainer */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: tShort },
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Detecta se o utilizador prefere reduzir movimento.
 * Para usar em hooks/efeitos quando precisamos saltar uma animação custosa.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/** Hover lift premium (para usar em className) */
export const HOVER_LIFT =
  "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_hsl(218_70%_14%/0.18)]";

/** Active press subtil */
export const ACTIVE_PRESS = "active:scale-[0.98] active:transition-transform active:duration-75";

/** Focus ring premium consistente com o design system */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:ring-offset-1 focus-visible:ring-offset-white";
