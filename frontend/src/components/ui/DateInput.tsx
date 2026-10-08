import { forwardRef, useRef, type InputHTMLAttributes } from "react";
import { CalendarDays } from "lucide-react";
import { formatDateDMY } from "@/lib/format";

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({ className = "", onClick, onFocus, ...props }, forwardedRef) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const openPicker = () => {
    const input = inputRef.current;
    if (!input || input.disabled || input.readOnly) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      // Some browsers only allow showPicker during a direct user gesture.
    }
  };

  // The native control's text follows the browser locale, so it's hidden and the value is shown as dd/mm/yy instead.
  const shown = typeof props.value === "string" && props.value ? formatDateDMY(props.value) : "";

  return (
    <span className={`date-input ${className}`.trim()} onClick={openPicker}>
      <span className={`date-input__display ${shown ? "" : "date-input__display--empty"}`.trim()} aria-hidden="true">{shown || "dd/mm/yy"}</span>
      <input
        {...props}
        ref={setRefs}
        type="date"
        onClick={(event) => {
          onClick?.(event);
          openPicker();
        }}
        onFocus={(event) => {
          onFocus?.(event);
        }}
      />
      <CalendarDays className="date-input__icon" size={18} aria-hidden="true" />
    </span>
  );
});

DateInput.displayName = "DateInput";
