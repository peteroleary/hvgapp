import type React from "react";
import { useState } from "react";

import type { FunctionArea } from "../types/boardTypes";
import { BRAND_TOKENS, brandDisplayName, FUNCTION_TOKENS } from "./BoardCard";

/** The fields the add-card form collects before a Card is assembled. */
export interface CardDraft {
  title: string;
  description: string;
  brand: string;
  functionArea: FunctionArea;
}

export interface CardComposerModalProps {
  isOpen: boolean;
  listTitle: string;
  /** Brand inherited from the board's scope; the composer defaults to it. */
  defaultBrand?: string;
  onClose: () => void;
  onAddCard: (draft: CardDraft) => void;
}

const BRAND_OPTIONS = Object.keys(BRAND_TOKENS);
const FUNCTION_OPTIONS = Object.keys(FUNCTION_TOKENS) as FunctionArea[];

/**
 * Add-card composer for one column. Rank, list, board, and authorship are
 * stamped by the caller; this modal only collects the card's own fields.
 * Description is required because the Board event contract rejects cards
 * without one.
 */
export const CardComposerModal: React.FC<CardComposerModalProps> = ({
  isOpen,
  listTitle,
  defaultBrand,
  onClose,
  onAddCard,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [brand, setBrand] = useState(defaultBrand ?? BRAND_OPTIONS[0]);
  const [functionArea, setFunctionArea] = useState<FunctionArea>("other");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    onAddCard({
      title: title.trim(),
      description: description.trim(),
      brand,
      functionArea,
    });
    setTitle("");
    setDescription("");
    setBrand(defaultBrand ?? BRAND_OPTIONS[0]);
    setFunctionArea("other");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar/50">
          <h2 className="text-sm font-bold text-foreground">
            Add Card{" "}
            <span className="text-muted-foreground">→ {listTitle}</span>
          </h2>
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
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 resize-none"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex-1 space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand
              </span>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                {BRAND_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {brandDisplayName(option)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex-1 space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Function
              </span>
              <select
                value={functionArea}
                onChange={(e) =>
                  setFunctionArea(e.target.value as FunctionArea)
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                {FUNCTION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
            disabled={!title.trim() || !description.trim()}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Card
          </button>
        </div>
      </form>
    </div>
  );
};
