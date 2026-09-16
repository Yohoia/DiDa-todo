"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { HiCheck, HiChevronDown } from "react-icons/hi2";

import { cn } from "@/lib/utils";

import styles from "./select.module.css";

export type SelectOption<T extends string> = {
  value: T;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

type SelectProps<T extends string> = {
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  placeholder?: ReactNode;
  className?: string;
  disabled?: boolean;
  align?: "start" | "center" | "end";
  /** 提供后触发器只显示图标（选项列表仍显示文字），配合 ariaLabel 说明用途 */
  icon?: ReactNode;
};

export function Select<T extends string>({
  value,
  options,
  onValueChange,
  ariaLabel,
  placeholder,
  className,
  disabled = false,
  align = "start",
  icon,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const listboxId = useId();
  const selectedRef = useRef<HTMLButtonElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  // 值不在选项中时如实显示原值，而不是静默回退第一项（避免显示与状态不一致）。
  const selected = options.find((option) => option.value === value);

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'),
    );
    if (!items.length) return;
    const index = Math.max(0, items.indexOf(document.activeElement as HTMLButtonElement));
    let nextIndex: number | undefined;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % items.length;
    if (event.key === "ArrowUp") nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(styles.trigger, icon && styles.iconTrigger, className)}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={disabled}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          {icon ?? <span className={styles.value}>{selected?.label ?? placeholder ?? value}</span>}
          {!icon && <HiChevronDown className={styles.chevron} size={14} aria-hidden="true" />}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={styles.content}
          align={align}
          sideOffset={7}
          collisionPadding={12}
          onKeyDown={moveFocus}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (selectedRef.current ?? firstRef.current)?.focus();
          }}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <Popover.Close asChild key={option.value}>
                <button
                  ref={
                    isSelected
                      ? selectedRef
                      : selected === undefined && index === 0
                        ? firstRef
                        : undefined
                  }
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  tabIndex={isSelected ? 0 : -1}
                  className={styles.option}
                  onClick={() => onValueChange(option.value)}
                  onPointerMove={(event) => event.currentTarget.focus()}
                >
                  <span className={styles.optionCopy}>
                    <span>{option.label}</span>
                    {option.description && (
                      <small className={styles.description}>{option.description}</small>
                    )}
                  </span>
                  <HiCheck
                    className={styles.check}
                    data-visible={isSelected || undefined}
                    size={14}
                    aria-hidden="true"
                  />
                </button>
              </Popover.Close>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
