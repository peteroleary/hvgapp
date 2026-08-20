import type { AgentConfig, AgentId } from "../types.ts";
import { BOO } from "./boo.ts";
import { CRUZ } from "./cruz.ts";
import { ICBM } from "./icbm.ts";
import { IVY } from "./ivy.ts";
import { JUVE } from "./juve.ts";
import { LUDA } from "./luda.ts";
import { MIA } from "./mia.ts";
import { OTTO } from "./otto.ts";
import { PATA } from "./pata.ts";
import { PIMP } from "./pimp.ts";
import { ROO } from "./roo.ts";
import { SLIM } from "./slim.ts";
import { TOP } from "./top.ts";
import { TUNE } from "./tune.ts";

export {
  BOO,
  CRUZ,
  ICBM,
  IVY,
  JUVE,
  LUDA,
  MIA,
  OTTO,
  PATA,
  PIMP,
  ROO,
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
  CRUZ,
  IVY,
  PIMP,
  PATA,
  BOO,
  MIA,
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
