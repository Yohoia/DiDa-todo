import Image from "next/image";
import Link from "next/link";

import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

export async function Brand({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = await getI18n();
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-3 no-underline", className)}
      aria-label={t("DiDa-todo 首页")}
    >
      <Image
        src="/logo-mark.png"
        alt=""
        width={480}
        height={345}
        priority
        className={compact ? "h-8 w-auto" : "h-11 w-auto"}
      />
      <Image
        src="/wordmark-dark.png"
        alt=""
        width={480}
        height={94}
        priority
        className={cn(compact ? "h-5 w-auto" : "h-7 w-auto", "brand-wordmark brand-wordmark-dark")}
      />
      <Image
        src="/wordmark-light.png"
        alt=""
        width={480}
        height={101}
        priority
        className={cn(compact ? "h-5 w-auto" : "h-7 w-auto", "brand-wordmark brand-wordmark-light")}
      />
    </Link>
  );
}
