import React from 'react';
import { Card, AutonomyPolicy, evaluateAutonomy } from '../types/boardTypes';

export interface BoardCardProps {
  card: Card;
  autonomyPolicies: AutonomyPolicy[];
  onSelectCard: (card: Card) => void;
}

export const BRAND_TOKENS: Record<string, { badge: string; border: string }> = {
  MoSober: {
    badge: 'bg-amber-950/40 text-amber-300 border-amber-700/50',
    border: 'border-amber-600',
  },
  'Clean Startup': {
    badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50',
    border: 'border-emerald-500',
  },
  We3Live: {
    badge: 'bg-purple-950/40 text-purple-300 border-purple-700/50',
    border: 'border-purple-500',
  },
  HVG: {
    badge: 'bg-blue-950/40 text-blue-300 border-blue-700/50',
    border: 'border-blue-500',
  },
  'K&B': {
    badge: 'bg-stone-800 text-stone-200 border-stone-600',
    border: 'border-stone-400',
  },
  'hvg.app': {
    badge: 'bg-yellow-950/40 text-yellow-300 border-yellow-700/50',
    border: 'border-yellow-500',
  },
};

export const FUNCTION_TOKENS: Record<string, string> = {
  build: 'text-cyan-400 bg-cyan-950/30 border-cyan-800/40',
  design: 'text-fuchsia-400 bg-fuchsia-950/30 border-fuchsia-800/40',
  content: 'text-indigo-400 bg-indigo-950/30 border-indigo-800/40',
  social: 'text-pink-400 bg-pink-950/30 border-pink-800/40',
  marketing: 'text-orange-400 bg-orange-950/30 border-orange-800/40',
  sales: 'text-green-400 bg-green-950/30 border-green-800/40',
  research: 'text-teal-400 bg-teal-950/30 border-teal-800/40',
  other: 'text-slate-400 bg-slate-900 border-slate-700/40',
};

export const BoardCard: React.FC<BoardCardProps> = ({
  card,
  autonomyPolicies,
  onSelectCard,
}) => {
  const requiresApproval = evaluateAutonomy(card, autonomyPolicies);
  const isRejected = card.approvalDecision?.state === 'rejected';

  const brandStyle = BRAND_TOKENS[card.brand] || {
    badge: 'bg-muted text-muted-foreground border-border',
    border: 'border-border',
  };

  const functionStyle = FUNCTION_TOKENS[card.functionArea] || FUNCTION_TOKENS.other;

  let cardStateStyle = 'bg-card border-border/80 hover:border-primary/50';
  if (isRejected) {
    cardStateStyle = 'bg-rose-950/20 border-2 border-rose-600/80 shadow-[0_0_12px_rgba(225,29,72,0.2)]';
  } else if (requiresApproval) {
    cardStateStyle = 'bg-amber-950/10 border-2 border-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
  } else if (card.executionState === 'blocked') {
    cardStateStyle = 'bg-rose-950/10 border-l-4 border-l-rose-500 border-border/60';
  } else if (card.executionState === 'running') {
    cardStateStyle = 'border-primary/80 ring-1 ring-primary/30';
  } else if (card.executionState === 'completed') {
    cardStateStyle = 'opacity-75 bg-muted/20 border-border/40';
  }

  return (
    <div
      onClick={() => onSelectCard(card)}
      className={`group relative rounded-md p-3 shadow-sm transition-all cursor-pointer ${cardStateStyle}`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${brandStyle.badge}`}
        >
          {card.brand}
        </span>

        {isRejected ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-rose-950/60 text-rose-300 border-rose-600/70 animate-pulse">
            🚫 Rejected
          </span>
        ) : requiresApproval ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-amber-950/40 text-amber-300 border-amber-700/50">
            🛡️ Needs Approval
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary mb-1.5">
        {card.title}
      </h4>

      {/* Linked Git Issue / Source Lineage */}
      <div className="flex flex-wrap items-center gap-2 mb-2 text-2xs text-muted-foreground">
        {card.linkedGitIssue && (
          <span className="font-mono bg-muted/60 px-1 py-0.5 rounded">
            git:#{card.linkedGitIssue}
          </span>
        )}
        {card.sourceLineage && (
          <span className="bg-muted/40 px-1 py-0.5 rounded text-[9px]">
            ↖ From: {card.sourceLineage.fromBoardTitle}
          </span>
        )}
      </div>

      {/* Bottom Bar: Assignees & Metadata */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 mt-2">
        {/* Assignee Avatar Stack */}
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {card.assignees.map((assignee, idx) => (
            <div
              key={assignee.id + idx}
              title={`${assignee.id} (${assignee.role || 'assignee'})`}
              className="relative inline-flex items-center justify-center w-5 h-5 rounded-full bg-sidebar-accent text-sidebar-foreground border border-background text-[10px] font-bold"
            >
              {assignee.id.slice(0, 2).toUpperCase()}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${
                  assignee.type === 'agent' ? 'bg-amber-400' : 'bg-blue-400'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Function Tag & Comment Count */}
        <div className="flex items-center gap-1.5 text-2xs">
          <span
            className={`px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize ${functionStyle}`}
          >
            {card.functionArea}
          </span>
          {card.comments.length > 0 && (
            <span className="text-muted-foreground flex items-center gap-0.5">
              💬 {card.comments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
