import type React from "react";

import type { AutonomyPolicy, Card } from "../types/boardTypes";
import { BoardCard } from "./BoardCard";

export interface BoardColumnProps {
  listId: string;
  title: string;
  cards: Card[];
  autonomyPolicies: AutonomyPolicy[];
  onSelectCard: (card: Card) => void;
  onAddCard?: (listId: string) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  listId,
  title,
  cards,
  autonomyPolicies,
  onSelectCard,
  onAddCard,
}) => {
  return (
    <div className="w-[320px] shrink-0 flex flex-col rounded-lg bg-sidebar border border-sidebar-border/60 max-h-full">
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
        {cards.map((card) => (
          <BoardCard
            key={card.id}
            card={card}
            autonomyPolicies={autonomyPolicies}
            onSelectCard={onSelectCard}
          />
        ))}
        {cards.length === 0 && (
          <div className="flex items-center justify-center h-24 border border-dashed border-border/60 rounded-md text-2xs text-muted-foreground">
            No cards in this column
          </div>
        )}
      </div>
    </div>
  );
};
