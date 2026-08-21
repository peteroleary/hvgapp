import { OWNED_BY_PETER, ownedBy, type WorkflowDefinition } from "./types.ts";

/**
 * Platform Build Flow (hvg.app):
 * JUV ➔ MFR & TUN ➔ ROO ➔ YBY ➔ SLM ➔ BOO ➔ Peter (Approval).
 *
 * MFR and TUN hold the architecture state concurrently by design — the
 * agent specs require two senior perspectives before either writes code.
 */
export const PLATFORM_BUILD: WorkflowDefinition = {
  id: "platform-build",
  name: "Platform Build Flow",
  scope: "hvgapp",
  description:
    "Turns a platform goal into shipped, search-ready hvg.app functionality behind a human approval gate.",
  initial: "route",
  states: [
    {
      id: "route",
      name: "Route & Scope",
      owner: ownedBy("juve"),
      description:
        "JUV shapes the goal into SMART/OKR cards and assigns the build.",
      on: { advance: "architect", block: "route" },
      terminal: false,
    },
    {
      id: "architect",
      name: "Architecture & Spec",
      owner: ownedBy("otto", "tune"),
      description:
        "MFR and TUN plan together and produce an unambiguous spec. Neither decides alone.",
      on: { advance: "design", reject: "route", escalate: "route" },
      terminal: false,
    },
    {
      id: "design",
      name: "Design System & UI Spec",
      owner: ownedBy("roo"),
      description:
        "ROO produces components, states, spacing, tokens, and breakpoints precise enough to build without guessing.",
      on: { advance: "build", reject: "architect" },
      terminal: false,
    },
    {
      id: "build",
      name: "Implementation",
      owner: ownedBy("top"),
      description:
        "YBY builds directly from the verified spec and writes tests as it goes.",
      on: { advance: "optimize", reject: "design", escalate: "architect" },
      terminal: false,
    },
    {
      id: "optimize",
      name: "Optimization Pass",
      owner: ownedBy("slim"),
      description:
        "SLM profiles and refactors hot paths for latency and allocation.",
      on: { advance: "search", reject: "build" },
      terminal: false,
    },
    {
      id: "search",
      name: "Search & Schema Sweep",
      owner: ownedBy("boo"),
      description:
        "BOO runs the schema, Core Web Vitals, and AI Overviews readiness sweep on the shipped surface.",
      on: { advance: "approval", reject: "build" },
      terminal: false,
    },
    {
      id: "approval",
      name: "Peter Approval",
      owner: OWNED_BY_PETER,
      description:
        "Human approval gate. Nothing ships past this state without Peter.",
      on: { advance: "shipped", reject: "route" },
      terminal: false,
    },
    {
      id: "shipped",
      name: "Shipped",
      owner: ownedBy("juve"),
      description: "Approved and released; JUV closes the cards.",
      on: {},
      terminal: true,
    },
  ],
};
