import type { Evaluation, LevelDef, ObjectDef, Objects, Rule } from "@/types/game";
import { accepts, getTarget, placeInTarget } from "./placement";
import { groupHomes, outOfOrder } from "./validation";

export interface Hint {
  objectId: string;
  targetId: string | null;
  message: string;
}

type GroupRule = Extract<Rule, { type: "group-by-category" }>;

/** Best target for an object given what the player has already built. */
export function suggestTarget(level: LevelDef, objects: Objects, def: ObjectDef): string {
  const fallback = level.solution[def.id];
  const group = level.rules.find(
    (r): r is GroupRule => r.type === "group-by-category" && r.targetIds.includes(fallback),
  );
  if (!group) return fallback;
  const homes = groupHomes(level, objects, group);
  const home = homes.get(def.category);
  if (home) return home;
  // No home yet: prefer the intended shelf if it's still unclaimed, else any unclaimed one that accepts it.
  const claimed = new Set(homes.values());
  const open = group.targetIds.filter((t) => !claimed.has(t) && accepts(getTarget(level, t), def));
  return open.includes(fallback) ? fallback : (open[0] ?? fallback);
}

export function getHint(level: LevelDef, objects: Objects, evaluation: Evaluation): Hint | null {
  if (evaluation.complete) return null;

  // 1. Fix something that's placed but not quite right.
  for (const def of level.objects) {
    const st = evaluation.objects[def.id];
    if (st.status !== "issue") continue;
    const current = objects[def.id].targetId;
    const orderRule = level.rules.find(
      (r): r is Extract<Rule, { type: "order" }> =>
        r.type === "order" && r.targetId === current && outOfOrder(level, objects, r).includes(def.id),
    );
    if (orderRule) {
      return { objectId: def.id, targetId: current, message: `${orderRule.label}. Try moving the ${def.label}.` };
    }
    const better = suggestTarget(level, objects, def);
    if (better !== current && st.message.startsWith("Keep each")) {
      return {
        objectId: def.id,
        targetId: better,
        message: `Move the ${def.label} to the ${getTarget(level, better).label}, with the other ${def.category}.`,
      };
    }
    return { objectId: def.id, targetId: current, message: st.message };
  }

  // 2. Otherwise point at the next loose object.
  for (const def of level.objects) {
    if (evaluation.objects[def.id].status !== "loose") continue;
    const targetId = suggestTarget(level, objects, def);
    const target = getTarget(level, targetId);
    const order = level.rules.find((r) => r.type === "order" && r.targetId === targetId);
    const s = objects[def.id];
    const point = { x: target.rect.x + target.rect.w / 2, y: target.rect.y + target.rect.h / 2 };
    const trial = placeInTarget(level, objects, def.id, targetId, point, s.rotation, target.autoOrient ? "auto" : "straight");
    let message = `Try the ${def.label} in the ${target.label}.`;
    if (!trial.ok && trial.reason === "no-fit") message += " It needs rotating first.";
    else if (!trial.ok) message += ` Make some room there first.`;
    if (order) message += ` Remember: ${order.label.toLowerCase()}.`;
    return { objectId: def.id, targetId, message };
  }
  return null;
}
