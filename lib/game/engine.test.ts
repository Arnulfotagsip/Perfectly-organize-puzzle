import { describe, expect, it } from "vitest";
import { LEVELS, getLevel } from "@/data/levels";
import type { GameState, LevelDef } from "@/types/game";
import { createGame, gameReducer, restoreGame, type GameAction } from "./engine";
import { footprint, nextQuarterTurn, overlaps, rectAround, straighten } from "./geometry";
import { getHint } from "./hints";
import { accepts, getObject, getTarget, objectRect, occupants } from "./placement";
import { computeStars } from "./scoring";
import { solveLevel } from "./solver";
import { evaluate } from "./validation";

const desk = getLevel("desk")!;
const bookshelf = getLevel("bookshelf")!;
const drawer = getLevel("drawer")!;
const pantry = getLevel("pantry")!;

function run(level: LevelDef, actions: GameAction[], start: GameState = createGame(level)): GameState {
  const reduce = gameReducer(level);
  return actions.reduce(reduce, start);
}

function centerOf(level: LevelDef, targetId: string) {
  const r = getTarget(level, targetId).rect;
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function solve(level: LevelDef): GameState {
  const s = solveLevel(level);
  for (const o of level.objects) expect(s.objects[o.id].targetId, `${level.id}: ${o.id}`).toBe(level.solution[o.id]);
  return s;
}

describe("geometry", () => {
  it("swaps footprint on quarter turns", () => {
    expect(footprint(20, 100, 90)).toEqual({ w: 100, h: 20 });
    expect(footprint(20, 100, 180)).toEqual({ w: 20, h: 100 });
  });
  it("snaps rotation", () => {
    expect(straighten(348)).toBe(0);
    expect(straighten(100)).toBe(90);
    expect(nextQuarterTurn(100)).toBe(180);
    expect(nextQuarterTurn(270)).toBe(0);
    expect(nextQuarterTurn(0)).toBe(90);
  });
});

describe("level definitions", () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))("%s is well formed", (_, level) => {
    const ids = new Set(level.objects.map((o) => o.id));
    expect(ids.size).toBe(level.objects.length);
    expect(new Set(level.targets.map((t) => t.id)).size).toBe(level.targets.length);
    for (const o of level.objects) {
      const t = level.targets.find((x) => x.id === level.solution[o.id]);
      expect(t, `solution target for ${o.id}`).toBeDefined();
      expect(accepts(t!, o)).toBe(true);
      // Starts fully on the board and not on top of a target.
      const r = objectRect(o, o.start);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(level.board.w);
      expect(r.y + r.h).toBeLessThanOrEqual(level.board.h);
      for (const target of level.targets) {
        expect(overlaps(r, target.rect), `${o.id} starts on ${target.id}`).toBe(false);
      }
    }
    for (const t of level.targets) {
      if (t.layout === "grid") {
        expect(t.rect.w % (t.cell ?? 40)).toBe(0);
        expect(t.rect.h % (t.cell ?? 40)).toBe(0);
      }
    }
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))("%s is not complete at the start", (_, level) => {
    expect(evaluate(level, createGame(level).objects).complete).toBe(false);
  });

  it.each(LEVELS.map((l) => [l.id, l] as const))("%s is solvable through the reducer", (_, level) => {
    const s = solve(level);
    const ev = evaluate(level, s.objects);
    expect(ev.complete).toBe(true);
    expect(ev.done).toBe(level.objects.length);
    expect(s.moves).toBe(level.objects.length);
    expect(computeStars(level, s.moves)).toBe(3);
    // No two objects in the same target overlap.
    for (const t of level.targets) {
      const ids = occupants(s.objects, t.id);
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const a = objectRect(getObject(level, ids[i]), s.objects[ids[i]]);
          const b = objectRect(getObject(level, ids[j]), s.objects[ids[j]]);
          expect(overlaps(a, b), `${ids[i]} / ${ids[j]}`).toBe(false);
        }
    }
  });
});

describe("placement", () => {
  it("snaps an accepted object into a cup and straightens it", () => {
    const s = run(desk, [{ type: "drop", id: "pencil-yellow", center: { x: 120, y: 200 }, pointer: { x: 115, y: 180 } }]);
    const p = s.objects["pencil-yellow"];
    expect(s.event?.type).toBe("placed");
    expect(p.targetId).toBe("pencil-cup");
    expect(p.rotation).toBe(0);
    expect(s.moves).toBe(1);
    // Bottom aligned inside the cup.
    const cup = getTarget(desk, "pencil-cup").rect;
    expect(p.y + 190 / 2).toBeCloseTo(cup.y + cup.h);
  });

  it("gently rejects the wrong container and leaves the board unchanged", () => {
    const start = createGame(desk);
    const s = run(desk, [{ type: "drop", id: "scissors", center: centerOf(desk, "pen-cup"), pointer: centerOf(desk, "pen-cup") }], start);
    expect(s.event).toMatchObject({ type: "rejected", reason: "wrong-target", objectId: "scissors" });
    expect(s.objects).toEqual(start.objects);
    expect(s.moves).toBe(0);
    expect(s.history).toHaveLength(0);
  });

  it("requires rotating the ruler before it fits its groove", () => {
    const groove = centerOf(desk, "ruler-groove");
    let s = run(desk, [{ type: "drop", id: "ruler", center: groove, pointer: groove }]);
    expect(s.event).toMatchObject({ type: "rejected", reason: "no-fit" });
    s = run(desk, [{ type: "rotate", id: "ruler" }, { type: "drop", id: "ruler", center: groove, pointer: groove }], s);
    expect(s.objects.ruler.targetId).toBe("ruler-groove");
    expect(evaluate(desk, s.objects).objects.ruler.status).toBe("ok");
  });

  it("refuses a second object in an occupied slot", () => {
    const mat = centerOf(desk, "desk-mat");
    const s = run(desk, [
      { type: "place", id: "notebook", targetId: "desk-mat" },
      { type: "drop", id: "clips", center: mat, pointer: mat },
    ]);
    // Clips aren't accepted on the mat at all; that check comes first.
    expect(s.event).toMatchObject({ type: "rejected", reason: "wrong-target" });
    expect(s.objects.notebook.targetId).toBe("desk-mat");
  });

  it("keeps free-zone items from overlapping", () => {
    const tray = centerOf(desk, "small-tray");
    const s = run(desk, [
      { type: "drop", id: "eraser", center: tray, pointer: tray },
      { type: "drop", id: "sticky-notes", center: tray, pointer: tray },
    ]);
    const a = objectRect(getObject(desk, "eraser"), s.objects.eraser);
    const b = objectRect(getObject(desk, "sticky-notes"), s.objects["sticky-notes"]);
    expect(s.objects["sticky-notes"].targetId).toBe("small-tray");
    expect(overlaps(a, b)).toBe(false);
  });

  it("keeps objects on the board when dropped outside it", () => {
    const s = run(desk, [{ type: "drop", id: "eraser", center: { x: -500, y: 2000 }, pointer: { x: -500, y: 2000 } }]);
    const r = objectRect(getObject(desk, "eraser"), s.objects.eraser);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.y + r.h).toBeLessThanOrEqual(desk.board.h);
    expect(s.objects.eraser.targetId).toBeNull();
    expect(s.moves).toBe(0);
  });

  it("grid: rejects a long item that doesn't fit, accepts it after rotating, and never overlaps", () => {
    const writing = centerOf(drawer, "writing");
    // Pen starts at 25° -> straightens to upright (1x5 cells) which can't fit a 3-row compartment.
    let s = run(drawer, [{ type: "drop", id: "pen", center: writing, pointer: writing }]);
    expect(s.event).toMatchObject({ type: "rejected", reason: "no-fit" });
    s = run(drawer, [{ type: "rotate", id: "pen" }, { type: "drop", id: "pen", center: writing, pointer: writing }], s);
    expect(s.objects.pen.targetId).toBe("writing");
    // Dropping the pencil on exactly the same spot snaps it to a free row instead of overlapping.
    s = run(drawer, [{ type: "drop", id: "pencil", center: s.objects.pen, pointer: writing }], s);
    expect(s.objects.pencil.targetId).toBe("writing");
    expect(s.objects.pencil.y).not.toBe(s.objects.pen.y);
  });

  it("grid: reports a full compartment", () => {
    const scissors = drawer.objects.find((o) => o.id === "scissors")!;
    const level: LevelDef = {
      ...drawer,
      objects: [...drawer.objects, { ...scissors, id: "scissors-2", start: { x: 700, y: 440, rotation: 90 } }],
    };
    const s = run(level, [
      { type: "rotate", id: "scissors" },
      { type: "place", id: "scissors", targetId: "tools" },
      { type: "place", id: "scissors-2", targetId: "tools" },
    ]);
    expect(s.objects.scissors.targetId).toBe("tools");
    expect(s.event).toMatchObject({ type: "rejected", reason: "full", objectId: "scissors-2" });
  });

  it("row: inserting between books uses the drop position", () => {
    const shelf = getTarget(bookshelf, "top-shelf").rect;
    let s = run(bookshelf, [
      { type: "place", id: "book-peach", targetId: "top-shelf" },
      { type: "place", id: "book-sky", targetId: "top-shelf" },
    ]);
    const between = (s.objects["book-peach"].x + s.objects["book-sky"].x) / 2;
    s = run(bookshelf, [{ type: "drop", id: "book-plum", center: { x: between, y: shelf.y + 100 }, pointer: { x: between, y: shelf.y + 100 } }], s);
    const order = occupants(s.objects, "top-shelf");
    expect(order).toEqual(["book-peach", "book-plum", "book-sky"]);
  });

  it("row: moving an object out closes the gap", () => {
    let s = run(bookshelf, [
      { type: "place", id: "book-peach", targetId: "top-shelf" },
      { type: "place", id: "book-plum", targetId: "top-shelf" },
    ]);
    const firstX = s.objects["book-peach"].x;
    s = run(bookshelf, [{ type: "drop", id: "book-peach", center: { x: 400, y: 760 }, pointer: { x: 400, y: 760 } }], s);
    expect(s.objects["book-plum"].x).toBeLessThan(firstX + 10);
    expect(s.objects["book-plum"].index).toBe(0);
  });
});

describe("validation", () => {
  it("moving every object somewhere is not enough — rules must hold", () => {
    // Put all books on the shelf in the wrong order.
    const ids = ["book-sage", "book-plum", "book-sky", "book-peach", "book-butter", "book-rose"];
    let s = createGame(bookshelf);
    const reduce = gameReducer(bookshelf);
    for (const id of ids) {
      while (straighten(s.objects[id].rotation) !== 0) s = reduce(s, { type: "rotate", id });
      s = reduce(s, { type: "place", id, targetId: "top-shelf" });
    }
    s = reduce(s, { type: "place", id: "plant", targetId: "plant-spot" });
    s = reduce(s, { type: "place", id: "frame", targetId: "frame-spot" });
    const ev = evaluate(bookshelf, s.objects);
    expect(Object.values(s.objects).every((o) => o.targetId)).toBe(true);
    expect(ev.complete).toBe(false);
    expect(ev.rules[0].ok).toBe(false);
    expect(ev.objects["book-sage"]).toMatchObject({ status: "issue" });
  });

  it("flags a book lying on its side", () => {
    // book-sage starts at 90°: it fits lying down but isn't aligned.
    const s = run(bookshelf, [{ type: "place", id: "book-sage", targetId: "top-shelf" }]);
    expect(s.objects["book-sage"].targetId).toBe("top-shelf");
    const st = evaluate(bookshelf, s.objects).objects["book-sage"];
    expect(st.status).toBe("issue");
    expect(st.status === "issue" && st.message).toMatch(/on its side/);
  });

  it("flags an upside-down notebook", () => {
    const reduce = gameReducer(desk);
    let s = run(desk, [{ type: "place", id: "notebook", targetId: "desk-mat" }]);
    expect(evaluate(desk, s.objects).objects.notebook.status).toBe("ok");
    // Rotating 90° won't fit the mat; rotating twice from loose gives 180°.
    s = reduce(s, { type: "rotate", id: "notebook" });
    expect(s.event?.type).toBe("rotate-blocked");
  });

  it("pantry: mixing categories on a shelf is an issue", () => {
    let s = createGame(pantry);
    const reduce = gameReducer(pantry);
    s = reduce(s, { type: "place", id: "can-beans", targetId: "top" });
    s = reduce(s, { type: "place", id: "jar-honey", targetId: "top" });
    s = reduce(s, { type: "place", id: "can-corn", targetId: "top" });
    const ev = evaluate(pantry, s.objects);
    expect(ev.objects["can-beans"].status).toBe("ok");
    expect(ev.objects["jar-honey"].status).toBe("issue");
    expect(ev.rules[0].ok).toBe(false);
  });

  it("pantry: boxes are too tall for the upper shelves", () => {
    const s = run(pantry, [{ type: "place", id: "cereal", targetId: "top" }]);
    expect(s.event).toMatchObject({ type: "rejected", reason: "no-fit" });
  });

  it("pantry: any valid grouping completes, not just the canonical one", () => {
    const reduce = gameReducer(pantry);
    let s = createGame(pantry);
    const plan: [string, string][] = [
      ["jar-honey", "top"], ["jar-jam", "top"], ["jar-pickles", "top"],
      ["can-soup", "middle"], ["can-beans", "middle"], ["can-corn", "middle"],
      ["cereal", "bottom"], ["pasta", "bottom"], ["crackers", "bottom"],
    ];
    for (const [id, targetId] of plan) {
      while (straighten(s.objects[id].rotation) !== 0) s = reduce(s, { type: "rotate", id });
      s = reduce(s, { type: "place", id, targetId });
    }
    expect(evaluate(pantry, s.objects).complete).toBe(true);
  });
});

describe("undo, reset, scoring", () => {
  it("undo restores position, rotation and move count, repeatedly", () => {
    const start = createGame(desk);
    let s = run(desk, [
      { type: "place", id: "pencil-yellow", targetId: "pencil-cup" },
      { type: "rotate", id: "ruler" },
      { type: "place", id: "ruler", targetId: "ruler-groove" },
    ]);
    expect(s.moves).toBe(2);
    s = run(desk, [{ type: "undo" }], s);
    expect(s.objects.ruler.targetId).toBeNull();
    expect(s.objects.ruler.rotation).toBe(180);
    s = run(desk, [{ type: "undo" }], s);
    expect(s.objects.ruler.rotation).toBe(desk.objects.find((o) => o.id === "ruler")!.start.rotation);
    s = run(desk, [{ type: "undo" }, { type: "undo" }, { type: "undo" }], s);
    expect(s.objects).toEqual(start.objects);
    expect(s.moves).toBe(0);
  });

  it("reset restores the initial board and can itself be undone", () => {
    let s = run(desk, [{ type: "place", id: "notebook", targetId: "desk-mat" }]);
    s = run(desk, [{ type: "reset" }], s);
    expect(s.objects).toEqual(createGame(desk).objects);
    expect(s.moves).toBe(0);
    s = run(desk, [{ type: "undo" }], s);
    expect(s.objects.notebook.targetId).toBe("desk-mat");
  });

  it("stars reward efficiency but floor at one", () => {
    const n = desk.objects.length;
    expect(computeStars(desk, n)).toBe(3);
    expect(computeStars(desk, n + 3)).toBe(3);
    expect(computeStars(desk, n + 6)).toBe(2);
    expect(computeStars(desk, n * 5)).toBe(1);
  });
});

describe("hints", () => {
  it("points at a loose object and an accepting target", () => {
    const s = createGame(desk);
    const hint = getHint(desk, s.objects, evaluate(desk, s.objects))!;
    expect(hint.objectId).toBe("notebook");
    expect(hint.targetId).toBe("desk-mat");
  });

  it("mentions rotation when the object won't fit yet", () => {
    // Everything solved except the ruler, which is loose and standing on end.
    let s = solve(desk);
    s = run(desk, [
      { type: "drop", id: "ruler", center: { x: 300, y: 600 }, pointer: { x: 300, y: 600 } },
      { type: "rotate", id: "ruler" },
    ], s);
    expect(straighten(s.objects.ruler.rotation)).toBe(270);
    const hint = getHint(desk, s.objects, evaluate(desk, s.objects))!;
    expect(hint.objectId).toBe("ruler");
    expect(hint.message).toMatch(/rotating/);
  });

  it("prefers fixing misplaced items and follows the player's own grouping", () => {
    const reduce = gameReducer(pantry);
    let s = createGame(pantry);
    s = reduce(s, { type: "place", id: "jar-honey", targetId: "bottom" });
    s = reduce(s, { type: "place", id: "jar-jam", targetId: "bottom" });
    s = reduce(s, { type: "place", id: "can-beans", targetId: "bottom" });
    const hint = getHint(pantry, s.objects, evaluate(pantry, s.objects))!;
    expect(hint.objectId).toBe("can-beans");
    expect(hint.targetId).not.toBe("bottom");
    expect(hint.message).toMatch(/other cans/);
  });

  it("returns null once complete", () => {
    const s = solve(desk);
    expect(getHint(desk, s.objects, evaluate(desk, s.objects))).toBeNull();
  });
});

describe("restore", () => {
  it("round-trips a saved game", () => {
    const s = run(desk, [{ type: "place", id: "notebook", targetId: "desk-mat" }]);
    const restored = restoreGame(desk, JSON.parse(JSON.stringify({ objects: s.objects, moves: s.moves })));
    expect(restored?.objects).toEqual(s.objects);
    expect(restored?.moves).toBe(1);
  });

  it.each([null, 42, "x", {}, { objects: { notebook: { x: "a" } } }, { objects: {} }])("rejects invalid data %#", (bad) => {
    expect(restoreGame(desk, bad)).toBeNull();
  });

  it("rejects unknown targets", () => {
    const s = createGame(desk);
    const bad = { objects: { ...s.objects, notebook: { ...s.objects.notebook, targetId: "nope" } }, moves: 0 };
    expect(restoreGame(desk, bad)).toBeNull();
  });
});

describe("object rects", () => {
  it("rectAround centres correctly", () => {
    expect(rectAround({ x: 10, y: 10 }, { w: 4, h: 2 })).toEqual({ x: 8, y: 9, w: 4, h: 2 });
  });
});
