import type { Evaluation, LevelDef, ObjectDef, Objects, ObjectStatus, Rule } from "@/types/game";
import { straighten } from "./geometry";
import { accepts, getObject, getTarget, occupants } from "./placement";

export function sortKey(def: ObjectDef, by: "height" | "value"): number {
  return by === "height" ? def.h : (def.value ?? 0);
}

export function alignmentIssue(def: ObjectDef, rotation: number, allowed?: number[]): string | null {
  if (!allowed) return null;
  const r = straighten(rotation);
  if (allowed.includes(r) && Math.abs(((rotation % 360) + 360) % 360 - r) < 0.5) return null;
  if (r === 180) return `The ${def.label} is upside down — rotate it.`;
  if (allowed.includes(0) && (r === 90 || r === 270)) return `The ${def.label} is on its side — rotate it upright.`;
  return `The ${def.label} isn't lined up — rotate it.`;
}

/** Ids in `targetId` that are not where a correct ordering would put them. */
export function outOfOrder(level: LevelDef, objects: Objects, rule: Extract<Rule, { type: "order" }>): string[] {
  const ids = occupants(objects, rule.targetId);
  const key = (id: string) => sortKey(getObject(level, id), rule.by);
  const sorted = [...ids].sort((a, b) => (rule.direction === "asc" ? key(a) - key(b) : key(b) - key(a)));
  // Equal keys are interchangeable, so compare keys rather than ids.
  return ids.filter((id, i) => key(id) !== key(sorted[i]));
}

/**
 * For a group rule, every target holds one category and every category lives in one target.
 * Returns the ids that break the grouping (the minority members).
 */
export function groupViolations(level: LevelDef, objects: Objects, rule: Extract<Rule, { type: "group-by-category" }>): Map<string, string> {
  const bad = new Map<string, string>();
  const homes = groupHomes(level, objects, rule);
  for (const t of rule.targetIds) {
    for (const id of occupants(objects, t)) {
      const def = getObject(level, id);
      if (homes.get(def.category) !== t) {
        const shelf = getTarget(level, t).label;
        bad.set(id, `Keep each ${shelf} to one kind of item — the ${def.label} belongs with the other ${def.category}.`);
      }
    }
  }
  return bad;
}

/** Category -> the group target that "owns" it (where most of that category sits). */
export function groupHomes(level: LevelDef, objects: Objects, rule: Extract<Rule, { type: "group-by-category" }>): Map<string, string> {
  const counts: { cat: string; target: string; n: number }[] = [];
  for (const t of rule.targetIds) {
    const byCat = new Map<string, number>();
    for (const id of occupants(objects, t)) {
      const cat = getObject(level, id).category;
      byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
    }
    for (const [cat, n] of byCat) counts.push({ cat, target: t, n });
  }
  // Largest groups claim targets first; a target can only be home to one category.
  counts.sort((a, b) => b.n - a.n || rule.targetIds.indexOf(a.target) - rule.targetIds.indexOf(b.target));
  const homes = new Map<string, string>();
  const claimed = new Set<string>();
  for (const c of counts) {
    if (homes.has(c.cat) || claimed.has(c.target)) continue;
    homes.set(c.cat, c.target);
    claimed.add(c.target);
  }
  return homes;
}

export function evaluate(level: LevelDef, objects: Objects): Evaluation {
  const result: Record<string, ObjectStatus> = {};

  for (const def of level.objects) {
    const s = objects[def.id];
    if (!s?.targetId) {
      result[def.id] = { status: "loose" };
      continue;
    }
    const target = getTarget(level, s.targetId);
    if (!accepts(target, def)) {
      result[def.id] = { status: "issue", message: `The ${def.label} doesn't belong in the ${target.label}.` };
      continue;
    }
    const align = alignmentIssue(def, s.rotation, target.allowedRotations);
    result[def.id] = align ? { status: "issue", message: align } : { status: "ok" };
  }

  const rules = level.rules.map((rule) => {
    let broken: Map<string, string>;
    if (rule.type === "order") {
      broken = new Map(
        outOfOrder(level, objects, rule).map((id) => [
          id,
          `${rule.label} — the ${getObject(level, id).label} is out of place.`,
        ]),
      );
    } else {
      broken = groupViolations(level, objects, rule);
    }
    for (const [id, message] of broken) {
      if (result[id]?.status === "ok") result[id] = { status: "issue", message };
    }
    // A rule only reads as satisfied once everything it governs is actually in place.
    const ruleTargets = rule.type === "order" ? [rule.targetId] : rule.targetIds;
    const governed = level.objects.filter((o) => ruleTargets.includes(level.solution[o.id]));
    const allIn = governed.every((o) => {
      const t = objects[o.id]?.targetId;
      return !!t && ruleTargets.includes(t);
    });
    return { rule, ok: broken.size === 0 && allIn };
  });

  const done = level.objects.filter((o) => result[o.id].status === "ok").length;
  const total = level.objects.length;
  return {
    objects: result,
    rules,
    done,
    total,
    complete: done === total && rules.every((r) => r.ok),
  };
}
