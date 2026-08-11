import type React from "react";
import { useState } from "react";

import type {
  AutonomyPolicy,
  Board,
  Card,
  FeedRule,
  Goal,
} from "./types/boardTypes";
import { BoardCardModal } from "./ui/BoardCardModal";
import { BoardColumn } from "./ui/BoardColumn";
import { BoardFeedRulesModal } from "./ui/BoardFeedRulesModal";
import { GoalDraftPanel } from "./ui/GoalDraftPanel";

export interface BoardViewProps {
  board: Board;
  cards: Card[];
  goals?: Goal[];
  autonomyPolicies: AutonomyPolicy[];
  feedRules?: FeedRule[];
  onApproveCard?: (cardId: string) => void;
  onRejectCard?: (cardId: string, reason: string) => void;
  onAddComment?: (cardId: string, commentBody: string) => void;
  onApproveGoal?: (goalId: string) => void;
  onRejectGoal?: (goalId: string) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({
  board,
  cards,
  goals = [],
  autonomyPolicies,
  feedRules = [],
  onApproveCard,
  onRejectCard,
  onAddComment,
  onApproveGoal,
  onRejectGoal,
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isFeedRulesOpen, setIsFeedRulesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"columns" | "goals" | "feedRules">(
    "columns",
  );

  const pendingGoals = goals.filter((g) => g.status === "proposed");

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      {/* Board Header Bar */}
      <div className="h-14 border-b border-border bg-sidebar/30 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h1 className="text-base font-bold text-foreground">
              {board.title}
            </h1>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-2xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("columns")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "columns"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Kanban Columns
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("goals")}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === "goals"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>Goals & Frameworks</span>
              {pendingGoals.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-amber-950 font-bold text-3xs flex items-center justify-center">
                  {pendingGoals.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsFeedRulesOpen(true)}
            className="px-3 py-1.5 rounded-lg border border-border bg-sidebar hover:bg-sidebar-accent text-2xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
          >
            <span>⚡ Feed Rules</span>
            {feedRules.some((r) => r.broken) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* Main Canvas Surface */}
      <div className="flex-1 overflow-x-auto p-6 bg-background">
        {activeTab === "columns" && (
          <div className="flex h-full gap-4 items-start">
            {board.lists.map((list) => {
              const listCards = cards.filter((c) => c.listId === list.id);
              return (
                <BoardColumn
                  key={list.id}
                  listId={list.id}
                  title={list.title}
                  cards={listCards}
                  autonomyPolicies={autonomyPolicies}
                  onSelectCard={(card) => setSelectedCard(card)}
                />
              );
            })}
          </div>
        )}

        {activeTab === "goals" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Pending Comet Goal Proposals
            </h2>
            {pendingGoals.map((goal) => (
              <GoalDraftPanel
                key={goal.id}
                goal={goal}
                onApproveGoal={onApproveGoal}
                onRejectGoal={onRejectGoal}
              />
            ))}
            {pendingGoals.length === 0 && (
              <div className="text-center py-16 text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
                No active Comet goal proposals requiring review.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Detail Modal Drawer */}
      <BoardCardModal
        card={selectedCard}
        autonomyPolicies={autonomyPolicies}
        isOpen={Boolean(selectedCard)}
        onClose={() => setSelectedCard(null)}
        onApproveCard={onApproveCard}
        onRejectCard={onRejectCard}
        onAddComment={onAddComment}
      />

      {/* Feed Rules Config Modal */}
      <BoardFeedRulesModal
        rules={feedRules}
        isOpen={isFeedRulesOpen}
        onClose={() => setIsFeedRulesOpen(false)}
      />
    </div>
  );
};
