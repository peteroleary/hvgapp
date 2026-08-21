import { ownedBy, ownedBySystem, type WorkflowDefinition } from "./types.ts";

/**
 * lhfyc.xyz Escrow Milestone Flow:
 * Verification Ingestion ➔ SLM & PAT ➔ TUN ➔ NKI.
 *
 * SLM and PAT hold verification concurrently: SLM proves the signal is
 * tamper-proof, PAT checks it against the compliance landscape. A crisis
 * signal at any point jumps straight to human paging.
 */
export const LHFYC_ESCROW: WorkflowDefinition = {
  id: "lhfyc-escrow",
  name: "lhfyc.xyz Escrow Milestone Flow",
  scope: "lhfyc",
  description:
    "Carries a daily habit verification through tamper-proof validation and escrow release into dignified community acknowledgement.",
  initial: "ingest",
  states: [
    {
      id: "ingest",
      name: "Verification Ingestion",
      owner: ownedBySystem("verification-gateway"),
      description:
        "Biometric UA receipts, location dwell-time signals, and reading logs arrive from the mobile gateway.",
      on: { advance: "validate", block: "ingest", crisis: "escalated" },
      terminal: false,
    },
    {
      id: "validate",
      name: "Tamper-Proof Validation",
      owner: ownedBy("slim", "pata"),
      description:
        "SLM runs dwell-time and biometric timestamp parsers; PAT checks the result against the state-level escrow compliance landscape. Landscape analysis, not legal advice.",
      on: { advance: "release", reject: "ingest", crisis: "escalated" },
      terminal: false,
    },
    {
      id: "release",
      name: "Escrow Release",
      owner: ownedBy("tune"),
      description:
        "TUN executes the milestone rule against the Stripe Connect escrow ledger.",
      on: { advance: "acknowledge", reject: "validate", crisis: "escalated" },
      terminal: false,
    },
    {
      id: "acknowledge",
      name: "Community Acknowledgement",
      owner: ownedBy("nicki"),
      description:
        "NKI acknowledges the milestone with dignity and screens the space for predatory actors.",
      on: { advance: "complete", crisis: "escalated" },
      terminal: false,
    },
    {
      id: "complete",
      name: "Milestone Complete",
      owner: ownedBy("juve"),
      description: "Escrow released and the milestone card is closed.",
      on: {},
      terminal: true,
    },
    {
      id: "escalated",
      name: "Escalated to Peter",
      owner: ownedBy("nicki"),
      description:
        "Crisis interrupt. NKI has paged the human immediately; no clinical advice is given and the run is parked pending human handling.",
      on: {},
      terminal: true,
    },
  ],
};
