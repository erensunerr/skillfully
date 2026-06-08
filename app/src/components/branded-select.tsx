"use client";

import Select, {
  components,
  type DropdownIndicatorProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type BrandedSelectOption = {
  value: string;
  label: string;
};

type BrandedSelectSize = "regular" | "compact";

type BrandedSelectProps = {
  ariaLabel: string;
  value: string;
  options: BrandedSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  size?: BrandedSelectSize;
};

const sizeConfig = {
  regular: {
    minHeight: 52,
    valuePadding: "0 0 0 1rem",
    indicatorPadding: "0 1rem",
    fontSize: 15,
  },
  compact: {
    minHeight: 42,
    valuePadding: "0 0 0 0.75rem",
    indicatorPadding: "0 0.75rem",
    fontSize: 14,
  },
} satisfies Record<BrandedSelectSize, {
  minHeight: number;
  valuePadding: string;
  indicatorPadding: string;
  fontSize: number;
}>;

export function DropdownChevron({
  open = false,
  className,
}: {
  open?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-dropdown-chevron={open ? "open" : "closed"}
      className={classes(
        "flex h-5 w-5 shrink-0 items-center justify-center transition-transform",
        open && "rotate-180",
        className,
      )}
    >
      <span className="block h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-[var(--ink)]" />
    </span>
  );
}

function BrandedDropdownIndicator(props: DropdownIndicatorProps<BrandedSelectOption, false>) {
  return (
    <components.DropdownIndicator {...props}>
      <DropdownChevron open={Boolean(props.selectProps.menuIsOpen)} />
    </components.DropdownIndicator>
  );
}

function stylesForSize(size: BrandedSelectSize): StylesConfig<BrandedSelectOption, false> {
  const config = sizeConfig[size];

  return {
    control: (base, state) => ({
      ...base,
      minHeight: config.minHeight,
      borderRadius: 0,
      borderColor: "var(--ink)",
      borderWidth: 1,
      boxShadow: state.isFocused ? "0 0 0 2px var(--ink)" : "none",
      backgroundColor: state.isDisabled ? "var(--paper)" : "var(--white)",
      color: "var(--ink)",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      fontFamily: "var(--font-space-grotesk), Space Grotesk, sans-serif",
      fontSize: config.fontSize,
      fontWeight: 600,
      opacity: state.isDisabled ? 0.65 : 1,
      ":hover": {
        borderColor: "var(--ink)",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      minHeight: config.minHeight,
      padding: config.valuePadding,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      minHeight: config.minHeight,
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      alignItems: "center",
      color: "var(--ink)",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      display: "flex",
      minHeight: config.minHeight,
      padding: config.indicatorPadding,
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 80,
      borderRadius: 0,
      border: "1px solid var(--ink)",
      backgroundColor: "var(--white)",
      boxShadow: "6px 6px 0 var(--ink)",
      overflow: "hidden",
    }),
    menuList: (base) => ({
      ...base,
      padding: "0.35rem",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused || state.isSelected ? "var(--paper)" : "var(--white)",
      color: "var(--ink)",
      cursor: state.isDisabled ? "not-allowed" : "pointer",
      fontFamily: "var(--font-space-grotesk), Space Grotesk, sans-serif",
      fontSize: config.fontSize,
      fontWeight: state.isSelected ? 700 : 500,
      padding: size === "compact" ? "0.55rem 0.75rem" : "0.75rem 0.9rem",
    }),
    singleValue: (base, state) => ({
      ...base,
      color: "var(--ink)",
      opacity: state.isDisabled ? 0.85 : 1,
    }),
    input: (base) => ({
      ...base,
      color: "var(--ink)",
      margin: 0,
      padding: 0,
    }),
  };
}

export function BrandedSelect({
  ariaLabel,
  value,
  options,
  onChange,
  className,
  disabled = false,
  size = "regular",
}: BrandedSelectProps) {
  const selected = options.find((option) => option.value === value) ?? options[0] ?? null;

  return (
    <div
      aria-disabled={disabled ? "true" : undefined}
      className={classes("min-w-0", className)}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <Select<BrandedSelectOption, false>
        aria-label={ariaLabel}
        className="font-editorial-sans"
        components={{ DropdownIndicator: BrandedDropdownIndicator }}
        instanceId={ariaLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
        isDisabled={disabled}
        isSearchable={false}
        options={options}
        styles={stylesForSize(size)}
        value={selected}
        onChange={(nextValue: SingleValue<BrandedSelectOption>) => {
          if (nextValue) {
            onChange(nextValue.value);
          }
        }}
      />
    </div>
  );
}
