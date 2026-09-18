"use client";

import styles from "@/styles/workspace.module.css";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={styles.pageTransition}>
      {children}
    </div>
  );
}
