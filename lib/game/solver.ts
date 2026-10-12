import type { GameState, LevelDef, Vec } from "@/types/game";
import { createGame, gameReducer } from "./engine";
import { footprint, straighten } from "./geometry";
import { getObject, getTarget } from "./placement";
import { sortKey } from "./validation";

/**
 * Plays a level's canonical solution through the public reducer, exactly as a player could:
 * rotate where needed, then place each object (ordered rows in sorted order; grids largest-first,
 * packed from the top-left).
 */
export function solveLevel(level: LevelDef): GameState {
  const reduce = gameReducer(level);
  let s = createGame(level);
  const byTarget = new Map<string, string[]>();
  for (const o of level.objects) {
    const t = level.solution[o.id];
    byTarget.set(t, [...(byTarget.get(t) ?? []), o.id]);
  }
  const turnTo = (id: string, rot: number) => {
    for (let i = 0; i < 4 && straighten(s.objects[id].rotation) !== rot; i++) s = reduce(s, { type: "rotate", id });
  };

  for (const [targetId, ids] of byTarget) {
    const target = getTarget(level, targetId);
    const order = level.rules.find((r) => r.type === "order" && r.targetId === targetId);
    if (order?.type === "order") {
      const key = (id: string) => sortKey(getObject(level, id), order.by);
      ids.sort((a, b) => (order.direction === "asc" ? key(a) - key(b) : key(b) - key(a)));
    }

    if (target.layout === "grid") {
      const area = (id: string) => getObject(level, id).w * getObject(level, id).h;
      ids.sort((a, b) => area(b) - area(a));
      const cell = target.cell ?? 40;
      const { rect } = target;
      for (const id of ids) {
        const def = getObject(level, id);
        let done = false;
        for (const rot of [0, 90]) {
          if (done) break;
          turnTo(id, rot);
          const fp = footprint(def.w, def.h, rot);
          for (let r = 0; !done && r * cell + fp.h <= rect.h + 0.5; r++) {
            for (let c = 0; !done && c * cell + fp.w <= rect.w + 0.5; c++) {
              const point: Vec = { x: rect.x + c * cell + fp.w / 2, y: rect.y + r * cell + fp.h / 2 };
              const next = reduce(s, { type: "place", id, targetId, point });
              if (next.event?.type === "placed") {
                s = next;
                done = true;
              }
            }
          }
        }
      }
      continue;
    }

    for (const id of ids) {
      if (target.allowedRotations && !target.autoOrient) {
        for (let i = 0; i < 4 && !target.allowedRotations.includes(straighten(s.objects[id].rotation)); i++) {
          s = reduce(s, { type: "rotate", id });
        }
      }
      // Free zones are packed from the top-left corner so space doesn't fragment.
      const point = target.layout === "free" ? { x: target.rect.x, y: target.rect.y } : undefined;
      for (let i = 0; i < 4; i++) {
        const next = reduce(s, { type: "place", id, targetId, point });
        if (next.event?.type === "placed") {
          s = next;
          break;
        }
        s = reduce(s, { type: "rotate", id });
      }
    }
  }
  return s;
}
