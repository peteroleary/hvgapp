/**
 * Brand identity is the slug (`card.brand`, `board.brandScope`, and the
 * relay-indexed `t` tag value `brand:<slug>`). Display names live in
 * BRAND_DISPLAY_NAMES so the query-safe key never doubles as UI text.
 *
 * Slugs follow the locked brand nomenclature (peter, #build 2026-08-12):
 * one name per brand on every service — repo, Vercel, Firebase, GCP, board.
 * `hvg-app` is the Buzz platform itself, not a brand site.
 */
export const BRAND_TOKENS: Record<string, { badge: string; border: string }> = {
  sober: {
    badge: "bg-amber-950/40 text-amber-300 border-amber-700/50",
    border: "border-amber-600",
  },
  clean: {
    badge: "bg-emerald-950/40 text-emerald-300 border-emerald-700/50",
    border: "border-emerald-500",
  },
  three: {
    badge: "bg-purple-950/40 text-purple-300 border-purple-700/50",
    border: "border-purple-500",
  },
  itshvg: {
    badge: "bg-blue-950/40 text-blue-300 border-blue-700/50",
    border: "border-blue-500",
  },
  concrete: {
    badge: "bg-stone-800 text-stone-200 border-stone-600",
    border: "border-stone-400",
  },
  "hvg-app": {
    badge: "bg-yellow-950/40 text-yellow-300 border-yellow-700/50",
    border: "border-yellow-500",
  },
};

export const BRAND_DISPLAY_NAMES: Record<string, string> = {
  sober: "MoSober",
  clean: "Clean Startup",
  three: "We3Live",
  itshvg: "HVG",
  concrete: "K&B Concrete",
  "hvg-app": "hvg.app",
};

/** Badge text for a brand slug; falls back to the raw value for unknown brands. */
export function brandDisplayName(brand: string): string {
  return BRAND_DISPLAY_NAMES[brand] ?? brand;
}
