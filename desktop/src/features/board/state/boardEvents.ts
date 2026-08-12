import type { RelayEvent } from "@/shared/api/types";
import {
  KIND_BOARD,
  KIND_BOARD_APPROVAL_DENIED,
  KIND_BOARD_APPROVAL_GRANTED,
  KIND_BOARD_APPROVAL_REQUESTED,
  KIND_BOARD_AUTONOMY_POLICY,
  KIND_BOARD_CARD,
  KIND_BOARD_FEED_RULE,
  KIND_BOARD_GOAL,
} from "@/shared/constants/kinds";

import { evaluateAutonomy } from "../types/boardTypes";
import { isValidRank } from "./rank";
import type {
  ApprovalDecision,
  Assignee,
  AutonomyLevel,
  AutonomyPolicy,
  Board,
  BoardList,
  Card,
  CardExecutionState,
  CardSourceLineage,
  FeedRule,
  FunctionArea,
  Goal,
} from "../types/boardTypes";

const PUBKEY_PATTERN = /^[0-9a-f]{64}$/;
const FUNCTION_AREAS = new Set<FunctionArea>([
  "build",
  "design",
  "content",
  "social",
  "marketing",
  "sales",
  "research",
  "other",
]);
const CARD_EXECUTION_STATES = new Set<CardExecutionState>([
  "idle",
  "eligible",
  "running",
  "completed",
  "blocked",
  "needs_approval",
]);
const AUTONOMY_LEVELS = new Set<AutonomyLevel>(["manual", "notify", "auto"]);

/** The durable metadata added to a Board parsed from its addressable event. */
export type BoardEntity = {
  address: string;
  board: Board;
  createdAt: number;
  eventId: string;
  owner: string;
};

/** The durable metadata added to a Card parsed from its addressable event. */
export type CardEntity = {
  address: string;
  boardAddress: string;
  card: Card;
  createdAt: number;
  eventId: string;
  owner: string;
};

/** The durable metadata added to a Goal parsed from its addressable event. */
export type GoalEntity = {
  address: string;
  createdAt: number;
  eventId: string;
  goal: Goal;
  owner: string;
};

/** The durable metadata added to a FeedRule parsed from its addressable event. */
export type FeedRuleEntity = {
  address: string;
  createdAt: number;
  eventId: string;
  owner: string;
  rule: FeedRule;
};

/** The durable metadata added to an AutonomyPolicy parsed from its event. */
export type AutonomyPolicyEntity = {
  address: string;
  createdAt: number;
  eventId: string;
  owner: string;
  policy: AutonomyPolicy;
};

/** A Board approval event projected from its append-only Nostr record. */
export type BoardApprovalEvent = {
  approvers: string[];
  cardAddress: string;
  content: Record<string, unknown>;
  createdAt: number;
  eventId: string;
  kind:
    | typeof KIND_BOARD_APPROVAL_REQUESTED
    | typeof KIND_BOARD_APPROVAL_GRANTED
    | typeof KIND_BOARD_APPROVAL_DENIED;
  pubkey: string;
};

/** The fully reconciled, immutable read model exposed to the Board UI. */
export type BoardSnapshot = {
  approvals: BoardApprovalEvent[];
  autonomyPolicies: AutonomyPolicyEntity[];
  boards: BoardEntity[];
  cards: CardEntity[];
  feedRules: FeedRuleEntity[];
  goals: GoalEntity[];
};

/**
 * Board data together with the approval gate derived once for this snapshot.
 *
 * The gate is deliberately keyed by the full card coordinate rather than the
 * `d` tag: separate Board owners may legitimately use the same card id.
 */
export type BoardState = BoardSnapshot & {
  requiresApprovalByCardAddress: Readonly<Record<string, boolean>>;
};

/** A signed-event input ready for the shared `signRelayEvent` helper. */
export type BoardEventTemplate = {
  content: string;
  kind: number;
  tags: string[][];
};

type ParsedAddress = {
  dtag: string;
  kind: number;
  owner: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value : undefined;
}

function parseJson(content: string): JsonRecord | null {
  try {
    const value: unknown = JSON.parse(content);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function firstTag(event: RelayEvent, name: string): string | null {
  const tag = event.tags.find((candidate) => candidate[0] === name);
  return tag && isNonEmptyString(tag[1]) ? tag[1] : null;
}

function tags(event: RelayEvent, name: string): string[][] {
  return event.tags.filter((candidate) => candidate[0] === name);
}

function parseAddress(
  value: string,
  expectedKind?: number,
): ParsedAddress | null {
  const first = value.indexOf(":");
  const second = value.indexOf(":", first + 1);
  if (first <= 0 || second <= first + 1) return null;
  const kind = Number(value.slice(0, first));
  const owner = value.slice(first + 1, second).toLowerCase();
  const dtag = value.slice(second + 1);
  if (
    !Number.isSafeInteger(kind) ||
    !PUBKEY_PATTERN.test(owner) ||
    !isNonEmptyString(dtag) ||
    (expectedKind !== undefined && kind !== expectedKind)
  ) {
    return null;
  }
  return { dtag, kind, owner };
}

function addressForEvent(event: RelayEvent): string | null {
  const dtag = firstTag(event, "d");
  const owner = event.pubkey.toLowerCase();
  if (!dtag || !PUBKEY_PATTERN.test(owner)) return null;
  return `${event.kind}:${owner}:${dtag}`;
}

function uniqueDTag(event: RelayEvent): string | null {
  const dTags = tags(event, "d");
  return dTags.length === 1 && isNonEmptyString(dTags[0][1])
    ? dTags[0][1]
    : null;
}

function parseAssignees(value: unknown): Assignee[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const assignees: Assignee[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate)) return null;
    const type = candidate.type;
    const id = candidate.id;
    const role = candidate.role;
    if (
      (type !== "agent" && type !== "human") ||
      !isNonEmptyString(id) ||
      (role !== undefined &&
        role !== "lead" &&
        role !== "reviewer" &&
        role !== "executor") ||
      seen.has(`${type}:${id}`)
    ) {
      return null;
    }
    seen.add(`${type}:${id}`);
    assignees.push({
      type,
      id,
      ...(role === undefined ? {} : { role }),
    });
  }
  return assignees;
}

function parseComments(value: unknown): Card["comments"] | null {
  if (!Array.isArray(value)) return null;
  const comments: Card["comments"] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !isNonEmptyString(candidate.id) ||
      !isNonEmptyString(candidate.authorId) ||
      !isNonEmptyString(candidate.body) ||
      !isNonEmptyString(candidate.createdAt)
    ) {
      return null;
    }
    comments.push({
      id: candidate.id,
      authorId: candidate.authorId,
      body: candidate.body,
      createdAt: candidate.createdAt,
    });
  }
  return comments;
}

function parseSourceLineage(
  value: unknown,
): CardSourceLineage | undefined | null {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.fromBoardId) ||
    !isNonEmptyString(value.fromBoardTitle) ||
    (value.ruleAction !== "move" &&
      value.ruleAction !== "copy" &&
      value.ruleAction !== "spawn-linked-card")
  ) {
    return null;
  }
  const ruleId = optionalString(value.ruleId);
  const triggerEventId = optionalString(value.triggerEventId);
  return {
    fromBoardId: value.fromBoardId,
    fromBoardTitle: value.fromBoardTitle,
    ruleAction: value.ruleAction,
    ...(ruleId ? { ruleId } : {}),
    ...(triggerEventId ? { triggerEventId } : {}),
  };
}

function parseApprovalDecision(
  value: unknown,
): ApprovalDecision | undefined | null {
  if (value === undefined) return undefined;
  if (
    !isRecord(value) ||
    (value.state !== "approved" && value.state !== "rejected")
  ) {
    return null;
  }
  const policySnapshot = value.policySnapshot;
  if (
    policySnapshot !== undefined &&
    (typeof policySnapshot !== "string" ||
      !AUTONOMY_LEVELS.has(policySnapshot as AutonomyLevel))
  ) {
    return null;
  }
  return {
    state: value.state,
    ...(optionalString(value.by) ? { by: optionalString(value.by) } : {}),
    ...(optionalString(value.at) ? { at: optionalString(value.at) } : {}),
    ...(optionalString(value.reason)
      ? { reason: optionalString(value.reason) }
      : {}),
    ...(policySnapshot
      ? { policySnapshot: policySnapshot as AutonomyLevel }
      : {}),
  };
}

function parseBoardLists(value: unknown): BoardList[] | null {
  if (!Array.isArray(value)) return null;
  const ids = new Set<string>();
  const lists: BoardList[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !isNonEmptyString(candidate.id) ||
      !isNonEmptyString(candidate.title) ||
      !isNonEmptyString(candidate.rank) ||
      ids.has(candidate.id)
    ) {
      return null;
    }
    ids.add(candidate.id);
    lists.push({
      id: candidate.id,
      title: candidate.title,
      rank: candidate.rank,
    });
  }
  return lists;
}

function parseBoard(event: RelayEvent): BoardEntity | null {
  if (event.kind !== KIND_BOARD) return null;
  const id = uniqueDTag(event);
  const address = addressForEvent(event);
  const content = parseJson(event.content);
  if (!id || !address || !content || !isNonEmptyString(content.title))
    return null;
  const lists = parseBoardLists(content.lists);
  if (!lists) return null;
  return {
    address,
    board: {
      id,
      title: content.title,
      ...(optionalString(content.description)
        ? { description: optionalString(content.description) }
        : {}),
      ...(optionalString(content.brandScope)
        ? { brandScope: optionalString(content.brandScope) }
        : {}),
      lists,
    },
    createdAt: event.created_at,
    eventId: event.id,
    owner: event.pubkey.toLowerCase(),
  };
}

function indexedAssigneesMatch(
  event: RelayEvent,
  assignees: readonly Assignee[],
): boolean {
  const indexed = tags(event, "p").map((tag) => ({
    id: tag[1],
    role: tag[3] || undefined,
  }));
  return (
    indexed.length === assignees.length &&
    assignees.every((assignee) =>
      indexed.some(
        (candidate) =>
          candidate.id === assignee.id && candidate.role === assignee.role,
      ),
    )
  );
}

function tagValueByPrefix(event: RelayEvent, prefix: string): string | null {
  const value = tags(event, "t")
    .map((tag) => tag[1])
    .find((candidate) => candidate?.startsWith(prefix));
  return value?.slice(prefix.length) || null;
}

function parseCard(event: RelayEvent): CardEntity | null {
  if (event.kind !== KIND_BOARD_CARD) return null;
  const id = uniqueDTag(event);
  const address = addressForEvent(event);
  const boardAddressValue = firstTag(event, "a");
  const boardAddress = boardAddressValue
    ? parseAddress(boardAddressValue, KIND_BOARD)
    : null;
  const listId = firstTag(event, "l");
  const rank = firstTag(event, "rank");
  const brand = tagValueByPrefix(event, "brand:");
  const functionArea = tagValueByPrefix(event, "fn:");
  const content = parseJson(event.content);
  if (
    !id ||
    !address ||
    !boardAddress ||
    !listId ||
    !rank ||
    !brand ||
    !functionArea ||
    !FUNCTION_AREAS.has(functionArea as FunctionArea) ||
    !content ||
    !isNonEmptyString(content.title) ||
    !isNonEmptyString(content.description) ||
    !isNonEmptyString(content.createdBy)
  ) {
    return null;
  }
  const assignees = parseAssignees(content.assignees);
  const comments = parseComments(content.comments);
  const sourceLineage = parseSourceLineage(content.sourceLineage);
  const approvalDecision = parseApprovalDecision(content.approvalDecision);
  if (
    !assignees ||
    !comments ||
    sourceLineage === null ||
    approvalDecision === null ||
    !CARD_EXECUTION_STATES.has(content.executionState as CardExecutionState) ||
    !indexedAssigneesMatch(event, assignees)
  ) {
    return null;
  }
  const feedForwardContext = content.feedForwardContext;
  if (feedForwardContext !== undefined && !isRecord(feedForwardContext))
    return null;
  return {
    address,
    boardAddress: boardAddressValue as string,
    card: {
      id,
      title: content.title,
      description: content.description,
      brand,
      functionArea: functionArea as FunctionArea,
      assignees,
      executionState: content.executionState as CardExecutionState,
      rank,
      listId,
      boardId: boardAddress.dtag,
      ...(optionalString(content.linkedGitIssue)
        ? { linkedGitIssue: optionalString(content.linkedGitIssue) }
        : {}),
      createdBy: content.createdBy,
      ...(feedForwardContext ? { feedForwardContext } : {}),
      comments,
      ...(optionalString(content.parentGoalId)
        ? { parentGoalId: optionalString(content.parentGoalId) }
        : {}),
      ...(sourceLineage ? { sourceLineage } : {}),
      ...(approvalDecision ? { approvalDecision } : {}),
    },
    createdAt: event.created_at,
    eventId: event.id,
    owner: event.pubkey.toLowerCase(),
  };
}

function parseGoal(event: RelayEvent): GoalEntity | null {
  if (event.kind !== KIND_BOARD_GOAL) return null;
  const id = uniqueDTag(event);
  const address = addressForEvent(event);
  const content = parseJson(event.content);
  if (
    !id ||
    !address ||
    !content ||
    !isNonEmptyString(content.brandScope) ||
    (content.framework !== "SMART" &&
      content.framework !== "OKR" &&
      content.framework !== "PACT") ||
    (content.status !== "draft" &&
      content.status !== "proposed" &&
      content.status !== "approved" &&
      content.status !== "executing" &&
      content.status !== "completed") ||
    !Array.isArray(content.proposedCards)
  ) {
    return null;
  }
  return {
    address,
    createdAt: event.created_at,
    eventId: event.id,
    goal: { id, ...(content as Omit<Goal, "id">) },
    owner: event.pubkey.toLowerCase(),
  };
}

function parseFeedRule(event: RelayEvent): FeedRuleEntity | null {
  if (event.kind !== KIND_BOARD_FEED_RULE) return null;
  const id = uniqueDTag(event);
  const address = addressForEvent(event);
  const content = parseJson(event.content);
  if (
    !id ||
    !address ||
    !content ||
    !isNonEmptyString(content.sourceBoardId) ||
    !isNonEmptyString(content.sourceListId) ||
    !isNonEmptyString(content.targetBoardId) ||
    !isNonEmptyString(content.targetListId) ||
    (content.action !== "move" &&
      content.action !== "copy" &&
      content.action !== "spawn-linked-card") ||
    typeof content.enabled !== "boolean"
  ) {
    return null;
  }
  return {
    address,
    createdAt: event.created_at,
    eventId: event.id,
    owner: event.pubkey.toLowerCase(),
    rule: { id, ...(content as Omit<FeedRule, "id">) },
  };
}

function parseAutonomyPolicy(event: RelayEvent): AutonomyPolicyEntity | null {
  if (event.kind !== KIND_BOARD_AUTONOMY_POLICY) return null;
  const dtag = uniqueDTag(event);
  const address = addressForEvent(event);
  const content = parseJson(event.content);
  if (
    !dtag ||
    !address ||
    !content ||
    !isNonEmptyString(content.agentId) ||
    !FUNCTION_AREAS.has(content.functionArea as FunctionArea) ||
    !AUTONOMY_LEVELS.has(content.autonomyLevel as AutonomyLevel) ||
    dtag !== `${content.agentId}:${content.functionArea}`
  ) {
    return null;
  }
  return {
    address,
    createdAt: event.created_at,
    eventId: event.id,
    owner: event.pubkey.toLowerCase(),
    policy: {
      agentId: content.agentId,
      functionArea: content.functionArea as FunctionArea,
      autonomyLevel: content.autonomyLevel as AutonomyLevel,
    },
  };
}

function parseApprovalEvent(event: RelayEvent): BoardApprovalEvent | null {
  if (
    event.kind !== KIND_BOARD_APPROVAL_REQUESTED &&
    event.kind !== KIND_BOARD_APPROVAL_GRANTED &&
    event.kind !== KIND_BOARD_APPROVAL_DENIED
  ) {
    return null;
  }
  const cardAddress = firstTag(event, "a");
  if (!cardAddress || !parseAddress(cardAddress, KIND_BOARD_CARD)) return null;
  const content = parseJson(event.content);
  if (!content) return null;
  const approvers = tags(event, "p")
    .map((tag) => tag[1])
    .filter(
      (pubkey): pubkey is string =>
        typeof pubkey === "string" && PUBKEY_PATTERN.test(pubkey.toLowerCase()),
    )
    .map((pubkey) => pubkey.toLowerCase());
  return {
    approvers: [...new Set(approvers)],
    cardAddress,
    content,
    createdAt: event.created_at,
    eventId: event.id,
    kind: event.kind,
    pubkey: event.pubkey.toLowerCase(),
  };
}

function selectLatestAddressableEvents(
  events: readonly RelayEvent[],
): RelayEvent[] {
  const latest = new Map<string, RelayEvent>();
  for (const event of events) {
    const address = addressForEvent(event);
    if (!address || !uniqueDTag(event)) continue;
    const existing = latest.get(address);
    if (
      !existing ||
      event.created_at > existing.created_at ||
      (event.created_at === existing.created_at && event.id < existing.id)
    ) {
      latest.set(address, event);
    }
  }
  return [...latest.values()];
}

function compareEntities(
  left: { createdAt: number; eventId: string },
  right: { createdAt: number; eventId: string },
): number {
  return (
    left.createdAt - right.createdAt ||
    left.eventId.localeCompare(right.eventId)
  );
}

/** Reconciles raw Board Nostr events into one safe, deterministic UI snapshot. */
export function buildBoardSnapshot(
  events: readonly RelayEvent[],
): BoardSnapshot {
  const currentEntities = selectLatestAddressableEvents(
    events.filter(
      (event) =>
        event.kind === KIND_BOARD ||
        event.kind === KIND_BOARD_CARD ||
        event.kind === KIND_BOARD_GOAL ||
        event.kind === KIND_BOARD_FEED_RULE ||
        event.kind === KIND_BOARD_AUTONOMY_POLICY,
    ),
  );
  const boards = currentEntities
    .flatMap((event) => {
      const board = parseBoard(event);
      return board ? [board] : [];
    })
    .sort(compareEntities);
  const cards = currentEntities
    .flatMap((event) => {
      const card = parseCard(event);
      return card ? [card] : [];
    })
    .sort(
      (left, right) =>
        left.boardAddress.localeCompare(right.boardAddress) ||
        left.card.listId.localeCompare(right.card.listId) ||
        left.card.rank.localeCompare(right.card.rank) ||
        compareEntities(left, right),
    );
  const goals = currentEntities
    .flatMap((event) => {
      const goal = parseGoal(event);
      return goal ? [goal] : [];
    })
    .sort(compareEntities);
  const feedRules = currentEntities
    .flatMap((event) => {
      const rule = parseFeedRule(event);
      return rule ? [rule] : [];
    })
    .sort(compareEntities);
  const autonomyPolicies = currentEntities
    .flatMap((event) => {
      const policy = parseAutonomyPolicy(event);
      return policy ? [policy] : [];
    })
    .sort(compareEntities);
  const approvals = events
    .flatMap((event) => {
      const approval = parseApprovalEvent(event);
      return approval ? [approval] : [];
    })
    .sort(compareEntities);

  return { approvals, autonomyPolicies, boards, cards, feedRules, goals };
}

/**
 * Builds the Board read model and freezes the policy-derived gate for this
 * relay snapshot. Callers must not persist this value: a policy update is
 * reflected by the next snapshot rebuild.
 */
export function buildBoardState(events: readonly RelayEvent[]): BoardState {
  const snapshot = buildBoardSnapshot(events);
  const policies = snapshot.autonomyPolicies.map((entity) => entity.policy);
  const requiresApprovalByCardAddress: Record<string, boolean> = {};

  for (const entity of snapshot.cards) {
    requiresApprovalByCardAddress[entity.address] = evaluateAutonomy(
      entity.card,
      policies,
    );
  }

  return { ...snapshot, requiresApprovalByCardAddress };
}

function requireBoardAddress(value: string): ParsedAddress {
  const address = parseAddress(value, KIND_BOARD);
  if (!address)
    throw new Error("Board address must be a valid 30623 coordinate.");
  return address;
}

function requireCardAddress(value: string): ParsedAddress {
  const address = parseAddress(value, KIND_BOARD_CARD);
  if (!address)
    throw new Error("Card address must be a valid 30624 coordinate.");
  return address;
}

function serialize(value: unknown): string {
  return JSON.stringify(value);
}

/** Creates the addressable event template for a Board and its embedded lists. */
export function buildBoardEventTemplate(board: Board): BoardEventTemplate {
  if (!isNonEmptyString(board.id) || !isNonEmptyString(board.title)) {
    throw new Error("Board id and title are required.");
  }
  if (
    board.lists.some(
      (list) => !isNonEmptyString(list.id) || !isValidRank(list.rank),
    )
  ) {
    throw new Error(
      "Every Board list requires a stable id and fractional rank.",
    );
  }
  const { id, ...content } = board;
  // Mirror the card contract's brand tag so relays can index boards by brand
  // scope server-side instead of scanning every board head client-side.
  const tags: string[][] = board.brandScope
    ? [
        ["d", id],
        ["t", `brand:${board.brandScope}`],
      ]
    : [["d", id]];
  return {
    kind: KIND_BOARD,
    content: serialize(content),
    tags,
  };
}

/** Creates the addressable, indexed event template for a Board card. */
export function buildCardEventTemplate({
  boardAddress,
  card,
}: {
  boardAddress: string;
  card: Card;
}): BoardEventTemplate {
  const board = requireBoardAddress(boardAddress);
  if (
    !isNonEmptyString(card.id) ||
    !isNonEmptyString(card.title) ||
    !isNonEmptyString(card.description) ||
    !isNonEmptyString(card.listId) ||
    !isValidRank(card.rank) ||
    !FUNCTION_AREAS.has(card.functionArea) ||
    !CARD_EXECUTION_STATES.has(card.executionState) ||
    card.boardId !== board.dtag
  ) {
    throw new Error("Card fields do not satisfy the Board event contract.");
  }
  const tags: string[][] = [
    ["d", card.id],
    ["a", boardAddress],
    ["l", card.listId],
    ["t", `brand:${card.brand}`],
    ["t", `fn:${card.functionArea}`],
    ...card.assignees.map((assignee) => [
      "p",
      assignee.id,
      "",
      assignee.role ?? "",
    ]),
    ["rank", card.rank],
  ];
  const lineage = card.sourceLineage;
  if (lineage?.ruleId || lineage?.triggerEventId) {
    if (!lineage.ruleId || !lineage.triggerEventId) {
      throw new Error(
        "Feed-rule effects require both a rule and trigger event id.",
      );
    }
    tags.push(
      ["feedRule", lineage.ruleId, lineage.triggerEventId],
      ["e", lineage.triggerEventId],
    );
  }
  const { id, brand, functionArea, rank, listId, boardId, ...content } = card;
  void id;
  void brand;
  void functionArea;
  void rank;
  void listId;
  void boardId;
  return {
    kind: KIND_BOARD_CARD,
    content: serialize(content),
    tags,
  };
}

/** Creates the addressable event template for a structured Board goal. */
export function buildGoalEventTemplate(goal: Goal): BoardEventTemplate {
  if (!isNonEmptyString(goal.id)) throw new Error("Goal id is required.");
  const { id, ...content } = goal;
  return {
    kind: KIND_BOARD_GOAL,
    content: serialize(content),
    tags: [["d", id]],
  };
}

/** Creates the addressable event template for a Board feed rule. */
export function buildFeedRuleEventTemplate(rule: FeedRule): BoardEventTemplate {
  if (!isNonEmptyString(rule.id)) throw new Error("Feed rule id is required.");
  const { id, ...content } = rule;
  return {
    kind: KIND_BOARD_FEED_RULE,
    content: serialize(content),
    tags: [["d", id]],
  };
}

/** Creates the addressable event template for one agent/function autonomy policy. */
export function buildAutonomyPolicyEventTemplate(
  policy: AutonomyPolicy,
): BoardEventTemplate {
  if (
    !isNonEmptyString(policy.agentId) ||
    !FUNCTION_AREAS.has(policy.functionArea) ||
    !AUTONOMY_LEVELS.has(policy.autonomyLevel)
  ) {
    throw new Error("Autonomy policy fields are invalid.");
  }
  return {
    kind: KIND_BOARD_AUTONOMY_POLICY,
    content: serialize(policy),
    tags: [["d", `${policy.agentId}:${policy.functionArea}`]],
  };
}

/** Creates an append-only request asking the supplied people to approve a card. */
export function buildApprovalRequestEventTemplate({
  cardAddress,
  approvers,
}: {
  cardAddress: string;
  approvers: readonly string[];
}): BoardEventTemplate {
  requireCardAddress(cardAddress);
  const normalizedApprovers = [
    ...new Set(approvers.map((value) => value.toLowerCase())),
  ];
  if (
    normalizedApprovers.length === 0 ||
    !normalizedApprovers.every((value) => PUBKEY_PATTERN.test(value))
  ) {
    throw new Error("At least one valid approver pubkey is required.");
  }
  return {
    kind: KIND_BOARD_APPROVAL_REQUESTED,
    content: "{}",
    tags: [
      ["a", cardAddress],
      ...normalizedApprovers.map((pubkey) => ["p", pubkey]),
    ],
  };
}

/** Creates an append-only grant or denial event for a Board card approval. */
export function buildApprovalDecisionEventTemplate({
  cardAddress,
  decision,
}: {
  cardAddress: string;
  decision: ApprovalDecision;
}): BoardEventTemplate {
  requireCardAddress(cardAddress);
  return {
    kind:
      decision.state === "approved"
        ? KIND_BOARD_APPROVAL_GRANTED
        : KIND_BOARD_APPROVAL_DENIED,
    content: serialize({
      ...(decision.reason ? { reason: decision.reason } : {}),
      ...(decision.policySnapshot
        ? { policySnapshot: decision.policySnapshot }
        : {}),
    }),
    tags: [["a", cardAddress]],
  };
}
