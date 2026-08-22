import { ownedBy, type WorkflowDefinition } from "./types.ts";

/**
 * We 3 Live Production Flow: YAK ➔ LDA ➔ BSB ➔ ROO ➔ NKI.
 *
 * Script leads, visuals follow, commerce and brand kit wrap it, community
 * receives it. Public release still requires Peter — LDA builds the queue
 * rather than pushing the button.
 */
export const WE3LIVE_PRODUCTION: WorkflowDefinition = {
  id: "we3live-production",
  name: "We 3 Live Production Flow",
  scope: "three",
  description:
    "Carries an episode or drop from script through visuals, merch, brand kit, and community release.",
  initial: "script",
  states: [
    {
      id: "script",
      name: "Script & Dialogue",
      owner: ownedBy("kodak"),
      description:
        "YAK writes episodic scripts and character dialogue, balancing satire, relatability, and family-appropriate faith.",
      on: { advance: "visuals", block: "script" },
      terminal: false,
    },
    {
      id: "visuals",
      name: "Visual Concept & Animatics",
      owner: ownedBy("luda"),
      description:
        "LDA engineers character sheets, animatics, and storyboard frames. When trend and tone conflict, tone wins.",
      on: { advance: "commerce", reject: "script" },
      terminal: false,
    },
    {
      id: "commerce",
      name: "Merch & Unit Economics",
      owner: ownedBy("ivy"),
      description:
        "BSB sources blanks and models landed cost, fees, and margin. Products below healthy margin get killed here.",
      on: { advance: "brandkit", reject: "visuals" },
      terminal: false,
    },
    {
      id: "brandkit",
      name: "Brand Kit & Asset Finish",
      owner: ownedBy("roo"),
      description:
        "ROO applies the We 3 Live design system and finishes assets to spec, with accessibility verified.",
      on: { advance: "community", reject: "visuals" },
      terminal: false,
    },
    {
      id: "community",
      name: "Community Release & Moderation",
      owner: ownedBy("nicki"),
      description:
        "NKI moderates the fan community and discussion around the release.",
      on: { advance: "released", crisis: "escalated" },
      terminal: false,
    },
    {
      id: "released",
      name: "Released",
      owner: ownedBy("juve"),
      description: "Drop is live and the production cards are closed.",
      on: {},
      terminal: true,
    },
    {
      id: "escalated",
      name: "Escalated to Peter",
      owner: ownedBy("nicki"),
      description:
        "Safety interrupt — NKI has paged the human and the run is parked.",
      on: {},
      terminal: true,
    },
  ],
};
