import type React from "react";
import { useState } from "react";

import { assembleGoal, type GoalDraft } from "../state/goalDraft";
import type { Goal } from "../types/boardTypes";
import { BRAND_TOKENS, brandDisplayName } from "./BoardCard";

export interface GoalComposerModalProps {
  isOpen: boolean;
  defaultBrand?: string;
  onClose: () => void;
  onCreateGoal: (draft: GoalDraft) => void;
}

const BRAND_OPTIONS = Object.keys(BRAND_TOKENS);
const FRAMEWORKS: Goal["framework"][] = ["SMART", "OKR", "PACT"];

function brandOptionsFor(defaultBrand?: string): string[] {
  return [
    ...new Set(
      [defaultBrand, ...BRAND_OPTIONS].filter((value): value is string =>
        Boolean(value),
      ),
    ),
  ];
}

const EMPTY: GoalDraft = {
  brandScope: "",
  framework: "SMART",
  status: "draft",
};

/**
 * Compose a new Board goal. Rank, authorship, and the goal id are stamped by
 * the caller; this modal only collects the goal's own fields.
 */
export const GoalComposerModal: React.FC<GoalComposerModalProps> = ({
  isOpen,
  defaultBrand,
  onClose,
  onCreateGoal,
}) => {
  const brandOptions = brandOptionsFor(defaultBrand);
  const [draft, setDraft] = useState<GoalDraft>({
    ...EMPTY,
    brandScope: defaultBrand ?? brandOptions[0] ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const setField = <K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const next: GoalDraft = {
        ...draft,
        brandScope: draft.brandScope || defaultBrand || brandOptions[0] || "",
      };
      assembleGoal("pending", next);
      onCreateGoal(next);
      setDraft({
        ...EMPTY,
        brandScope: defaultBrand ?? brandOptions[0] ?? "",
      });
      setError(null);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create goal.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <form
        data-testid="goal-composer"
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-border bg-sidebar/50">
          <h2 className="text-sm font-bold text-foreground">New Goal</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-3">
            <label className="flex-1 space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand
              </span>
              <select
                value={draft.brandScope}
                onChange={(e) => setField("brandScope", e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                {brandOptions.map((option) => (
                  <option key={option} value={option}>
                    {brandDisplayName(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <select
                value={draft.status ?? "draft"}
                onChange={(e) =>
                  setField("status", e.target.value as Goal["status"])
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              >
                <option value="draft">draft</option>
                <option value="proposed">proposed</option>
                <option value="approved">approved</option>
                <option value="executing">executing</option>
              </select>
            </label>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              Framework
            </legend>
            <div className="flex gap-2">
              {FRAMEWORKS.map((framework) => (
                <button
                  key={framework}
                  type="button"
                  onClick={() => setField("framework", framework)}
                  className={`px-3 py-1.5 rounded-lg text-2xs font-semibold border transition-colors ${
                    draft.framework === framework
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {framework}
                </button>
              ))}
            </div>
          </fieldset>

          {draft.framework === "SMART" && (
            <div className="space-y-3">
              <Field
                label="Specific"
                value={draft.specific ?? ""}
                onChange={(value) => setField("specific", value)}
              />
              <Field
                label="Measurable"
                value={draft.measurable ?? ""}
                onChange={(value) => setField("measurable", value)}
              />
              <Field
                label="Attainable"
                value={draft.attainable ?? ""}
                onChange={(value) => setField("attainable", value)}
              />
              <Field
                label="Relevant"
                value={draft.relevant ?? ""}
                onChange={(value) => setField("relevant", value)}
              />
              <Field
                label="Time-bound"
                value={draft.timeBound ?? ""}
                onChange={(value) => setField("timeBound", value)}
              />
            </div>
          )}

          {draft.framework === "OKR" && (
            <div className="space-y-3">
              <Field
                label="Objective"
                value={draft.objective ?? ""}
                onChange={(value) => setField("objective", value)}
              />
              <Field
                label="Key result"
                value={draft.keyResultDescription ?? ""}
                onChange={(value) => setField("keyResultDescription", value)}
              />
              <Field
                label="Metric"
                value={draft.keyResultMetric ?? ""}
                onChange={(value) => setField("keyResultMetric", value)}
              />
            </div>
          )}

          {draft.framework === "PACT" && (
            <div className="space-y-3">
              <Field
                label="Purposeful"
                value={draft.purposeful ?? ""}
                onChange={(value) => setField("purposeful", value)}
              />
              <Field
                label="Actionable"
                value={draft.actionable ?? ""}
                onChange={(value) => setField("actionable", value)}
              />
              <Field
                label="Continuous"
                value={draft.continuous ?? ""}
                onChange={(value) => setField("continuous", value)}
              />
              <Field
                label="Trackable"
                value={draft.trackable ?? ""}
                onChange={(value) => setField("trackable", value)}
              />
            </div>
          )}

          {error ? <p className="text-2xs text-destructive">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border bg-sidebar/30">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border text-2xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="create-goal"
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold hover:bg-primary/90"
          >
            Create Goal
          </button>
        </div>
      </form>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60"
      />
    </label>
  );
}
