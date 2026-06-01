import type { InputHTMLAttributes, ReactNode } from "react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type BrandedCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  children?: ReactNode;
  className?: string;
  inputClassName?: string;
  boxClassName?: string;
  contentClassName?: string;
};

export function BrandedCheckbox({
  children,
  className,
  inputClassName,
  boxClassName,
  contentClassName,
  disabled,
  ...inputProps
}: BrandedCheckboxProps) {
  const cursorClass = disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer";
  const inputCursorClass = disabled ? "cursor-not-allowed" : "cursor-pointer";

  return (
    <label
      className={classes(
        "group flex items-start gap-3 font-editorial-sans text-sm",
        cursorClass,
        className,
      )}
    >
      <span className={classes("relative mt-0.5 flex h-5 w-5 shrink-0", boxClassName)}>
        <input
          {...inputProps}
          type="checkbox"
          disabled={disabled}
          className={classes(
            "peer absolute inset-0 h-5 w-5 appearance-none opacity-0",
            inputCursorClass,
            inputClassName,
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none flex h-5 w-5 items-center justify-center border border-[var(--ink)] bg-[var(--white)] transition-colors after:h-2 after:w-3 after:-translate-y-0.5 after:rotate-[-45deg] after:border-b-2 after:border-l-2 after:border-[var(--paper)] after:opacity-0 peer-checked:bg-[var(--ink)] peer-checked:after:opacity-100 peer-disabled:bg-[var(--paper)] peer-disabled:opacity-70 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ink)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--paper)]"
        />
      </span>
      {children ? (
        <span className={classes("min-w-0", contentClassName)}>
          {children}
        </span>
      ) : null}
    </label>
  );
}
