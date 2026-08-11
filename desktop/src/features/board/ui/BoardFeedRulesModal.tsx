import type React from "react";
import type { FeedRule } from "../types/boardTypes";

export interface BoardFeedRulesModalProps {
  rules: FeedRule[];
  isOpen: boolean;
  onClose: () => void;
  onToggleRule?: (ruleId: string, enabled: boolean) => void;
  onDeleteRule?: (ruleId: string) => void;
}

const BROKEN_REASON_COPY: Record<
  NonNullable<FeedRule["broken"]>["reason"],
  string
> = {
  target_list_missing: "Target list has been deleted or removed",
  target_board_missing: "Target board is missing or unreachable",
};

export const BoardFeedRulesModal: React.FC<BoardFeedRulesModalProps> = ({
  rules,
  isOpen,
  onClose,
  onToggleRule,
  onDeleteRule,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar/50">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <span>⚡</span> Board Interconnection & Feed Rules
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {rules.map((rule) => {
            const isBroken = Boolean(rule.broken);
            const reasonText =
              isBroken && rule.broken
                ? BROKEN_REASON_COPY[rule.broken.reason] || rule.broken.reason
                : "";

            return (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  isBroken
                    ? "bg-rose-950/20 border-2 border-rose-500/80 text-rose-200"
                    : "bg-sidebar/40 border-sidebar-border text-foreground"
                }`}
              >
                {/* Rule Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="font-mono bg-muted/60 px-1.5 py-0.5 rounded text-2xs">
                      {rule.action}
                    </span>
                    <span>Rule ID: {rule.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onToggleRule && (
                      <button
                        type="button"
                        onClick={() => onToggleRule(rule.id, !rule.enabled)}
                        className={`px-2.5 py-1 rounded text-2xs font-bold transition-colors ${
                          rule.enabled
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-700/60"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {rule.enabled ? "Active" : "Disabled"}
                      </button>
                    )}
                    {onDeleteRule && (
                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule.id)}
                        className="text-muted-foreground hover:text-rose-400 p-1 text-xs"
                        title="Delete Rule"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {/* Broken Rule Warning Callout */}
                {isBroken && rule.broken && (
                  <div className="p-2.5 rounded bg-rose-950/50 border border-rose-800/60 text-2xs text-rose-200 font-semibold space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-300">
                      <span>⚠️ BROKEN FEED RULE:</span>
                      <span>{reasonText}</span>
                      {rule.broken.detail && (
                        <span>({rule.broken.detail})</span>
                      )}
                    </div>
                    <div className="text-badge text-rose-300/70">
                      Detected:{" "}
                      {new Date(rule.broken.detectedAt).toLocaleString()}
                    </div>
                  </div>
                )}

                {/* Routing Flow Visual */}
                <div className="flex items-center gap-2 text-2xs text-muted-foreground font-mono bg-background/50 p-2 rounded border border-border">
                  <span className="text-foreground">
                    {rule.sourceBoardId}:{rule.sourceListId}
                  </span>
                  <span className="text-primary font-bold">
                    ➔ [{rule.action}] ➔
                  </span>
                  <span className="text-foreground">
                    {rule.targetBoardId}:{rule.targetListId}
                  </span>
                </div>
              </div>
            );
          })}

          {rules.length === 0 && (
            <div className="text-center py-12 text-xs text-muted-foreground italic border border-dashed border-border rounded-xl">
              No feed rules configured. Click below to connect boards.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
