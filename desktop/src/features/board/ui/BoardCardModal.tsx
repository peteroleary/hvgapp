import type React from "react";
import { useState } from "react";

import type { UserProfileLookup } from "@/features/profile/lib/identity";

import { assigneeDisplayName } from "../state/assigneeNames";
import type { Card } from "../types/boardTypes";
import { BRAND_TOKENS, brandDisplayName, FUNCTION_TOKENS } from "./BoardCard";

export interface BoardCardModalProps {
  card: Card | null;
  requiresApproval: boolean;
  isOpen: boolean;
  onClose: () => void;
  onApproveCard?: (cardId: string) => void;
  onRejectCard?: (cardId: string, reason: string) => void;
  onAddComment?: (cardId: string, commentBody: string) => void;
  /** Resolved kind:0 profiles for this board's assignees. */
  profiles?: UserProfileLookup;
}

export const BoardCardModal: React.FC<BoardCardModalProps> = ({
  card,
  requiresApproval,
  isOpen,
  onClose,
  onApproveCard,
  onRejectCard,
  onAddComment,
  profiles,
}) => {
  const [commentText, setCommentText] = useState("");
  const [rejectionReasonText, setRejectionReasonText] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen || !card) return null;

  const isRejected = card.approvalDecision?.state === "rejected";
  const brandStyle = BRAND_TOKENS[card.brand] || {
    badge: "bg-muted text-muted-foreground",
  };
  const functionStyle =
    FUNCTION_TOKENS[card.functionArea] || FUNCTION_TOKENS.other;

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !onAddComment) return;
    onAddComment(card.id, commentText.trim());
    setCommentText("");
  };

  const handleConfirmReject = () => {
    if (!rejectionReasonText.trim() || !onRejectCard) return;
    onRejectCard(card.id, rejectionReasonText.trim());
    setRejectionReasonText("");
    setIsRejecting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar/50">
          <div className="flex items-center gap-2">
            <span
              className={`text-2xs font-semibold uppercase px-2 py-0.5 rounded border ${brandStyle.badge}`}
            >
              {brandDisplayName(card.brand)}
            </span>
            <span
              className={`text-2xs font-semibold uppercase px-2 py-0.5 rounded border ${functionStyle}`}
            >
              {card.functionArea}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Metadata */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {card.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
              <span>
                ID: <code className="font-mono">{card.id}</code>
              </span>
              <span>
                Created by{" "}
                <strong className="text-foreground">@{card.createdBy}</strong>
              </span>
              <span>
                List: <strong className="text-foreground">{card.listId}</strong>
              </span>
            </div>
          </div>

          {/* Approval Gate Banner */}
          {isRejected ? (
            <div className="p-4 rounded-lg bg-rose-950/20 border-2 border-rose-600/80 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                <span>🚫 WORK REJECTED</span>
                {card.approvalDecision?.by && (
                  <span>BY @{card.approvalDecision.by}</span>
                )}
              </div>
              {card.approvalDecision?.reason && (
                <p className="text-xs text-rose-200 bg-rose-950/40 p-2.5 rounded border border-rose-800/40">
                  {card.approvalDecision.reason}
                </p>
              )}
            </div>
          ) : requiresApproval ? (
            <div className="p-4 rounded-lg bg-amber-950/20 border-2 border-amber-500/70 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <span>🛡️ APPROVAL REQUIRED BEFORE EXECUTION</span>
              </div>
              <p className="text-2xs text-amber-200/90">
                This card requires explicit human sign-off based on the Autonomy
                Policy for assigned agents.
              </p>
              {isRejecting ? (
                <div className="space-y-2 pt-2">
                  <input
                    type="text"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReasonText}
                    onChange={(e) => setRejectionReasonText(e.target.value)}
                    className="w-full text-xs p-2 rounded bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmReject}
                      className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-2xs font-semibold transition-colors"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground text-2xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {onApproveCard && (
                    <button
                      type="button"
                      onClick={() => onApproveCard(card.id)}
                      className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-2xs font-semibold transition-colors"
                    >
                      ✓ Approve & Grant Execution
                    </button>
                  )}
                  {onRejectCard && (
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="px-3 py-1.5 rounded bg-rose-600/80 hover:bg-rose-600 text-white text-2xs font-semibold transition-colors"
                    >
                      ✕ Reject / Request Revision
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="px-3 py-2 rounded bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 text-2xs font-semibold flex items-center gap-1.5">
              <span>⚡ Auto-Authorized by Autonomy Policy</span>
            </div>
          )}

          {/* Two-Column Grid Layout (65% / 35%) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Column (65%) */}
            <div className="md:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Description
                </h3>
                <div className="p-3.5 rounded-lg bg-sidebar/40 border border-sidebar-border text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {card.description || "No description provided."}
                </div>
              </div>

              {/* Linked Code / Issue */}
              {card.linkedGitIssue && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Linked Git Issue
                  </h3>
                  <div className="p-2.5 rounded bg-muted/30 border border-border text-xs font-mono text-primary inline-flex items-center gap-2">
                    <span>git:#{card.linkedGitIssue}</span>
                  </div>
                </div>
              )}

              {/* Activity & Comments Log */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Activity & Comments
                </h3>
                <div className="space-y-3 mb-4">
                  {card.comments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-sidebar/30 border border-sidebar-border/60 text-xs"
                    >
                      <div className="flex items-center justify-between text-2xs text-muted-foreground mb-1">
                        <strong className="text-foreground">
                          @{c.authorId}
                        </strong>
                        <span>
                          {new Date(c.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-foreground/90">{c.body}</p>
                    </div>
                  ))}
                  {card.comments.length === 0 && (
                    <p className="text-2xs text-muted-foreground italic">
                      No comments yet.
                    </p>
                  )}
                </div>

                {/* Comment Input */}
                {onAddComment && (
                  <form onSubmit={handleSendComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a comment or execution note..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="flex-1 text-xs p-2.5 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Sidebar Column (35%) */}
            <div className="space-y-5 border-t md:border-t-0 md:border-l border-border md:pl-6 pt-6 md:pt-0">
              {/* Multi-Assignee Panel */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Assignees
                </h3>
                <div className="space-y-2">
                  {card.assignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center justify-between p-2 rounded bg-sidebar/50 border border-sidebar-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            assignee.type === "agent"
                              ? "bg-amber-400"
                              : "bg-blue-400"
                          }`}
                        />
                        <span
                          className="font-medium text-foreground"
                          title={assignee.id}
                        >
                          @{assigneeDisplayName(assignee, profiles)}
                        </span>
                      </div>
                      {assignee.role && (
                        <span className="text-badge uppercase font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {assignee.role}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Execution State */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Execution State
                </h3>
                <span className="inline-block text-xs font-mono capitalize px-2.5 py-1 rounded bg-muted text-foreground border border-border">
                  {card.executionState}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
