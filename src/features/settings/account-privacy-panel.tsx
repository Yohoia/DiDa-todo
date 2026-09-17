"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/features/preferences/preferences-provider";
import shared from "@/styles/workspace.module.css";
import styles from "./settings.module.css";

export function AccountPrivacyPanel({ email }: { email: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (pending || confirmEmail.trim().toLowerCase() !== email.toLowerCase()) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail: confirmEmail.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(
          payload.error === "not_configured"
            ? t("account.deleteNotConfigured")
            : t("account.deleteFailed"),
        );
        return;
      }
      await createClient().auth.signOut();
      router.replace("/");
    } catch {
      setError(t("account.deleteFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.privacyPanel}>
      <section aria-labelledby="account-export-title">
        <h3 id="account-export-title">{t("account.exportTitle")}</h3>
        <p>{t("account.exportDescription")}</p>
        <a className={shared.button} href="/api/account/export" download>
          {t("account.exportButton")}
        </a>
      </section>
      <section aria-labelledby="account-delete-title">
        <h3 id="account-delete-title">{t("account.deleteTitle")}</h3>
        <p>{t("account.deleteDescription")}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void deleteAccount();
          }}
        >
          <label htmlFor="delete-account-email">{t("account.deleteConfirmEmail")}</label>
          <input
            id="delete-account-email"
            type="email"
            autoComplete="off"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            disabled={pending}
          />
          <button
            type="submit"
            className={styles.deleteButton}
            disabled={pending || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
          >
            {pending ? t("organize.saving") : t("account.deleteButton")}
          </button>
          {error && <p role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}
