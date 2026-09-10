import Image from "next/image";
import Link from "next/link";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
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
        src="/not-found-illustration.png"
        alt=""
        width={560}
        height={511}
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
        {t("errors.notFoundTitle")}
      </h1>
      <p
        style={{
          color: "var(--muted-foreground)",
          marginBottom: "2rem",
          maxWidth: "26rem",
        }}
      >
        {t("errors.notFoundDescription")}
      </p>
      <Link
        href="/"
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "var(--brand-gold)",
          color: "var(--on-gold)",
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
  );
}
