import { OWNED_BY_PETER, ownedBy, type WorkflowDefinition } from "./types.ts";

/**
 * High Value Growth Review Flow: Pata ➔ Cruz ➔ Luda ➔ Boo ➔ Peter.
 *
 * Pata drives the tool himself before anyone writes a word about it — the
 * review is grounded in a real workflow run, not a feature page.
 */
export const HVG_REVIEW: WorkflowDefinition = {
  id: "hvg-review",
  name: "High Value Growth Review Flow",
  scope: "itshvg",
  description:
    "Turns a hands-on software benchmark into a published, search-optimized review behind a human approval gate.",
  initial: "research",
  states: [
    {
      id: "research",
      name: "Hands-On Benchmark",
      owner: ownedBy("pata"),
      description:
        "Pata signs up and drives the real workflow via browser automation, logging breaks, setup friction, and actual pricing with dates.",
      on: { advance: "write", block: "research" },
      terminal: false,
    },
    {
      id: "write",
      name: "Review Copy",
      owner: ownedBy("cruz"),
      description:
        "Cruz writes the no-BS review that respects the reader's time, working from Pata's cited brief.",
      on: { advance: "media", reject: "research" },
      terminal: false,
    },
    {
      id: "media",
      name: "Media & Hooks",
      owner: ownedBy("luda"),
      description:
        "Luda produces screen-recorded breakdown hooks and teaser cuts. Builds the queue; does not publish.",
      on: { advance: "search", reject: "write" },
      terminal: false,
    },
    {
      id: "search",
      name: "Schema & Search Readiness",
      owner: ownedBy("boo"),
      description:
        "Boo validates review schema and comparative tool matrices, and scores AI Overviews citation readiness.",
      on: { advance: "approval", reject: "write" },
      terminal: false,
    },
    {
      id: "approval",
      name: "Peter Approval",
      owner: OWNED_BY_PETER,
      description: "Human approval gate before anything publishes.",
      on: { advance: "published", reject: "write" },
      terminal: false,
    },
    {
      id: "published",
      name: "Published",
      owner: ownedBy("juve"),
      description: "Review is live and the cards are closed.",
      on: {},
      terminal: true,
    },
  ],
};
