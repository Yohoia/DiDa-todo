"use client";
import { useState } from "react";
import { Select } from "@/components/ui/select";
import { useI18n } from "@/features/preferences/preferences-provider";
import shared from "@/styles/workspace.module.css";

export function RepeatTaskPicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [custom, setCustom] = useState(false);
  const [days, setDays] = useState(String(value ?? 2));
  const choice =
    custom || (value !== undefined && value !== 1 && value !== 7) ? "custom" : String(value ?? 0);
  return (
    <div className="grid gap-2">
      <Select
        disabled={disabled}
        ariaLabel={t("repeat.label")}
        value={choice}
        onValueChange={(next) => {
          if (next === "custom") {
            setCustom(true);
            setDays(String(value ?? 2));
          } else {
            setCustom(false);
            onChange(next === "0" ? undefined : Number(next));
          }
        }}
        options={[
          { value: "0", label: t("repeat.never") },
          { value: "1", label: t("repeat.daily") },
          { value: "7", label: t("repeat.weekly") },
          { value: "custom", label: t("repeat.custom") },
        ]}
      />
      {choice === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            disabled={disabled}
            min={1}
            max={365}
            value={days}
            aria-label={t("repeat.days")}
            className="w-24 rounded-sm border border-input bg-card p-2 text-foreground"
            onChange={(event) => setDays(event.target.value)}
          />
          <button
            type="button"
            className={shared.button}
            disabled={
              disabled || !Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 365
            }
            onClick={() => {
              onChange(Number(days));
              setCustom(false);
            }}
          >
            {t("repeat.confirm")}
          </button>
        </div>
      )}
      {disabled && <p className={shared.muted}>{t("repeat.migrationNeeded")}</p>}
    </div>
  );
}
