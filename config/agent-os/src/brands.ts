import type { BrandSlug, PlatformSlug, ScopeSlug } from "./types.ts";

/**
 * Brand identity for the Agent OS.
 *
 * Slugs are the query-safe key (`card.brand`, `board.brandScope`, and the
 * relay-indexed `t` tag value `brand:<slug>`); display names never double as
 * keys. Kept in lockstep with `desktop/src/features/board/ui/brandTokens.ts`
 * — the board registry and this one must agree on the slug set.
 *
 * `hvgapp` is the Buzz operating platform itself, not a consumer brand.
 * "High Value Growth" (`itshvg`) is the consumer media brand; the two are
 * distinct entities and must never be conflated.
 */
export interface BrandSpec {
  readonly slug: ScopeSlug;
  readonly displayName: string;
  readonly domain: string | null;
  readonly kind: "platform" | "brand";
  readonly summary: string;
}

export const PLATFORM_SLUG: PlatformSlug = "hvgapp";

export const BRAND_SLUGS: readonly BrandSlug[] = [
  "itshvg",
  "gomarco",
  "lhfyc",
  "clean",
  "three",
] as const;

export const SCOPE_SLUGS: readonly ScopeSlug[] = [
  PLATFORM_SLUG,
  ...BRAND_SLUGS,
] as const;

export const BRANDS: Readonly<Record<ScopeSlug, BrandSpec>> = {
  hvgapp: {
    slug: "hvgapp",
    displayName: "hvg.app",
    domain: "hvg.app",
    kind: "platform",
    summary:
      "The customized Buzz platform, multi-tenant agent execution harness, and central operating system where Peter, the human team, and the 14 agents collaborate, manage boards, trigger pipelines, and coordinate work across the portfolio.",
  },
  itshvg: {
    slug: "itshvg",
    displayName: "High Value Growth",
    domain: null,
    kind: "brand",
    summary:
      "Consumer-facing media, education, and content brand focused on personal growth, entrepreneurship, practical business playbooks, and hands-on software/tool benchmark reviews for founders and operators.",
  },
  gomarco: {
    slug: "gomarco",
    displayName: "Go Marco",
    domain: null,
    kind: "brand",
    summary:
      "Group travel intelligence platform featuring WebRTC live voice Powwows, automated loyalty/card reward consolidation via Plaid, and deep community research through Agent Reach.",
  },
  lhfyc: {
    slug: "lhfyc",
    displayName: "Look How Far You've Come",
    domain: "lhfyc.xyz",
    kind: "brand",
    summary:
      "Dignified, milestone-based peer accountability and escrow crowdfunding platform with daily habit verification — biometric UAs, location dwell time, and reading logs.",
  },
  clean: {
    slug: "clean",
    displayName: "Clean Startup",
    domain: null,
    kind: "brand",
    summary:
      "Short-term rental turnover logistics platform operating as a spatial AI and data collection engine — video, mic audio, and LiDAR floorplans — to train future autonomous cleaning robotics.",
  },
  three: {
    slug: "three",
    displayName: "We 3 Live",
    domain: "we3.live",
    kind: "brand",
    summary:
      "Faith-based creative studio and apparel empire producing original entertainment IP, including an edgy family-friendly animated cartoon series, devotionals, and streetwear merch.",
  },
};

/** Display name for a scope slug; falls back to the raw value. */
export function scopeDisplayName(slug: string): string {
  return BRANDS[slug as ScopeSlug]?.displayName ?? slug;
}
