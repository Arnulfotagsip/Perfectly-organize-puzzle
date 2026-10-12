import type {
  LevelDef,
  ObjectDef,
  Objects,
  ObjState,
  Rect,
  RejectReason,
  TargetDef,
  Vec,
} from "@/types/game";
import {
  angleDistance,
  clampCenter,
  containsPoint,
  distanceToRect,
  footprint,
  overlaps,
  rectAround,
  straighten,
} from "./geometry";

/** How far outside a target a drop still counts as "into" it (board units). */
export const MAGNET_DISTANCE = 18;
const EPS = 0.5;

export function getObject(level: LevelDef, id: string): ObjectDef {
  const def = level.objects.find((o) => o.id === id);
  if (!def) throw new Error(`Unknown object "${id}" in level "${level.id}"`);
  return def;
}

export function getTarget(level: LevelDef, id: string): TargetDef {
  const def = level.targets.find((t) => t.id === id);
  if (!def) throw new Error(`Unknown target "${id}" in level "${level.id}"`);
  return def;
}

export function accepts(target: TargetDef, obj: ObjectDef): boolean {
  return (
    (target.accepts.ids?.includes(obj.id) ?? false) ||
    (target.accepts.categories?.includes(obj.category) ?? false)
  );
}

export function boardRect(level: LevelDef): Rect {
  return { x: 0, y: 0, w: level.board.w, h: level.board.h };
}

export function objectRect(def: ObjectDef, s: Pick<ObjState, "x" | "y" | "rotation">): Rect {
  return rectAround(s, footprint(def.w, def.h, s.rotation));
}

/** Ids of objects currently in `targetId`, sorted by row index. */
export function occupants(objects: Objects, targetId: string, excludeId?: string): string[] {
  return Object.keys(objects)
    .filter((id) => id !== excludeId && objects[id].targetId === targetId)
    .sort((a, b) => objects[a].index - objects[b].index);
}

/** The target under a point: the smallest containing target, else the nearest within the magnet distance. */
export function findTargetAt(level: LevelDef, p: Vec): TargetDef | null {
  const containing = level.targets
    .filter((t) => containsPoint(t.rect, p))
    .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h);
  if (containing.length) return containing[0];
  let best: TargetDef | null = null;
  let bestD = MAGNET_DISTANCE;
  for (const t of level.targets) {
    const d = distanceToRect(t.rect, p);
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  }
  return best;
}

export type PlaceResult =
  | { ok: true; objects: Objects }
  | { ok: false; reason: RejectReason; message: string };

/**
 * auto:     try the target's allowed rotations, nearest first (used for autoOrient targets)
 * straight: snap to the nearest quarter turn only
 * strict:   use exactly the given rotation (player just rotated it)
 */
export type OrientMode = "auto" | "straight" | "strict";

function rotationCandidates(target: TargetDef, rotation: number, mode: OrientMode): number[] {
  if (mode !== "auto") return [straighten(rotation)];
  const allowed = target.allowedRotations ?? [0, 90, 180, 270];
  return [...allowed].sort((a, b) => angleDistance(a, rotation) - angleDistance(b, rotation));
}

function rejectMessage(reason: RejectReason, obj: ObjectDef, target: TargetDef): string {
  switch (reason) {
    case "wrong-target":
      return `The ${target.label} isn't the place for the ${obj.label}.`;
    case "no-fit":
      return obj.rotatable === false
        ? `The ${obj.label} won't fit in the ${target.label}.`
        : `The ${obj.label} won't fit in the ${target.label} this way — try rotating it.`;
    case "occupied":
      return `Something is already in the ${target.label}.`;
    case "full":
      return `There's no room left in the ${target.label} for the ${obj.label}.`;
  }
}

type Fit = { ok: true; x: number; y: number; index: number } | { ok: false; reason: RejectReason };

function fitSlot(target: TargetDef, size: { w: number; h: number }, others: string[]): Fit {
  if (others.length > 0) return { ok: false, reason: "occupied" };
  const { rect } = target;
  if (size.w > rect.w + EPS || size.h > rect.h + EPS) return { ok: false, reason: "no-fit" };
  return { ok: true, x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, index: 0 };
}

function fitFree(
  level: LevelDef,
  target: TargetDef,
  objects: Objects,
  size: { w: number; h: number },
  center: Vec,
  others: string[],
): Fit {
  const { rect } = target;
  if (size.w > rect.w + EPS || size.h > rect.h + EPS) return { ok: false, reason: "no-fit" };
  const otherRects = others.map((id) => objectRect(getObject(level, id), objects[id]));
  const free = (c: Vec) => !otherRects.some((r) => overlaps(rectAround(c, size), r));

  const desired = clampCenter(center, size, rect);
  if (free(desired)) return { ok: true, ...desired, index: 0 };

  // Nudge to the nearest free spot so drops feel forgiving.
  const step = 6;
  let best: Vec | null = null;
  let bestD = Infinity;
  for (let x = rect.x + size.w / 2; x <= rect.x + rect.w - size.w / 2 + EPS; x += step) {
    for (let y = rect.y + size.h / 2; y <= rect.y + rect.h - size.h / 2 + EPS; y += step) {
      const c = { x, y };
      const d = Math.hypot(x - desired.x, y - desired.y);
      if (d < bestD && free(c)) {
        best = c;
        bestD = d;
      }
    }
  }
  return best ? { ok: true, ...best, index: 0 } : { ok: false, reason: "full" };
}

function rowSizes(level: LevelDef, objects: Objects, ids: string[]) {
  return ids.map((id) => {
    const def = getObject(level, id);
    return footprint(def.w, def.h, objects[id].rotation);
  });
}

function fitRow(
  level: LevelDef,
  target: TargetDef,
  objects: Objects,
  size: { w: number; h: number },
  center: Vec,
  others: string[],
): Fit {
  const { rect } = target;
  const gap = target.gap ?? 4;
  if (size.h > rect.h + EPS || size.w > rect.w + EPS) return { ok: false, reason: "no-fit" };
  const widths = rowSizes(level, objects, others).map((s) => s.w);
  const total = widths.reduce((a, b) => a + b, 0) + size.w + gap * others.length;
  if (total > rect.w + EPS) return { ok: false, reason: "full" };
  // Insert before the first neighbour whose centre is right of the drop point.
  const k = others.filter((id) => objects[id].x < center.x).length;
  const index =
    k < others.length
      ? objects[others[k]].index - 0.5
      : (others.length ? objects[others[others.length - 1]].index : 0) + 1;
  // Real coordinates are assigned by layoutRow.
  return { ok: true, x: center.x, y: center.y, index };
}

function fitGrid(
  level: LevelDef,
  target: TargetDef,
  objects: Objects,
  size: { w: number; h: number },
  center: Vec,
  others: string[],
): Fit {
  const { rect } = target;
  const cell = target.cell ?? 40;
  const cols = Math.round(rect.w / cell);
  const rows = Math.round(rect.h / cell);
  const span = (n: number) => Math.max(1, Math.ceil(n / cell - 1e-6));
  const cw = span(size.w);
  const ch = span(size.h);
  if (cw > cols || ch > rows) return { ok: false, reason: "no-fit" };

  const taken = new Set<string>();
  for (const id of others) {
    const def = getObject(level, id);
    const s = objects[id];
    const fp = footprint(def.w, def.h, s.rotation);
    const ow = span(fp.w);
    const oh = span(fp.h);
    const c0 = Math.round((s.x - (ow * cell) / 2 - rect.x) / cell);
    const r0 = Math.round((s.y - (oh * cell) / 2 - rect.y) / cell);
    for (let c = c0; c < c0 + ow; c++) for (let r = r0; r < r0 + oh; r++) taken.add(`${c},${r}`);
  }
  const fits = (c0: number, r0: number) => {
    for (let c = c0; c < c0 + cw; c++)
      for (let r = r0; r < r0 + ch; r++) if (taken.has(`${c},${r}`)) return false;
    return true;
  };

  const dc = (center.x - (cw * cell) / 2 - rect.x) / cell;
  const dr = (center.y - (ch * cell) / 2 - rect.y) / cell;
  let best: [number, number] | null = null;
  let bestD = Infinity;
  for (let c = 0; c <= cols - cw; c++) {
    for (let r = 0; r <= rows - ch; r++) {
      const d = (c - dc) ** 2 + (r - dr) ** 2;
      if (d < bestD && fits(c, r)) {
        best = [c, r];
        bestD = d;
      }
    }
  }
  if (!best) return { ok: false, reason: "full" };
  return {
    ok: true,
    x: rect.x + best[0] * cell + (cw * cell) / 2,
    y: rect.y + best[1] * cell + (ch * cell) / 2,
    index: 0,
  };
}

/** Recompute positions of every object in a row target from their indices. */
export function layoutRow(level: LevelDef, objects: Objects, targetId: string): Objects {
  const target = getTarget(level, targetId);
  if (target.layout !== "row") return objects;
  const ids = occupants(objects, targetId);
  const sizes = rowSizes(level, objects, ids);
  const gap = target.gap ?? 4;
  const total = sizes.reduce((a, s) => a + s.w, 0) + gap * Math.max(0, ids.length - 1);
  const { rect } = target;
  let x = target.justify === "center" ? rect.x + (rect.w - total) / 2 : rect.x + gap;
  if (target.justify !== "center") x = Math.min(x, rect.x + rect.w - total);
  const next = { ...objects };
  ids.forEach((id, i) => {
    const s = sizes[i];
    next[id] = { ...objects[id], index: i, x: x + s.w / 2, y: rect.y + rect.h - s.h / 2 };
    x += s.w + gap;
  });
  return next;
}

export function layoutAllRows(level: LevelDef, objects: Objects): Objects {
  return level.targets
    .filter((t) => t.layout === "row")
    .reduce((acc, t) => layoutRow(level, acc, t.id), objects);
}

/** Try to put `id` into `targetId` around `center`. Never mutates. */
export function placeInTarget(
  level: LevelDef,
  objects: Objects,
  id: string,
  targetId: string,
  center: Vec,
  rotation: number,
  mode: OrientMode,
): PlaceResult {
  const obj = getObject(level, id);
  const target = getTarget(level, targetId);
  if (!accepts(target, obj)) {
    return { ok: false, reason: "wrong-target", message: rejectMessage("wrong-target", obj, target) };
  }
  const others = occupants(objects, targetId, id);
  let lastReason: RejectReason = "no-fit";

  for (const rot of rotationCandidates(target, rotation, mode)) {
    const size = footprint(obj.w, obj.h, rot);
    let fit: Fit;
    switch (target.layout) {
      case "slot":
        fit = fitSlot(target, size, others);
        break;
      case "free":
        fit = fitFree(level, target, objects, size, center, others);
        break;
      case "row":
        fit = fitRow(level, target, objects, size, center, others);
        break;
      case "grid":
        fit = fitGrid(level, target, objects, size, center, others);
        break;
    }
    if (!fit.ok) {
      // "full"/"occupied" are more informative than "no-fit" from another rotation.
      if (lastReason === "no-fit") lastReason = fit.reason;
      continue;
    }
    const prev = objects[id];
    let next: Objects = {
      ...objects,
      [id]: { ...prev, x: fit.x, y: fit.y, rotation: rot, targetId, index: fit.index },
    };
    if (target.layout === "row") {
      // Fractional index slots the object between neighbours; layoutRow renumbers.
      next = layoutRow(level, next, targetId);
    }
    if (prev.targetId && prev.targetId !== targetId) next = layoutRow(level, next, prev.targetId);
    return { ok: true, objects: next };
  }
  return { ok: false, reason: lastReason, message: rejectMessage(lastReason, obj, target) };
}

/** Put an object down on the open board (not in any target). */
export function placeLoose(level: LevelDef, objects: Objects, id: string, center: Vec, rotation: number): Objects {
  const obj = getObject(level, id);
  const prev = objects[id];
  const pos = clampCenter(center, footprint(obj.w, obj.h, rotation), boardRect(level));
  let next: Objects = { ...objects, [id]: { ...prev, ...pos, rotation, targetId: null, index: 0 } };
  if (prev.targetId) next = layoutRow(level, next, prev.targetId);
  return next;
}
