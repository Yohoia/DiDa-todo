"use client";

import Image from "next/image";
import { useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/features/preferences/preferences-provider";

export default function WorkspaceError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("Workspace error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Image
        src="/app-error-illustration.png"
        alt=""
        width={448}
        height={560}
        priority
        className="h-[160px] w-auto"
        style={{ marginBottom: "1rem" }}
      />
      <h2
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
          color: "var(--foreground)",
        }}
      >
        {t("errors.workspaceTitle")}
      </h2>
      <p
        style={{
          color: "var(--muted-foreground)",
          marginBottom: "2rem",
          maxWidth: "26rem",
        }}
      >
        {t("errors.description")}
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={retry}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--brand-gold)",
            color: "var(--on-gold)",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          {t("errors.retry")}
        </button>
        <Link
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--secondary)",
            color: "var(--secondary-foreground)",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontSize: "1rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          {t("errors.backHome")}
        </Link>
      </div>
    </div>
  );
}
