import type React from "react";
import { useState } from "react";

import { buildCreatedGoal } from "../state/createGoal";
import type { Goal } from "../types/boardTypes";

export interface GoalCreateFormProps {
  brandScope: string;
  onCreateGoal: (goal: Goal) => void;
  onCancel: () => void;
}

export const GoalCreateForm: React.FC<GoalCreateFormProps> = ({
  brandScope,
  onCreateGoal,
  onCancel,
}) => {
  const [specific, setSpecific] = useState("");
  const [measurable, setMeasurable] = useState("");
  const [timeBound, setTimeBound] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const goal = buildCreatedGoal({
        id: crypto.randomUUID(),
        brandScope,
        specific,
        measurable,
        timeBound,
      });
      onCreateGoal(goal);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-card p-5 space-y-3"
    >
      <h3 className="text-sm font-bold text-foreground">Set a goal</h3>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Specific
        <input
          required
          value={specific}
          onChange={(event) => setSpecific(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
          placeholder="What is true when this is done?"
        />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Measurable
        <input
          value={measurable}
          onChange={(event) => setMeasurable(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        />
      </label>
      <label className="block space-y-1 text-xs text-muted-foreground">
        Time-bound
        <input
          value={timeBound}
          onChange={(event) => setTimeBound(event.target.value)}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground"
        />
      </label>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-border text-2xs font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-2xs font-semibold"
        >
          Set goal
        </button>
      </div>
    </form>
  );
};
