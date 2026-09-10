"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        工作台加载失败
      </h2>
      <p style={{ color: "#666", marginBottom: "2rem" }}>
        {error.message || "工作台遇到了一个错误，请重试。"}
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#b88e57",
            color: "white",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          重试
        </button>
        <Link
          href="/"
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#f3eee6",
            color: "#1c1917",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
            fontSize: "1rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
