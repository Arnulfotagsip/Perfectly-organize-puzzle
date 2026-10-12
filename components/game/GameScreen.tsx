"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { GameEvent, LevelDef, Objects, Vec } from "@/types/game";
import { LEVELS, difficultyOf, getLevel, levelNumber, nextLevel } from "@/data/levels";
import { createGame, gameReducer, restoreGame } from "@/lib/game/engine";
import { evaluate } from "@/lib/game/validation";
import { getHint, type Hint } from "@/lib/game/hints";
import { computeStars } from "@/lib/game/scoring";
import { isUnlocked, recordCompletion, type InProgress } from "@/lib/persistence/progress";
import { readSave, updateSave, useSave } from "@/lib/persistence/store";
import { playSound } from "@/lib/audio/sound";
import { Board } from "@/components/board/Board";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { prefersReducedMotion } from "@/components/ui/SettingsSync";
import { CompletionPanel } from "./CompletionPanel";

const LEVEL_IDS = LEVELS.map((l) => l.id);

type Result = { stars: 1 | 2 | 3; moves: number; best: number | null; unlocked: string | null };
const PRAISE = ["Perfect fit.", "Lovely.", "Nice and tidy.", "Just right.", "Snug as can be."];

export function GameScreen({ levelId }: { levelId: string }) {
  const save = useSave();
  const level = getLevel(levelId);
  if (!level) return null;
  if (!save) return <GameSkeleton level={level} />;
  if (!isUnlocked(save, LEVEL_IDS, levelId)) return <LockedLevel level={level} />;
  return <Game key={level.id} level={level} saved={save.inProgress[level.id]} />;
}

function GameSkeleton({ level }: { level: LevelDef }) {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-3 text-muted" aria-busy="true">
      <div className="size-10 animate-spin rounded-full border-4 border-line border-t-primary motion-reduce:animate-none" />
      <p className="font-bold">Setting out the {level.name.toLowerCase()}…</p>
    </main>
  );
}

function LockedLevel({ level }: { level: LevelDef }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-surface-2 text-muted">
        <Icon name="lock" size={30} />
      </div>
      <h1 className="text-2xl font-extrabold">{level.name} is still locked</h1>
      <p className="text-muted">Finish the previous level to open this one.</p>
      <ButtonLink href="/levels" variant="primary" icon="grid">
        Choose a level
      </ButtonLink>
    </main>
  );
}

function eventMessage(level: LevelDef, event: GameEvent | null, statusOf: (id: string) => ReturnType<typeof evaluate>["objects"][string]): string | null {
  if (!event) return null;
  const label = (id: string) => level.objects.find((o) => o.id === id)?.label ?? id;
  switch (event.type) {
    case "placed": {
      const st = statusOf(event.objectId);
      if (st.status === "issue") return st.message;
      const target = level.targets.find((t) => t.id === event.targetId)?.label;
      return `${PRAISE[event.nonce % PRAISE.length]} The ${label(event.objectId)} is in the ${target}.`;
    }
    case "rotated": {
      const st = statusOf(event.objectId);
      return st.status === "issue" ? st.message : `Turned the ${label(event.objectId)}.`;
    }
    case "rejected":
    case "rotate-blocked":
      return event.message;
    case "undo":
      return "Undid the last move.";
    case "reset":
      return "Back to the start. Take your time.";
    case "loose":
      return null;
  }
}

function Game({ level, saved }: { level: LevelDef; saved?: InProgress }) {
  const reducer = useMemo(() => gameReducer(level), [level]);
  const [state, dispatch] = useReducer(reducer, null, () => restoreGame(level, saved) ?? createGame(level));
  const evaluation = useMemo(() => evaluate(level, state.objects), [level, state.objects]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hint, setHint] = useState<{ hint: Hint; at: number } | null>(null);
  const [panelFor, setPanelFor] = useState<Objects | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const recordedFor = useRef<Objects | null>(null);
  const resultRef = useRef<Result | null>(null);

  const eventNonce = state.event?.nonce ?? 0;
  const activeHint = hint && hint.at === eventNonce ? hint.hint : null;
  const complete = evaluation.complete;
  const panelOpen = complete && panelFor === state.objects;

  // Sounds follow game events.
  const lastSound = useRef(eventNonce);
  useEffect(() => {
    const ev = state.event;
    if (!ev || ev.nonce === lastSound.current) return;
    lastSound.current = ev.nonce;
    if (ev.type === "placed") playSound(evaluation.objects[ev.objectId]?.status === "ok" ? "correct" : "snap");
    else if (ev.type === "rejected" || ev.type === "rotate-blocked") playSound("reject");
    else if (ev.type === "rotated") playSound("rotate");
    else if (ev.type === "loose") playSound("snap");
  }, [state.event, evaluation]);

  // Save the unfinished board so a refresh picks up where the player left off.
  useEffect(() => {
    if (complete) return;
    if (state.history.length === 0 && state.moves === 0) return;
    updateSave((s) => ({
      ...s,
      lastPlayed: level.id,
      inProgress: { ...s.inProgress, [level.id]: { objects: state.objects, moves: state.moves } },
    }));
  }, [complete, level.id, state.objects, state.moves, state.history.length]);

  // Completion is derived purely from the evaluated game state.
  useEffect(() => {
    if (!complete) return;
    if (recordedFor.current !== state.objects) {
      recordedFor.current = state.objects;
      const stars = computeStars(level, state.moves);
      const next = nextLevel(level.id);
      const wasUnlocked = next ? isUnlocked(readSave(), LEVEL_IDS, next.id) : true;
      updateSave((s) => recordCompletion(s, LEVEL_IDS, level.id, stars, state.moves));
      resultRef.current = {
        stars,
        moves: state.moves,
        best: readSave().levels[level.id]?.bestMoves ?? null,
        unlocked: next && !wasUnlocked ? next.id : null,
      };
      playSound("complete");
    }
    // Let the snap and celebration play before the results card slides in.
    const objects = state.objects;
    const timer = window.setTimeout(
      () => {
        setResult(resultRef.current);
        setPanelFor(objects);
      },
      prefersReducedMotion() ? 50 : 900,
    );
    return () => window.clearTimeout(timer);
  }, [complete, level, state.objects, state.moves]);

  // Ctrl/Cmd+Z undoes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "undo" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPickUp = useCallback(() => {
    setSelectedId(null);
    playSound("pickup");
  }, []);
  const onDrop = useCallback((id: string, center: Vec, pointer: Vec) => dispatch({ type: "drop", id, center, pointer }), []);
  const onSelect = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) playSound("tap");
  }, []);
  const onPlace = useCallback((id: string, targetId: string, point?: Vec) => {
    dispatch({ type: "place", id, targetId, point });
    setSelectedId(null);
  }, []);
  const onRotate = useCallback((id: string) => dispatch({ type: "rotate", id }), []);

  const showHint = () => {
    const h = getHint(level, state.objects, evaluation);
    if (h) {
      setHint({ hint: h, at: eventNonce });
      setSelectedId(null);
      playSound("tap");
    }
  };

  const requestReset = () => {
    setMenuOpen(false);
    if (state.moves >= 3) setConfirmReset(true);
    else dispatch({ type: "reset" });
  };

  const replay = () => {
    dispatch({ type: "restart" });
    setSelectedId(null);
    setHint(null);
    setPanelFor(null);
  };

  const selectedDef = selectedId ? level.objects.find((o) => o.id === selectedId) : undefined;
  const canRotate = !!selectedDef && selectedDef.rotatable !== false;
  const message =
    activeHint?.message ??
    eventMessage(level, state.event, (id) => evaluation.objects[id]) ??
    (selectedDef
      ? `Selected the ${selectedDef.label}. Drag it, or tap a highlighted spot to place it.`
      : "Drag each item to where it belongs. Tap an item to select it.");
  const tone =
    activeHint ? "hint" : state.event?.type === "rejected" || state.event?.type === "rotate-blocked" ? "warn" : state.event?.type === "placed" && evaluation.objects[state.event.objectId]?.status === "ok" ? "ok" : "info";
  const pct = Math.round((evaluation.done / evaluation.total) * 100);
  const num = levelNumber(level.id);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-6xl flex-col">
      <header className="flex items-center gap-2 px-3 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] sm:px-5">
        <Button variant="ghost" size="icon" icon="menu" aria-label="Pause menu" onClick={() => setMenuOpen(true)} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Level {num} · {difficultyOf(num)}
          </p>
          <h1 className="truncate text-lg font-extrabold leading-tight sm:text-xl">{level.name}</h1>
        </div>
        <div className="flex flex-col items-end gap-1" aria-label={`${evaluation.done} of ${evaluation.total} items in place`} role="status">
          <span className="text-sm font-extrabold tabular-nums">
            {evaluation.done}/{evaluation.total}
            <span className="ml-1 font-bold text-muted">tidy</span>
          </span>
          <span className="block h-2 w-24 overflow-hidden rounded-full bg-surface-2 sm:w-32" aria-hidden>
            <span className="block h-full rounded-full bg-success transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-5 lg:flex-row">
        <section className="relative flex min-h-0 flex-1 items-center justify-center rounded-[28px] bg-board-frame p-1.5 sm:p-2.5" aria-label="Puzzle board">
          <Board
            level={level}
            objects={state.objects}
            evaluation={evaluation}
            interactive={!panelOpen}
            selectedId={selectedId}
            hint={activeHint}
            event={state.event}
            celebrate={complete}
            label={`${level.name} board. ${evaluation.done} of ${evaluation.total} items tidy.`}
            className="h-full max-h-full w-full max-w-full rounded-[22px]"
            onPickUp={onPickUp}
            onDrop={onDrop}
            onSelect={onSelect}
            onPlace={onPlace}
            onRotate={onRotate}
          />
          {panelOpen && result && (
            <CompletionPanel
              level={level}
              stars={result.stars}
              moves={result.moves}
              best={result.best}
              unlocked={result.unlocked ? getLevel(result.unlocked) ?? null : null}
              next={nextLevel(level.id) ?? null}
              onReplay={replay}
            />
          )}
        </section>

        <aside className="flex shrink-0 flex-col gap-3 lg:w-80">
          <p
            role="status"
            aria-live="polite"
            className={`flex min-h-12 items-start gap-2 rounded-2xl px-4 py-3 text-sm font-semibold leading-snug sm:text-base ${
              tone === "warn" ? "bg-warn-soft" : tone === "ok" ? "bg-success-soft" : tone === "hint" ? "bg-[#fdf1cf] text-[#5c4a1f]" : "bg-surface"
            }`}
          >
            <Icon
              name={tone === "warn" ? "info" : tone === "ok" ? "check" : tone === "hint" ? "hint" : "sparkle"}
              size={20}
              className={`mt-0.5 shrink-0 ${tone === "warn" ? "text-warn" : tone === "ok" ? "text-success" : tone === "hint" ? "text-[#c28a12]" : "text-primary"}`}
            />
            <span>{message}</span>
          </p>

          <Instructions level={level} rules={evaluation.rules} />

          <div className="grid grid-cols-4 gap-2" role="toolbar" aria-label="Game controls">
            <ControlButton icon="undo" label="Undo" onClick={() => dispatch({ type: "undo" })} disabled={state.history.length === 0 || panelOpen} />
            <ControlButton icon="rotate" label="Rotate" onClick={() => selectedId && dispatch({ type: "rotate", id: selectedId })} disabled={!canRotate || panelOpen} />
            <ControlButton icon="hint" label="Hint" onClick={showHint} disabled={complete} />
            <ControlButton icon="reset" label="Reset" onClick={requestReset} disabled={state.history.length === 0 || panelOpen} />
          </div>
          <p className="hidden text-xs leading-relaxed text-muted lg:block">
            Keyboard: Tab to an item, Enter to select, Tab to a highlighted spot and Enter to place. R rotates, arrows nudge, Ctrl+Z undoes.
          </p>
        </aside>
      </div>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} title="Paused" labelledBy="pause-title">
        <div className="flex flex-col gap-2">
          <Button variant="primary" icon="play" onClick={() => setMenuOpen(false)}>
            Resume
          </Button>
          <Button icon="reset" onClick={requestReset} disabled={state.history.length === 0}>
            Restart level
          </Button>
          <ButtonLink href="/levels" icon="grid">
            Level select
          </ButtonLink>
          <ButtonLink href="/settings" icon="settings">
            Settings
          </ButtonLink>
          <ButtonLink href="/" icon="home" variant="ghost">
            Home
          </ButtonLink>
        </div>
      </Dialog>

      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Start this level over?" labelledBy="reset-title">
        <p className="text-muted">Everything goes back to where it started. You can still undo the reset afterwards.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Keep going
          </Button>
          <Button
            variant="primary"
            icon="reset"
            onClick={() => {
              setConfirmReset(false);
              setSelectedId(null);
              dispatch({ type: "reset" });
            }}
          >
            Reset
          </Button>
        </div>
      </Dialog>
    </main>
  );
}

function ControlButton({ icon, label, onClick, disabled }: { icon: "undo" | "rotate" | "hint" | "reset"; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl border border-line bg-surface text-xs font-bold shadow-soft transition active:scale-95 disabled:opacity-40 enabled:hover:bg-surface-2"
    >
      <Icon name={icon} size={22} />
      {label}
    </button>
  );
}

function Instructions({ level, rules }: { level: LevelDef; rules: ReturnType<typeof evaluate>["rules"] }) {
  const body = (
    <>
      <ul className="flex flex-col gap-1.5 text-sm leading-snug">
        {level.instructions.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lavender" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
      {rules.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3 text-sm font-bold">
          {rules.map(({ rule, ok }) => (
            <li key={rule.label} className={`flex items-center gap-2 ${ok ? "text-success" : "text-muted"}`}>
              <Icon name={ok ? "check" : "info"} size={16} />
              {rule.label}
              <span className="sr-only">{ok ? "(done)" : "(not yet)"}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
  return (
    <>
      <details className="rounded-2xl bg-surface px-4 py-2 lg:hidden">
        <summary className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-extrabold">
          <Icon name="info" size={18} className="text-primary" />
          How to tidy this one
        </summary>
        <div className="pb-2 pt-1">{body}</div>
      </details>
      <div className="hidden rounded-2xl bg-surface p-4 lg:block">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wider text-muted">Goal</h2>
        {body}
      </div>
    </>
  );
}
