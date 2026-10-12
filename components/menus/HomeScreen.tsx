"use client";

import { LEVELS, getLevel, levelNumber } from "@/data/levels";
import { currentLevelId, hasProgress } from "@/lib/persistence/progress";
import { useSave } from "@/lib/persistence/store";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { LevelThumb } from "./LevelThumb";

const IDS = LEVELS.map((l) => l.id);

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "sparkle", title: "Pick it up", text: "Drag any item — or tap it, then tap where it goes." },
  { icon: "check", title: "Snap it in", text: "Items click into place when they're right. No timers, no pressure." },
  { icon: "rotate", title: "Turn & sort", text: "Rotate, line up and group things until it all feels just right." },
];

export function HomeScreen() {
  const save = useSave();
  const resume = save && hasProgress(save) ? getLevel(currentLevelId(save, IDS)) : undefined;
  const allDone = !!save && LEVELS.every((l) => save.levels[l.id]?.completed);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pb-10 pt-[max(env(safe-area-inset-top),1.5rem)] sm:px-8">
      <nav className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-base">
          <LogoMark size={36} />
          <Wordmark className="hidden sm:inline" />
        </span>
        <ButtonLink href="/settings" variant="ghost" size="icon" aria-label="Settings">
          <Icon name="settings" />
        </ButtonLink>
      </nav>

      <section className="mt-8 grid items-center gap-10 lg:mt-14 lg:grid-cols-[1.05fr_1fr]">
        <div className="rise-in">
          <LogoMark size={76} />
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            <Wordmark />
          </h1>
          <p className="mt-3 text-lg font-bold text-muted sm:text-xl">Arrange. Organize. Feel Good.</p>
          <p className="mt-4 max-w-md leading-relaxed text-muted">
            A cozy puzzle about turning clutter into calm. Put pencils in their cup, line books up on the shelf, and fit every
            little thing into the drawer — one satisfying snap at a time.
          </p>

          <div className="mt-7 flex min-h-14 flex-wrap gap-3" aria-busy={!save}>
            {save &&
              (resume && !allDone ? (
                <ButtonLink href={`/play/${resume.id}`} variant="primary" size="lg" icon="play">
                  Continue · Level {levelNumber(resume.id)}
                </ButtonLink>
              ) : (
                <ButtonLink href={`/play/${IDS[0]}`} variant="primary" size="lg" icon="play">
                  {allDone ? "Play again" : "Play"}
                </ButtonLink>
              ))}
            <ButtonLink href="/levels" size="lg" icon="grid">
              Levels
            </ButtonLink>
          </div>
        </div>

        <div className="rise-in relative mx-auto w-full max-w-md [animation-delay:120ms]">
          <div className="absolute -inset-4 -z-10 rotate-2 rounded-[40px] bg-lavender/30" aria-hidden />
          <div className="absolute -inset-4 -z-10 -rotate-2 rounded-[40px] bg-mint/30" aria-hidden />
          <div className="overflow-hidden rounded-[32px] border border-line bg-board-frame p-2 shadow-soft">
            <LevelThumb level={LEVELS[0]} solved={false} className="rounded-[24px]" />
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mt-14">
        <h2 id="how-title" className="text-sm font-extrabold uppercase tracking-wider text-muted">
          How to play
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-3xl border border-line bg-surface p-4 shadow-soft">
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-2xl ${["bg-lavender/40", "bg-mint/50", "bg-peach/50"][i]}`}
                aria-hidden
              >
                <Icon name={s.icon} />
              </span>
              <span>
                <span className="block font-extrabold">{s.title}</span>
                <span className="block text-sm leading-snug text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
