import type { AgentConfig, AgentId } from "../types.ts";
import { ANDRE } from "./andre.ts";
import { BOO } from "./boo.ts";
import { CARDI } from "./cardi.ts";
import { KODAK } from "./kodak.ts";
import { ICBM } from "./icbm.ts";
import { IVY } from "./ivy.ts";
import { JUVE } from "./juve.ts";
import { LUDA } from "./luda.ts";
import { NICKI } from "./nicki.ts";
import { OTTO } from "./otto.ts";
import { PATA } from "./pata.ts";
import { PIMP } from "./pimp.ts";
import { VON } from "./von.ts";
import { ROO } from "./roo.ts";
import { TIP } from "./tip.ts";
import { SLIM } from "./slim.ts";
import { TOP } from "./top.ts";
import { TUNE } from "./tune.ts";

export {
  ANDRE,
  BOO,
  CARDI,
  KODAK,
  ICBM,
  IVY,
  JUVE,
  LUDA,
  NICKI,
  OTTO,
  PATA,
  PIMP,
  VON,
  ROO,
  TIP,
  SLIM,
  TOP,
  TUNE,
};

/** All 14 agents, in org-chart order. */
export const AGENTS: readonly AgentConfig[] = [
  ICBM,
  JUVE,
  OTTO,
  TUNE,
  TOP,
  SLIM,
  ROO,
  LUDA,
  KODAK,
  IVY,
  PIMP,
  PATA,
  BOO,
  NICKI,
  TIP,
  VON,
  CARDI,
  ANDRE,
];

const BY_ID = new Map<AgentId, AgentConfig>(
  AGENTS.map((agent) => [agent.id, agent]),
);

/** Look up an agent by id. */
export function getAgent(id: AgentId): AgentConfig {
  const agent = BY_ID.get(id);
  if (!agent) throw new Error(`Unknown agent id: ${id}`);
  return agent;
}

/** Every agent id. */
export const AGENT_IDS: readonly AgentId[] = AGENTS.map((agent) => agent.id);
