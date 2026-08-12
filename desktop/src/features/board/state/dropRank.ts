import { compareRank, rankBetween, type RankedEntry } from "./rank.ts";

export interface DropRankInput {
  /**
   * All items in the destination column. The dragged item is included if it
   * already lives in this column; cross-column drops may omit it. Every entry
   * must have an `id` so the helper can locate the active and over items.
   */
  column: readonly (RankedEntry & { id: string })[];
  /** The id of the item being dragged. */
  activeId: string;
  /**
   * The id of the drop target. This is either the id of an item in the column
   * (insert before/after it depending on direction) or the id of the column
   * container itself (append at end).
   */
  overId: string;
}

export interface DropRankResult {
  /** The new fractional rank for the dragged item. */
  rank: string;
}

/**
 * Determines the rank a dragged item should receive when dropped at its new
 * position. Returns `null` when the drop would not change the item's position.
 *
 * Direction-aware insertion matches dnd-kit sortable semantics:
 * - Dragging down within the same column lands after the over item.
 * - Dragging up within the same column lands before the over item.
 * - Cross-column drops always land before the over item.
 * - Dropping on the column container appends at the end.
 */
export function resolveDropRank({
  column,
  activeId,
  overId,
}: DropRankInput): DropRankResult | null {
  if (column.length === 0) {
    return { rank: rankBetween(null, null) };
  }

  const sorted = [...column].sort(compareRank);

  // Dropping on itself is a no-op.
  if (activeId === overId) {
    return null;
  }

  const activeIndex = sorted.findIndex((item) => item.id === activeId);
  const overIndexInSorted = sorted.findIndex((item) => item.id === overId);

  // overId is the container id: append at the end.
  if (overIndexInSorted === -1) {
    const withoutActive =
      activeIndex === -1 ? sorted : sorted.filter((item) => item.id !== activeId);
    const insertionIndex = withoutActive.length;
    // If the active card was already last in this column, appending is a no-op.
    if (activeIndex !== -1 && insertionIndex === activeIndex) {
      return null;
    }
    return { rank: rankBetween(withoutActive.at(-1)?.rank ?? null, null) };
  }

  if (activeIndex === -1) {
    // Cross-column drop: insert before the over item.
    const before = overIndexInSorted === 0 ? null : sorted[overIndexInSorted - 1].rank;
    const after = sorted[overIndexInSorted].rank;
    return { rank: rankBetween(before, after) };
  }

  // Within-column drop. Remove the dragged item so it does not become its own
  // neighbour, then decide whether to insert before or after the over item.
  const withoutActive = sorted.filter((item) => item.id !== activeId);
  const overIndexAmongRemaining = withoutActive.findIndex(
    (item) => item.id === overId,
  );

  // dnd-kit's arrayMove(oldIndex, newIndex) places the active item AT the over
  // index. If active was above over, that means inserting before over. If active
  // was below over, it means inserting after over.
  const insertionIndex =
    activeIndex < overIndexInSorted
      ? overIndexAmongRemaining + 1
      : overIndexAmongRemaining;

  // If the resolved insertion slot is the same as the active card's current
  // slot, the drop does not change its position.
  if (insertionIndex === activeIndex) {
    return null;
  }

  const before =
    insertionIndex === 0 ? null : withoutActive[insertionIndex - 1].rank;
  const after =
    insertionIndex === withoutActive.length
      ? null
      : withoutActive[insertionIndex].rank;

  return { rank: rankBetween(before, after) };
}
