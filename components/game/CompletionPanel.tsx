"use client";

import { useEffect, useRef, useState } from "react";
import type { LevelDef } from "@/types/game";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Stars } from "@/components/ui/Stars";

const CHEERS: Record<1 | 2 | 3, string> = {
  3: "Every item has its place. Beautifully done.",
  2: "All tidy! A few detours along the way — that's half the fun.",
  1: "All tidy! Try again any time for a smoother run.",
};

export function CompletionPanel({
  level,
  stars,
  moves,
  best,
  unlocked,
  next,
  onReplay,
}: {
  level: LevelDef;
  stars: 1 | 2 | 3;
  moves: number;
  best: number | null;
  unlocked: LevelDef | null;
  next: LevelDef | null;
  onReplay: () => void;
}) {
  const [minimized, setMinimized] = useState(false);
  const primaryRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, []);

  if (minimized) {
    return (
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <Button variant="primary" icon="sparkle" onClick={() => setMinimized(false)} className="fade-in">
          Show results
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-end justify-center rounded-[28px] bg-gradient-to-t from-[rgb(40_32_28/0.35)] via-transparent to-transparent p-3 sm:items-center sm:bg-[rgb(40_32_28/0.18)]">
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="complete-title"
        className="rise-in w-full max-w-sm rounded-3xl border border-line bg-surface p-5 text-center shadow-soft sm:p-6"
      >
        <p className="text-xs font-extrabold uppercase tracking-wider text-success">{level.name} complete</p>
        <h2 id="complete-title" className="mt-1 text-2xl font-extrabold sm:text-3xl">
          Perfectly organized!
        </h2>
        <div className="my-3 flex justify-center">
          <Stars count={stars} size={44} animate />
        </div>
        <p className="text-sm text-muted">{CHEERS[stars]}</p>
        <p className="mt-2 text-sm font-bold tabular-nums">
          {moves} moves{best !== null && best < moves ? ` · best ${best}` : ""} · minimum {level.objects.length}
        </p>

        {unlocked && (
          <p className="unlock-pop mx-auto mt-3 inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-extrabold text-ink">
            <Icon name="sparkle" size={16} className="text-primary" />
            New level unlocked: {unlocked.name}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {next ? (
            <ButtonLink ref={primaryRef} href={`/play/${next.id}`} variant="primary" size="lg" icon="next">
              Next level
            </ButtonLink>
          ) : (
            <ButtonLink ref={primaryRef} href="/levels" variant="primary" size="lg" icon="sparkle">
              Everything&apos;s organized!
            </ButtonLink>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button icon="reset" onClick={onReplay}>
              Replay
            </Button>
            <ButtonLink href="/levels" icon="grid">
              Levels
            </ButtonLink>
          </div>
          <Button variant="ghost" onClick={() => setMinimized(true)} className="text-sm">
            Admire the tidy {level.environment}
          </Button>
        </div>
      </section>
    </div>
  );
}
