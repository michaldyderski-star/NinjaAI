import { useState } from "react";
import { calculatePlan } from "../lib/calc";
import { formatMoney, formatPercent } from "../lib/format";
import type { BudgetPlan } from "../lib/model";

export const MAX_COMPARE = 3;

interface Props {
  plans: BudgetPlan[];
  currentId: string;
  selected: string[];
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onToggleCompare: (id: string) => void;
}

export function PlanList({
  plans,
  currentId,
  selected,
  onOpen,
  onDuplicate,
  onRename,
  onDelete,
  onToggleCompare,
}: Props) {
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (plans.length === 0) {
    return <p className="muted small">Nie masz jeszcze zapisanych planów. Zapisane plany zostają w tej przeglądarce.</p>;
  }

  const sorted = [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <ul className="plans">
      {sorted.map((p) => {
        const r = calculatePlan(p.annualBudget, p.allocations);
        const checked = selected.includes(p.id);
        const compareDisabled = !checked && selected.length >= MAX_COMPARE;
        return (
          <li key={p.id} className={`plan${p.id === currentId ? " is-current" : ""}`}>
            <div className="plan-top">
              <input
                type="checkbox"
                checked={checked}
                disabled={compareDisabled}
                onChange={() => onToggleCompare(p.id)}
                aria-label={`Porównaj: ${p.name}`}
                title={compareDisabled ? `Możesz porównać maksymalnie ${MAX_COMPARE} plany` : "Dodaj do porównania"}
              />
              {renaming === p.id ? (
                <form
                  className="plan-rename"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (draft.trim()) onRename(p.id, draft.trim());
                    setRenaming(null);
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    aria-label="Nowa nazwa planu"
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => setRenaming(null)}
                    onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                  />
                </form>
              ) : (
                <button type="button" className="plan-name" onClick={() => onOpen(p.id)}>
                  {p.name}
                </button>
              )}
              <span className={`status status-${p.status}`}>{p.status === "final" ? "gotowy" : "szkic"}</span>
            </div>
            <p className="plan-meta">
              {p.year} · {formatMoney(p.annualBudget)} · ROI{" "}
              {r.weightedRoiPercent === null ? "—" : formatPercent(r.weightedRoiPercent)}
            </p>
            <div className="plan-actions">
              <button
                type="button"
                className="link"
                onClick={() => {
                  setDraft(p.name);
                  setRenaming(p.id);
                }}
              >
                Zmień nazwę
              </button>
              <button type="button" className="link" onClick={() => onDuplicate(p.id)}>
                Duplikuj
              </button>
              <button
                type="button"
                className="link danger"
                onClick={() => {
                  if (window.confirm(`Usunąć plan „${p.name}”? Tej operacji nie można cofnąć.`)) onDelete(p.id);
                }}
              >
                Usuń
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
