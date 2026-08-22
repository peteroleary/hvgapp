import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type React from "react";

import type { UserProfileLookup } from "@/features/profile/lib/identity";

import { compareRank } from "../state/rank";
import type { Card } from "../types/boardTypes";
import { BoardCard } from "./BoardCard";

interface SortableCardProps {
  card: Card;
  requiresApproval: boolean;
  onSelectCard: (card: Card) => void;
  profiles?: UserProfileLookup;
}

const SortableCard: React.FC<SortableCardProps> = ({
  card,
  requiresApproval,
  onSelectCard,
  profiles,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { listId: card.listId } });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <BoardCard
      ref={setNodeRef}
      card={card}
      requiresApproval={requiresApproval}
      onSelectCard={onSelectCard}
      profiles={profiles}
      isDragging={isDragging}
      style={style}
      {...attributes}
      {...listeners}
    />
  );
};

export interface BoardColumnProps {
  listId: string;
  title: string;
  cards: Card[];
  approvalPendingByCardId?: Readonly<Record<string, boolean>>;
  onSelectCard: (card: Card) => void;
  onAddCard?: (listId: string) => void;
  /** Resolved kind:0 profiles for this board's assignees. */
  profiles?: UserProfileLookup;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  listId,
  title,
  cards,
  approvalPendingByCardId = {},
  onSelectCard,
  onAddCard,
  profiles,
}) => {
  const { setNodeRef } = useDroppable({ id: listId, data: { listId } });

  const sortedCards = [...cards].sort((left, right) =>
    compareRank(
      { rank: left.rank, id: left.id },
      { rank: right.rank, id: right.id },
    ),
  );

  return (
    <div
      ref={setNodeRef}
      className="w-[320px] shrink-0 flex flex-col rounded-lg bg-sidebar border border-sidebar-border/60 max-h-full"
    >
      {/* Column Header */}
      <div className="h-11 flex items-center justify-between px-3.5 border-b border-sidebar-border/40 font-medium text-xs tracking-wider uppercase text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          <span className="text-2xs px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-semibold">
            {cards.length}
          </span>
        </div>
        {onAddCard && (
          <button
            type="button"
            onClick={() => onAddCard(listId)}
            className="p-1 rounded hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm font-bold"
            title="Add card"
          >
            +
          </button>
        )}
      </div>

      {/* Column Body / Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[150px]">
        <SortableContext
          items={sortedCards.map((card) => card.id)}
          strategy={verticalListSortingStrategy}
        >
          {sortedCards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              requiresApproval={approvalPendingByCardId[card.id] ?? false}
              onSelectCard={onSelectCard}
              profiles={profiles}
            />
          ))}
        </SortableContext>
        {sortedCards.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border/60 rounded-md text-2xs text-muted-foreground">
            No cards in this column
          </div>
        )}
      </div>
    </div>
  );
};
