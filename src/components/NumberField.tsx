import { useEffect, useId, useRef, useState } from "react";
import { parseDecimal, toInputString } from "../lib/format";

interface Props {
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
  label: string;
  /** Hide the label visually (still read by screen readers). */
  hideLabel?: boolean;
  suffix?: string;
  disabled?: boolean;
  /** How to show the value when the field isn't focused. */
  display?: (value: number) => string;
  rangeMessage?: string;
  className?: string;
}

/**
 * Text input for Polish-formatted decimals. Only valid values are committed;
 * while the text is invalid an inline message explains why, and on blur the
 * field reverts to the last valid value.
 */
export function NumberField({
  value,
  onCommit,
  min,
  max,
  label,
  hideLabel,
  suffix,
  disabled,
  display = toInputString,
  rangeMessage,
  className,
}: Props) {
  const id = useId();
  const focused = useRef(false);
  const [text, setText] = useState(() => display(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!focused.current) {
      setText(display(value));
      setError(null);
    }
  }, [value, display]);

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw.trim() === "") {
      setError(null);
      onCommit(Math.max(0, min));
      return;
    }
    const parsed = parseDecimal(raw);
    if (parsed === null) {
      setError("Wpisz liczbę (maks. 2 miejsca po przecinku).");
      return;
    }
    if (parsed < min || parsed > max) {
      setError(rangeMessage ?? `Dozwolony zakres: ${min} – ${max}.`);
      return;
    }
    setError(null);
    onCommit(parsed);
  };

  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "field-label"}>
        {label}
      </label>
      <div className={`field-box${error ? " has-error" : ""}${disabled ? " is-disabled" : ""}`}>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          onFocus={(e) => {
            focused.current = true;
            e.target.select();
          }}
          onBlur={() => {
            focused.current = false;
            setError(null);
            setText(display(value));
          }}
          onChange={(e) => handleChange(e.target.value)}
        />
        {suffix && <span className="field-suffix" aria-hidden="true">{suffix}</span>}
      </div>
      {error && (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
