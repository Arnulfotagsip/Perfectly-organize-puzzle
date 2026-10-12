import { describe, expect, it } from "vitest";
import { currentLevelId, defaultSave, hasProgress, isUnlocked, parseSave, recordCompletion } from "./progress";

const ids = ["a", "b", "c"];

describe("save parsing", () => {
  it.each([null, "", "not json", "[]", "42", '{"version":2}', '{"version":1,"levels":"x","settings":7}'])(
    "falls back safely for %j",
    (raw) => {
      const s = parseSave(raw);
      expect(s.version).toBe(1);
      expect(s.settings).toEqual(defaultSave().settings);
      expect(s.levels).toEqual({});
    },
  );

  it("drops invalid fields but keeps valid ones", () => {
    const s = parseSave(
      JSON.stringify({
        version: 1,
        levels: { a: { completed: true, stars: 3, bestMoves: 9 }, b: { completed: "yes", stars: 9 }, c: 5 },
        settings: { sound: false, theme: "neon", motion: "reduced" },
      }),
    );
    expect(s.levels.a).toEqual({ completed: true, stars: 3, bestMoves: 9 });
    expect(s.levels.b).toEqual({ completed: false, stars: 0, bestMoves: null });
    expect(s.levels.c).toBeUndefined();
    expect(s.settings).toEqual({ sound: false, theme: "cream", motion: "reduced" });
  });
});

describe("progression", () => {
  it("unlocks sequentially", () => {
    let s = defaultSave();
    expect(isUnlocked(s, ids, "a")).toBe(true);
    expect(isUnlocked(s, ids, "b")).toBe(false);
    expect(currentLevelId(s, ids)).toBe("a");
    expect(hasProgress(s)).toBe(false);

    s = recordCompletion(s, ids, "a", 2, 14);
    expect(isUnlocked(s, ids, "b")).toBe(true);
    expect(isUnlocked(s, ids, "c")).toBe(false);
    expect(s.newlyUnlocked).toBe("b");
    expect(currentLevelId(s, ids)).toBe("b");
    expect(hasProgress(s)).toBe(true);
  });

  it("keeps the best result on replay", () => {
    let s = recordCompletion(defaultSave(), ids, "a", 3, 10);
    s = { ...s, newlyUnlocked: null };
    s = recordCompletion(s, ids, "a", 1, 30);
    expect(s.levels.a).toEqual({ completed: true, stars: 3, bestMoves: 10 });
    // Replaying an already-complete level doesn't re-trigger the unlock animation.
    expect(s.newlyUnlocked).toBeNull();
  });

  it("clears the unfinished board on completion", () => {
    const s = recordCompletion({ ...defaultSave(), inProgress: { a: { objects: {}, moves: 3 } } }, ids, "a", 3, 3);
    expect(s.inProgress.a).toBeUndefined();
  });
});
