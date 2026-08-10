import React from 'react';
import { Goal } from '../types/boardTypes';

export interface GoalDraftPanelProps {
  goal: Goal | null;
  onApproveGoal?: (goalId: string) => void;
  onRejectGoal?: (goalId: string) => void;
}

export const GoalDraftPanel: React.FC<GoalDraftPanelProps> = ({
  goal,
  onApproveGoal,
  onRejectGoal,
}) => {
  if (!goal) return null;

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-950/10 p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">☄️</span>
          <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
            Comet Goal Structuring & Proposed Card Batch
          </h3>
        </div>
        <div className="flex items-center gap-2 text-2xs">
          <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 font-semibold border border-amber-700/50">
            {goal.framework} Framework
          </span>
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
            {goal.status}
          </span>
        </div>
      </div>

      {/* Framework Breakdown */}
      {goal.framework === 'SMART' && goal.smart && (
        <div className="space-y-2 text-xs bg-sidebar/50 p-3.5 rounded-lg border border-sidebar-border">
          <h4 className="font-bold text-foreground">SMART Criteria Breakdown:</h4>
          <ul className="space-y-1 text-muted-foreground pl-2 border-l-2 border-amber-500/40">
            <li><strong className="text-foreground">Specific:</strong> {goal.smart.specific}</li>
            <li><strong className="text-foreground">Measurable:</strong> {goal.smart.measurable}</li>
            <li><strong className="text-foreground">Attainable:</strong> {goal.smart.attainable}</li>
            <li><strong className="text-foreground">Relevant:</strong> {goal.smart.relevant}</li>
            <li><strong className="text-foreground">Time-bound:</strong> {goal.smart.timeBound}</li>
          </ul>
        </div>
      )}

      {/* Proposed Cards List */}
      <div>
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
          Proposed Card Batch ({goal.proposedCards.length} Cards)
        </h4>
        <div className="space-y-2">
          {goal.proposedCards.map((proposed, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-amber-400 font-bold">{idx + 1}.</span>
                <span className="font-medium text-foreground">{proposed.cardDraft.title || 'Untitled Card'}</span>
              </div>
              <div className="flex items-center gap-2 text-2xs">
                <span className="px-2 py-0.5 rounded bg-sidebar-accent text-sidebar-foreground">
                  @{proposed.suggestedAssignee}
                </span>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                  {proposed.cardDraft.functionArea || 'build'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        {onRejectGoal && (
          <button
            onClick={() => onRejectGoal(goal.id)}
            className="px-4 py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition-colors border border-rose-600/40"
          >
            Reject Proposal
          </button>
        )}
        {onApproveGoal && (
          <button
            onClick={() => onApproveGoal(goal.id)}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 text-xs font-bold transition-colors shadow-md"
          >
            ✓ Approve Goal & Spawn Cards
          </button>
        )}
      </div>
    </div>
  );
};
