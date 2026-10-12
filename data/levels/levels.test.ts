import { describe, expect, it } from "vitest";
import type { LevelDef } from "@/types/game";
import { straighten } from "@/lib/game/geometry";
import { LEVELS, LEVEL_COUNT, difficultyOf } from "./index";
import { generateLevel } from "./generated";

/** Objects whose start orientation isn't one the target accepts (so the player must rotate them). */
function needsTurning(level: LevelDef): number {
  return level.objects.filter((o) => {
    const t = level.targets.find((x) => x.id === level.solution[o.id])!;
    if (t.layout === "grid") return straighten(o.start.rotation) === 0 && o.h > o.w * 2; // long items lie sideways
    return !!t.allowedRotations && !t.autoOrient && !t.allowedRotations.includes(straighten(o.start.rotation));
  }).length;
}

const avg = (ls: LevelDef[], f: (l: LevelDef) => number) => ls.reduce((s, l) => s + f(l), 0) / ls.length;

describe("level catalogue", () => {
  it("has 100 uniquely identified levels", () => {
    expect(LEVELS).toHaveLength(LEVEL_COUNT);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVEL_COUNT);
  });

  it("generation is deterministic", () => {
    expect(generateLevel(42, 6, 100)).toEqual(generateLevel(42, 6, 100));
  });

  it("gets harder: more objects, more rotation, tighter stars", () => {
    const early = LEVELS.slice(5, 25);
    const late = LEVELS.slice(80, 100);
    expect(avg(late, (l) => l.objects.length)).toBeGreaterThan(avg(early, (l) => l.objects.length) + 2);
    expect(avg(late, needsTurning)).toBeGreaterThan(avg(early, needsTurning));
    expect(avg(late, (l) => (l.scoring?.threeStarExtra ?? 99) / l.objects.length)).toBeLessThan(
      avg(early, (l) => (l.scoring?.threeStarExtra ?? 99) / l.objects.length),
    );
  });

  it("labels difficulty bands in order", () => {
    expect([1, 6, 30, 60, 100].map(difficultyOf)).toEqual(["Tutorial", "Easy", "Medium", "Hard", "Expert"]);
  });
});
