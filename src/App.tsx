import { useCallback, useEffect, useMemo, useState } from "react";
import { AllocationTable } from "./components/AllocationTable";
import { Charts } from "./components/Charts";
import { Compare } from "./components/Compare";
import { Kpis } from "./components/Kpis";
import { NumberField } from "./components/NumberField";
import { MAX_COMPARE, PlanList } from "./components/PlanList";
import { SumBar } from "./components/SumBar";
import { calculatePlan, distributeRemainder, resetShares } from "./lib/calc";
import { downloadText, planToCsv, safeFilename } from "./lib/csv";
import { formatMoney, zlToGrosze } from "./lib/format";
import { duplicatePlan, emptyPlan, examplePlan, type BudgetPlan, type ChannelAllocation } from "./lib/model";
import { loadPlans, savePlans } from "./lib/storage";

type View = "plan" | "compare";
type Toast = { kind: "ok" | "error"; text: string } | null;

const budgetDisplay = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const showBudget = (zl: number) => budgetDisplay.format(zl);

/** Fields that define a plan's content; timestamps and status don't count as edits. */
const fingerprint = (p: BudgetPlan) =>
  JSON.stringify([p.name, p.year, p.annualBudget, p.allocations]);

export default function App() {
  const [plans, setPlans] = useState<BudgetPlan[]>(loadPlans);
  const [plan, setPlan] = useState<BudgetPlan>(() => emptyPlan());
  const [view, setView] = useState<View>("plan");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [toast, setToast] = useState<Toast>(null);

  const result = useMemo(() => calculatePlan(plan.annualBudget, plan.allocations), [plan]);

  const saved = plans.find((p) => p.id === plan.id);
  const isDirty = saved ? fingerprint(saved) !== fingerprint(plan) : fingerprint(plan) !== fingerprint(emptyPlan());
  const canExport = result.sumState === "exact" && plan.annualBudget > 0;
  const exportBlockedReason =
    plan.annualBudget <= 0
      ? "Wpisz roczny budżet, aby wyeksportować plan."
      : result.sumState !== "exact"
        ? "Suma udziałów musi wynosić dokładnie 100%."
        : undefined;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const persist = useCallback((next: BudgetPlan[]) => {
    setPlans(next);
    if (!savePlans(next)) {
      setToast({ kind: "error", text: "Nie udało się zapisać w przeglądarce (tryb prywatny lub brak miejsca)." });
      return false;
    }
    return true;
  }, []);

  const confirmDiscard = () =>
    !isDirty || window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz je porzucić?");

  const updateAllocation = (index: number, patch: Partial<ChannelAllocation>) =>
    setPlan((p) => ({
      ...p,
      allocations: p.allocations.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));

  const handleSave = () => {
    const now = new Date().toISOString();
    const status = result.sumState === "exact" ? "final" : "draft";
    const next: BudgetPlan = { ...plan, name: plan.name.trim() || "Bez nazwy", status, updatedAt: now };
    const exists = plans.some((p) => p.id === next.id);
    const ok = persist(exists ? plans.map((p) => (p.id === next.id ? next : p)) : [...plans, next]);
    setPlan(next);
    if (ok) {
      setToast({
        kind: "ok",
        text: status === "final" ? "Zapisano plan jako gotowy." : "Zapisano plan jako szkic — suma udziałów ≠ 100%.",
      });
    }
  };

  const handleNew = (factory: () => BudgetPlan) => {
    if (!confirmDiscard()) return;
    setPlan(factory());
    setView("plan");
  };

  const handleOpen = (id: string) => {
    const p = plans.find((x) => x.id === id);
    if (!p || p.id === plan.id || !confirmDiscard()) return;
    setPlan(structuredClone(p));
    setView("plan");
  };

  const handleDuplicate = (id: string) => {
    const p = plans.find((x) => x.id === id);
    if (!p) return;
    const copy = { ...duplicatePlan(p), status: p.status };
    if (persist([...plans, copy])) setToast({ kind: "ok", text: `Utworzono kopię „${p.name}”.` });
  };

  const handleRename = (id: string, name: string) => {
    persist(plans.map((p) => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)));
    if (plan.id === id) setPlan((p) => ({ ...p, name }));
  };

  const handleDelete = (id: string) => {
    persist(plans.filter((p) => p.id !== id));
    setCompareIds((ids) => ids.filter((x) => x !== id));
  };

  const toggleCompare = (id: string) =>
    setCompareIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_COMPARE ? [...ids, id] : ids,
    );

  const exportCsv = () => {
    downloadText(`${safeFilename(plan.name)}.csv`, planToCsv(plan, result));
  };

  const comparePlans = compareIds
    .map((id) => plans.find((p) => p.id === id))
    .filter((p): p is BudgetPlan => Boolean(p));

  return (
    <div className="app">
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo" aria-hidden="true">N</span>
          <span>NinjaAI</span>
          <span className="brand-sub">planer budżetu marketingowego</span>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn ghost" onClick={() => handleNew(() => emptyPlan())}>
            Nowy plan
          </button>
          <button type="button" className="btn ghost" onClick={() => handleNew(() => examplePlan())}>
            Wczytaj przykład
          </button>
        </div>
      </header>

      <div className="layout">
        <main className="main">
          {view === "compare" ? (
            <Compare plans={comparePlans} onBack={() => setView("plan")} />
          ) : (
            <>
              <section className="card plan-head" aria-labelledby="plan-title">
                <h1 id="plan-title" className="sr-only">Plan budżetu</h1>
                <div className="plan-fields">
                  <div className="field grow">
                    <label htmlFor="plan-name" className="field-label">Nazwa planu</label>
                    <div className="field-box">
                      <input
                        id="plan-name"
                        value={plan.name}
                        maxLength={80}
                        onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <NumberField
                    className="field-year"
                    label="Rok"
                    value={plan.year}
                    min={2000}
                    max={2100}
                    display={(v) => String(v)}
                    rangeMessage="Podaj rok z zakresu 2000–2100."
                    onCommit={(v) => setPlan((p) => ({ ...p, year: Math.trunc(v) }))}
                  />
                  <NumberField
                    className="field-budget"
                    label="Roczny budżet"
                    value={plan.annualBudget / 100}
                    min={0}
                    max={1_000_000_000_000}
                    suffix="zł"
                    display={showBudget}
                    rangeMessage="Budżet musi być liczbą dodatnią."
                    onCommit={(v) => setPlan((p) => ({ ...p, annualBudget: zlToGrosze(v) }))}
                  />
                </div>
                <div className="plan-buttons no-print">
                  <button type="button" className="btn primary" onClick={handleSave}>
                    Zapisz{isDirty ? " *" : ""}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={exportCsv}
                    disabled={!canExport}
                    title={exportBlockedReason}
                  >
                    Eksport CSV
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => window.print()}
                    disabled={!canExport}
                    title={exportBlockedReason}
                  >
                    Eksport PDF
                  </button>
                </div>
              </section>

              <Kpis budget={plan.annualBudget} result={result} />

              <section className="card" aria-labelledby="alloc-title">
                <div className="section-head">
                  <h2 id="alloc-title">Podział na kanały</h2>
                  <div className="row-actions no-print">
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => setPlan((p) => ({ ...p, allocations: distributeRemainder(p.allocations) }))}
                      disabled={result.sumState !== "under"}
                    >
                      Rozdziel resztę równo
                    </button>
                    <button
                      type="button"
                      className="btn small"
                      onClick={() => setPlan((p) => ({ ...p, allocations: resetShares(p.allocations) }))}
                      disabled={result.allocatedHundredths === 0}
                    >
                      Wyzeruj podział
                    </button>
                  </div>
                </div>
                <SumBar result={result} />
                <AllocationTable
                  budget={plan.annualBudget}
                  allocations={plan.allocations}
                  result={result}
                  onChange={updateAllocation}
                />
                <p className="disclaimer">
                  Wartości szacunkowe na podstawie Twoich założeń — to prognoza, nie gwarancja wyniku.
                </p>
              </section>

              <Charts result={result} />

              <p className="print-only print-footer">
                {plan.name} · {plan.year} · budżet {formatMoney(plan.annualBudget)} · wygenerowano{" "}
                {new Date().toLocaleDateString("pl-PL")} w NinjaAI
              </p>
            </>
          )}
        </main>

        <aside className="sidebar no-print" aria-labelledby="plans-title">
          <div className="card">
            <h2 id="plans-title">Zapisane plany</h2>
            <PlanList
              plans={plans}
              currentId={plan.id}
              selected={compareIds}
              onOpen={handleOpen}
              onDuplicate={handleDuplicate}
              onRename={handleRename}
              onDelete={handleDelete}
              onToggleCompare={toggleCompare}
            />
            {plans.length > 0 && (
              <button
                type="button"
                className="btn wide"
                disabled={compareIds.length < 2}
                onClick={() => setView("compare")}
              >
                Porównaj zaznaczone ({compareIds.length}/{MAX_COMPARE})
              </button>
            )}
          </div>
        </aside>
      </div>

      {toast && (
        <div className={`toast toast-${toast.kind} no-print`} role={toast.kind === "error" ? "alert" : "status"}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
