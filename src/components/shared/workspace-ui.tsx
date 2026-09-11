import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "@/styles/workspace.module.css";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
export function SectionLabel({
  children,
  gold = false,
  center = false,
}: {
  children: ReactNode;
  gold?: boolean;
  /** 居中变体：文字两侧各一段短横线，替代默认的右侧长线 */
  center?: boolean;
}) {
  return (
    <h2
      className={cn(styles.sectionLabel, gold && styles.gold, center && styles.sectionLabelCenter)}
    >
      {children}
    </h2>
  );
}
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.empty}>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
