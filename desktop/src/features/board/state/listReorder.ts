import { arrayMove } from "@dnd-kit/sortable";
import { rankBetween, type RankedEntry } from "./rank.ts";

export interface BoardList extends RankedEntry {
  id: string;
  title: string;
  rank: string;
}

export function reorderLists<T extends BoardList>(
  lists: readonly T[],
  activeId: string,
  overId: string,
): T[] | null {
  const activeIndex = lists.findIndex((l) => l.id === activeId);
  const overIndex = lists.findIndex((l) => l.id === overId);
  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return null;
  }

  const newLists = arrayMove(lists, activeIndex, overIndex);
  const movedIndex = overIndex;
  const before = movedIndex === 0 ? null : newLists[movedIndex - 1].rank;
  const after =
    movedIndex === newLists.length - 1 ? null : newLists[movedIndex + 1].rank;

  return newLists.map((list, index) =>
    index === movedIndex ? { ...list, rank: rankBetween(before, after) } : list,
  );
}
