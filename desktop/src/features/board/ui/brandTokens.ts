/**
 * Brand identity is the slug (`card.brand`, `board.brandScope`, and the
 * relay-indexed `t` tag value `brand:<slug>`). Display names live in
 * BRAND_DISPLAY_NAMES so the query-safe key never doubles as UI text.
 *
 * Slugs follow the locked brand nomenclature (peter, #build 2026-08-12):
 * one name per brand on every service — repo, Vercel, Firebase, GCP, board.
 * `hvg-app` is the Buzz platform itself, not a brand site; "High Value
 * Growth" (`itshvg`) is the consumer media brand. The two are separate
 * entities and must never be conflated.
 *
 * Portfolio revision (2026-08-19): `sober` was retired and replaced by
 * `lhfyc` (Look How Far You've Come, lhfyc.xyz), `concrete` was removed from
 * the portfolio, and `gomarco` was added. `lhfyc` deliberately does not use
 * Tailwind's amber ramp — amber-500 is the forbidden `#f59e0b` token, and the
 * brand's visual direction is dignified and high-trust rather than warm.
 *
 * This set is mirrored by `config/agent-os/src/brands.ts`; the two registries
 * must agree on the slug set.
 */
export const BRAND_TOKENS: Record<string, { badge: string; border: string }> = {
  lhfyc: {
    badge: "bg-indigo-950/40 text-indigo-300 border-indigo-700/50",
    border: "border-indigo-500",
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
  gomarco: {
    badge: "bg-cyan-950/40 text-cyan-300 border-cyan-700/50",
    border: "border-cyan-500",
  },
  "hvg-app": {
    badge: "bg-yellow-950/40 text-yellow-300 border-yellow-700/50",
    border: "border-yellow-500",
  },
};

export const BRAND_DISPLAY_NAMES: Record<string, string> = {
  lhfyc: "Look How Far You've Come",
  clean: "Clean Startup",
  three: "We 3 Live",
  itshvg: "High Value Growth",
  gomarco: "Go Marco",
  "hvg-app": "hvg.app",
};

/** Badge text for a brand slug; falls back to the raw value for unknown brands. */
export function brandDisplayName(brand: string): string {
  return BRAND_DISPLAY_NAMES[brand] ?? brand;
}
