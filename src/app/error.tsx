"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useI18n } from "@/features/preferences/preferences-provider";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
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
        className="h-[200px] w-auto"
        style={{ marginBottom: "1.25rem" }}
      />
      <h1
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.75rem",
          fontWeight: 700,
          marginBottom: "0.75rem",
          color: "var(--foreground)",
        }}
      >
        {t("errors.title")}
      </h1>
      <p
        style={{
          color: "var(--muted-foreground)",
          marginBottom: "2rem",
          maxWidth: "26rem",
        }}
      >
        {t("errors.description")}
      </p>
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
    </div>
  );
}
