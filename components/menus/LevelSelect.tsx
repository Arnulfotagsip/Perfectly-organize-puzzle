"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LEVELS, difficultyOf, type Difficulty } from "@/data/levels";
import { currentLevelId, isUnlocked } from "@/lib/persistence/progress";
import { updateSave, useSave } from "@/lib/persistence/store";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { prefersReducedMotion } from "@/components/ui/SettingsSync";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";
import { LevelThumb } from "./LevelThumb";

const IDS = LEVELS.map((l) => l.id);
const CHAPTER_SIZE = 20;
const CHAPTERS = Array.from({ length: Math.ceil(LEVELS.length / CHAPTER_SIZE) }, (_, i) => i);
const DIFF_STYLE: Record<Difficulty, string> = {
  Tutorial: "bg-sky/40",
  Easy: "bg-mint/50",
  Medium: "bg-butter/60",
  Hard: "bg-peach/60",
  Expert: "bg-lavender/60",
};

const ENV_TINT: Record<string, string> = {
  desk: "bg-lavender/35",
  bookshelf: "bg-peach/40",
  drawer: "bg-mint/40",
  pantry: "bg-butter/40",
};

export function LevelSelect() {
  const save = useSave();
  const fresh = save?.newlyUnlocked ?? null;

  // The unlock animation plays once; afterwards the level is just "unlocked".
  useEffect(() => {
    if (!fresh) return;
    const t = window.setTimeout(() => updateSave((s) => ({ ...s, newlyUnlocked: null })), 1200);
    return () => window.clearTimeout(t);
  }, [fresh]);

  const current = save ? currentLevelId(save, IDS) : null;
  const [picked, setPicked] = useState<number | null>(null);
  const chapter = picked ?? (current ? Math.floor(IDS.indexOf(current) / CHAPTER_SIZE) : 0);
  const goTo = (c: number) => {
    setPicked(c);
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };
  const shown = LEVELS.slice(chapter * CHAPTER_SIZE, (chapter + 1) * CHAPTER_SIZE);
  const doneCount = save ? LEVELS.filter((l) => save.levels[l.id]?.completed).length : 0;
  const starCount = save ? LEVELS.reduce((n, l) => n + (save.levels[l.id]?.stars ?? 0), 0) : 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-12 pt-[max(env(safe-area-inset-top),1.25rem)] sm:px-8">
      <nav className="flex items-center gap-2">
        <ButtonLink href="/" variant="ghost" size="icon" aria-label="Home">
          <Icon name="back" />
        </ButtonLink>
        <h1 className="flex-1 text-2xl font-extrabold sm:text-3xl">Levels</h1>
        <ButtonLink href="/settings" variant="ghost" size="icon" aria-label="Settings">
          <Icon name="settings" />
        </ButtonLink>
      </nav>
      <p className="mt-1 pl-14 text-sm font-bold text-muted" aria-live="polite">
        {save ? `${doneCount} of ${LEVELS.length} spaces organized · ${starCount} of ${LEVELS.length * 3} stars` : " "}
      </p>

      <div role="tablist" aria-label="Chapters" className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {CHAPTERS.map((c) => {
          const from = c * CHAPTER_SIZE + 1;
          const to = Math.min(LEVELS.length, (c + 1) * CHAPTER_SIZE);
          const done = save ? LEVELS.slice(from - 1, to).filter((l) => save.levels[l.id]?.completed).length : 0;
          return (
            <button
              key={c}
              role="tab"
              aria-selected={chapter === c}
              onClick={() => setPicked(c)}
              className={`flex min-h-12 shrink-0 flex-col items-center justify-center rounded-2xl border px-4 text-sm font-extrabold transition ${chapter === c ? "border-primary bg-primary text-primary-ink" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              {from}–{to}
              <span className={`text-[11px] font-bold ${chapter === c ? "opacity-80" : "text-muted"}`}>
                {done}/{to - from + 1} done
              </span>
            </button>
          );
        })}
      </div>

      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel">
        {shown.map((level, k) => {
          const i = chapter * CHAPTER_SIZE + k;
          const diff = difficultyOf(i + 1);
          const p = save?.levels[level.id];
          const unlocked = !!save && isUnlocked(save, IDS, level.id);
          const isCurrent = current === level.id && !p?.completed;
          const inProgress = !!save?.inProgress[level.id];
          const card = (
            <>
              <div className={`relative overflow-hidden rounded-2xl p-1.5 ${ENV_TINT[level.environment]}`}>
                <LevelThumb level={level} solved={!!p?.completed} className={`rounded-xl ${unlocked ? "" : "opacity-45 grayscale"}`} />
                {!unlocked && save && (
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-14 place-items-center rounded-2xl bg-surface/90 text-muted shadow-soft">
                      <Icon name="lock" size={26} />
                    </span>
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start justify-between gap-2 px-1">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-muted">
                    Level {i + 1}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] text-ink ${DIFF_STYLE[diff]}`}>{diff}</span>
                  </p>
                  <h2 className="truncate text-lg font-extrabold">{level.name}</h2>
                  <p className="text-sm leading-snug text-muted">{level.summary}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                  {p?.completed ? (
                    <>
                      <Stars count={p.stars} size={18} />
                      <span className="text-xs font-bold text-success">Organized</span>
                    </>
                  ) : isCurrent ? (
                    <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-extrabold text-primary-ink">{inProgress ? "In progress" : "Up next"}</span>
                  ) : !unlocked && save ? (
                    <span className="text-xs font-bold text-muted">Locked</span>
                  ) : null}
                </div>
              </div>
            </>
          );
          const base = "block h-full rounded-3xl border bg-surface p-3 shadow-soft transition";
          return (
            <li key={level.id} className={`[content-visibility:auto] [contain-intrinsic-size:auto_360px] ${fresh === level.id ? "unlock-pop rounded-3xl" : ""}`}>
              {unlocked ? (
                <Link
                  href={`/play/${level.id}`}
                  aria-label={`Level ${i + 1} (${diff}): ${level.name}${p?.completed ? `, organized, ${p.stars} stars` : isCurrent ? ", current level" : ""}`}
                  className={`${base} hover:-translate-y-0.5 active:scale-[0.99] ${isCurrent ? "border-primary ring-2 ring-primary/40" : "border-line"}`}
                >
                  {card}
                </Link>
              ) : (
                <div aria-label={`Level ${i + 1} (${diff}): ${level.name}, locked`} aria-disabled="true" className={`${base} border-line opacity-90`}>
                  {card}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Chapter navigation at the bottom too, so nobody has to scroll back up to find more levels. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {chapter > 0 && (
          <button type="button" onClick={() => goTo(chapter - 1)} className={buttonClass("soft", "lg")}>
            <Icon name="back" />
            Levels {(chapter - 1) * CHAPTER_SIZE + 1}–{chapter * CHAPTER_SIZE}
          </button>
        )}
        {chapter < CHAPTERS.length - 1 && (
          <button type="button" onClick={() => goTo(chapter + 1)} className={buttonClass("primary", "lg")}>
            Next: Levels {(chapter + 1) * CHAPTER_SIZE + 1}–{Math.min(LEVELS.length, (chapter + 2) * CHAPTER_SIZE)}
            <Icon name="next" />
          </button>
        )}
      </div>
    </main>
  );
}
