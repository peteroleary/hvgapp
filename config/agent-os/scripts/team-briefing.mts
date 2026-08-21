/**
 * Emit the team briefing: the message posted to the workspace so every agent
 * acknowledges its own handle and mandate, the rest of the roster, the brand
 * boundaries, and the flows it participates in.
 *
 * Generated from the config so the briefing cannot drift from what the agents
 * are actually configured to be.
 *
 * Usage: node --experimental-strip-types scripts/team-briefing.mts
 */
import { AGENTS } from "../src/agents/index.ts";
import { BRANDS, SCOPE_SLUGS } from "../src/brands.ts";
import { DEPLOYMENT } from "../src/deployment.ts";
import { WORKFLOWS } from "../src/workflows/index.ts";

const dep = new Map(DEPLOYMENT.map((d) => [d.agent, d]));
const byId = new Map(AGENTS.map((a) => [a.id, a]));
const handle = (id: string) => byId.get(id as never)?.name ?? id;

const out: string[] = [];
const p = (s = "") => out.push(s);

p("# TEAM BRIEFING — ACKNOWLEDGE AND STAND UP");
p();
p(
  "Read this in full, then reply in one message with the acknowledgement block at the bottom.",
);
p("Do not start work until you have acknowledged.");
p();

p("## 1. WHO YOU ARE");
p();
p(
  "You are one of fourteen agents. Your handle is three capital letters (ICBM is four).",
);
p(
  "**Use handles, never long names.** If you refer to a teammate, use their handle.",
);
p();
p("| Handle | Persona | Mandate |");
p("|---|---|---|");
for (const a of AGENTS) {
  p(
    `| **${a.name}** | ${a.artistPersona.split(" (")[0]} | ${a.coreMandate.split(". ")[0]} |`,
  );
}
p();

p("## 2. WHO EVERYONE ELSE IS — ROUTING");
p();
p(
  "Work reaches you from your inbound sources and leaves via your handoff targets.",
);
p(
  "Routing is not a suggestion: handing work sideways to someone who does not own it",
);
p("is how things stall silently.");
p();
p(
  "| Handle | Receives from | Hands off to | Escalates to | Needs Peter's approval |",
);
p("|---|---|---|---|---|");
for (const a of AGENTS) {
  const r = a.routingRules;
  const inb = r.inboundSources
    .map((s) => (byId.has(s as never) ? handle(s) : `\`${s}\``))
    .join(", ");
  const outb = r.handoffTargets.map(handle).join(", ") || "—";
  const esc = r.escalatesTo.map(handle).join(", ") || "—";
  p(
    `| **${a.name}** | ${inb} | ${outb} | ${esc} | ${r.requiresHumanApproval ? "**YES**" : "no"} |`,
  );
}
p();

p("## 3. WHAT YOU ARE WORKING ON — THE PORTFOLIO");
p();
p(
  "One platform and five consumer brands. `hvgapp` is the operating platform you all",
);
p(
  "work *inside*; **High Value Growth** is a consumer media brand. They are different",
);
p("entities — never conflate them.");
p();
p("| Slug | Name | What it is |");
p("|---|---|---|");
for (const s of SCOPE_SLUGS) {
  const b = BRANDS[s];
  p(
    `| \`${b.slug}\` | ${b.displayName}${b.domain && b.domain !== b.displayName ? ` (${b.domain})` : ""} | ${b.summary} |`,
  );
}
p();
p(
  "The slug is the board and card key. Tag work with the slug, not the display name.",
);
p("Retired and never to be referenced again: MoSober, K&B Concrete.");
p();

p("## 4. THE FLOWS YOU RUN");
p();
for (const w of WORKFLOWS) {
  const path: string[] = [];
  let cur: string | undefined = w.initial;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const st = w.states.find((x) => x.id === cur);
    if (!st) break;
    const who =
      st.owner.kind === "agents"
        ? st.owner.agents.map(handle).join(" & ")
        : st.owner.kind === "human"
          ? "PETER"
          : `\`${st.owner.source}\``;
    path.push(`${who} (${st.name})`);
    cur = st.on.advance;
  }
  p(`**${w.name}** — scope \`${w.scope}\``);
  p(`> ${path.join(" ➔ ")}`);
  p();
}

p("## 5. STANDING RULES");
p();
p(
  "1. **Handles only.** Three capital letters. ICBM is the one four-letter exception.",
);
p(
  "2. **Nothing ships without Peter.** If your row says YES, you build the queue and stop.",
);
p(
  "3. **Crisis outranks everything.** NKI pages the human immediately and does not wait.",
);
p(
  "4. **Stay in your lane.** Doing someone else's job is not helpfulness, it is a collision.",
);
p(
  "5. **Cite sources with dates.** No claim without a path, link, or reference.",
);
p(
  "6. **Hand back on the second failure.** Same error twice, escalate with what you tried.",
);
p();

p("## 6. ACKNOWLEDGEMENT — REPLY WITH THIS, FILLED IN");
p();
p("```");
p("HANDLE:        <your three letters>");
p("PERSONA:       <your artist persona>");
p("MANDATE:       <one line, your own words>");
p("I RECEIVE FROM: <handles>");
p("I HAND OFF TO:  <handles>");
p("APPROVAL GATE:  <yes/no>");
p("FLOWS I'M IN:   <names>");
p(
  "FIRST TASK:     <the one thing you will pick up first, and which brand slug it belongs to>",
);
p("```");
p();
p(
  "If anything above is wrong about you, say so in the same message instead of",
);
p("acknowledging. A wrong roster is worth ten minutes now and a week later.");

console.log(out.join("\n"));
