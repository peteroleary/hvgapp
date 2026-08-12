import type React from "react";
import { useState } from "react";

import { BRAND_TOKENS, brandDisplayName } from "./BoardCard";

/** The fields the create-board form collects before a Board is assembled. */
export interface BoardDraft {
  title: string;
  description?: string;
  brandScope?: string;
}

export interface BoardCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (draft: BoardDraft) => void;
}

const BRAND_OPTIONS = Object.keys(BRAND_TOKENS);

/**
 * Create-board form. Boards carry their lists embedded, so a new board is
 * stamped with the standard four-list template by the caller; this modal only
 * collects identity (title, description, optional brand scope).
 */
export const BoardCreateModal: React.FC<BoardCreateModalProps> = ({
  isOpen,
  onClose,
  onCreateBoard,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brandScope, setBrandScope] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onCreateBoard({
      title: title.trim(),
      description: description.trim() || undefined,
      brandScope: brandScope || undefined,
    });
    setTitle("");
    setDescription("");
    setBrandScope("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar/50">
          <h2 className="text-sm font-bold text-foreground">New Board</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. K&B Concrete"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Brand
            </span>
            <select
              value={brandScope}
              onChange={(e) => setBrandScope(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
            >
              <option value="">Cross-brand (Unified Master)</option>
              {BRAND_OPTIONS.map((brand) => (
                <option key={brand} value={brand}>
                  {brandDisplayName(brand)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description <span className="normal-case">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 resize-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-sidebar/50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border text-2xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Board
          </button>
        </div>
      </form>
    </div>
  );
};
