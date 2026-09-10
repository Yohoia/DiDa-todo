import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function Brand({ className }: { className?: string }) {
  const { t } = await getI18n();
  return (
    <a
      href="#home"
      className={cn("inline-flex items-center gap-3", className)}
      aria-label={t("DiDa-todo 首页")}
    >
      <span aria-hidden="true" className="size-4 rotate-45 border-2 border-[var(--brand-gold)]" />
      DiDa-todo
    </a>
  );
}
