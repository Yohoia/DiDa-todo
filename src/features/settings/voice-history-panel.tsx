"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { HiOutlineTrash } from "react-icons/hi2";

import { Select } from "@/components/ui/select";
import { useI18n } from "@/features/preferences/preferences-provider";
import { createClient } from "@/lib/supabase/client";
import styles from "./settings.module.css";

type VoiceCaptureRow = {
  id: string;
  transcript: string;
  taskCount: number;
  durationSeconds: number | null;
  createdAt: string;
};

type HotwordRow = { id: string; word: string; weight: number };

export function VoiceHistoryPanel({ userId }: { userId: string }) {
  const { t, date } = useI18n();
  const [captures, setCaptures] = useState<VoiceCaptureRow[] | null>(null);
  const [hotwords, setHotwords] = useState<HotwordRow[] | null>(null);
  const [word, setWord] = useState("");
  const [weight, setWeight] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const client = createClient();
    const [captureResult, hotwordResult] = await Promise.all([
      client
        .from("voice_captures")
        .select("id,transcript,task_count,duration_seconds,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("voice_hotwords")
        .select("id,word,weight")
        .order("word", { ascending: true })
        .limit(50),
    ]);
    if (captureResult.error || hotwordResult.error) {
      setError("voice.historyLoadFailed");
      return;
    }
    setError(null);
    setCaptures(
      (captureResult.data ?? []).map((row) => ({
        id: row.id,
        transcript: row.transcript,
        taskCount: row.task_count,
        durationSeconds: row.duration_seconds,
        createdAt: row.created_at,
      })),
    );
    setHotwords(hotwordResult.data ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function mutate(action: () => PromiseLike<{ error: { message: string } | null }>) {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { error: mutationError } = await action();
      if (mutationError) setError("voice.historyLoadFailed");
      else await load();
    } finally {
      setPending(false);
    }
  }

  async function addHotword(event: FormEvent) {
    event.preventDefault();
    const value = word.trim();
    if (!value || pending) return;
    await mutate(() =>
      createClient()
        .from("voice_hotwords")
        .upsert(
          { user_id: userId, word: value.slice(0, 20), weight: Number(weight) },
          { onConflict: "user_id,word" },
        ),
    );
    setWord("");
  }

  return (
    <div className={styles.voicePrivacyPanel}>
      <section aria-labelledby="voice-history-title">
        <h3 id="voice-history-title">{t("voice.historyTitle")}</h3>
        <p>{t("voice.historyDescription")}</p>
        {error && (
          <p role="alert">
            {t(error as "voice.historyLoadFailed")}
            <button type="button" className={styles.inlineAction} onClick={() => void load()}>
              {t("voice.retry")}
            </button>
          </p>
        )}
        {captures === null ? (
          <p>{t("voice.loading")}</p>
        ) : captures.length === 0 ? (
          <p>{t("voice.emptyHistory")}</p>
        ) : (
          <ul>
            {captures.map((capture) => (
              <li key={capture.id}>
                <span>{capture.transcript}</span>
                <small>
                  {date(capture.createdAt, { month: "numeric", day: "numeric" })} ·{" "}
                  {t("voice.taskCount", { count: capture.taskCount })}
                  {capture.durationSeconds === null
                    ? ""
                    : ` · ${t("insights.focusMinutes", { count: Math.max(1, Math.round(capture.durationSeconds / 60)) })}`}
                </small>
                <button
                  type="button"
                  aria-label={t("voice.deleteOne")}
                  disabled={pending}
                  onClick={() =>
                    void mutate(() =>
                      createClient().from("voice_captures").delete().eq("id", capture.id),
                    )
                  }
                >
                  <HiOutlineTrash size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className={styles.clearVoiceButton}
          disabled={pending || !captures?.length}
          onClick={() =>
            void mutate(() =>
              createClient()
                .from("voice_captures")
                .delete()
                .gt("created_at", "1970-01-01T00:00:00Z"),
            )
          }
        >
          {t("voice.clearHistory")}
        </button>
      </section>
      <section aria-labelledby="voice-hotwords-title">
        <h3 id="voice-hotwords-title">{t("voice.hotwordsTitle")}</h3>
        <p>{t("voice.hotwordsDescription")}</p>
        <form onSubmit={(event) => void addHotword(event)}>
          <label htmlFor="voice-hotword">{t("voice.hotwordLabel")}</label>
          <input
            id="voice-hotword"
            value={word}
            maxLength={20}
            disabled={pending}
            onChange={(event) => setWord(event.target.value)}
          />
          <Select
            ariaLabel={t("voice.hotwordWeight")}
            value={weight}
            onValueChange={setWeight}
            options={[1, 2, 3, 4, 5].map((value) => ({
              value: String(value),
              label: String(value),
            }))}
          />
          <button type="submit" disabled={pending || !word.trim()}>
            {t("Add")}
          </button>
        </form>
        {hotwords?.length ? (
          <ul className={styles.hotwords}>
            {hotwords.map((hotword) => (
              <li key={hotword.id}>
                <span>{hotword.word}</span>
                <small>{hotword.weight}</small>
                <button
                  type="button"
                  aria-label={t("voice.deleteHotword", { word: hotword.word })}
                  disabled={pending}
                  onClick={() =>
                    void mutate(() =>
                      createClient().from("voice_hotwords").delete().eq("id", hotword.id),
                    )
                  }
                >
                  <HiOutlineTrash size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
