"use client";

import { memo, useMemo } from "react";
import type { LevelDef } from "@/types/game";
import { createGame } from "@/lib/game/engine";
import { solveLevel } from "@/lib/game/solver";
import { Board } from "@/components/board/Board";

/** Non-interactive preview: the messy start, or the tidy result once solved. */
export const LevelThumb = memo(function LevelThumb({ level, solved, className = "" }: { level: LevelDef; solved: boolean; className?: string }) {
  const objects = useMemo(() => (solved ? solveLevel(level) : createGame(level)).objects, [level, solved]);
  return (
    <Board
      level={level}
      objects={objects}
      label={`${level.name} ${solved ? "organized" : "before tidying"}`}
      className={`block h-auto w-full ${className}`}
    />
  );
});
