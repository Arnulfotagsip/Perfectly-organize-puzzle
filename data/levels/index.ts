import type { LevelDef } from "@/types/game";
import { bookshelfLevel } from "./bookshelf";
import { deskLevel } from "./desk";
import { drawerLevel } from "./drawer";
import { generateLevels } from "./generated";
import { libraryLevel } from "./library";
import { pantryLevel } from "./pantry";

export const LEVEL_COUNT = 100;

/** Hand-made tutorial levels first, then generated levels that ramp up in difficulty. */
const HANDMADE: LevelDef[] = [deskLevel, bookshelfLevel, drawerLevel, pantryLevel, libraryLevel];

/** Play order. Add a hand-made level by writing a LevelDef and adding it to HANDMADE. */
export const LEVELS: LevelDef[] = [...HANDMADE, ...generateLevels(HANDMADE.length + 1, LEVEL_COUNT)];

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function levelNumber(id: string): number {
  return LEVELS.findIndex((l) => l.id === id) + 1;
}

export function nextLevel(id: string): LevelDef | undefined {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 ? LEVELS[i + 1] : undefined;
}

export type Difficulty = "Tutorial" | "Easy" | "Medium" | "Hard" | "Expert";

export function difficultyOf(n: number): Difficulty {
  if (n <= HANDMADE.length) return "Tutorial";
  if (n <= 25) return "Easy";
  if (n <= 50) return "Medium";
  if (n <= 75) return "Hard";
  return "Expert";
}
