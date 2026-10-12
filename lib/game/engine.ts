import type { GameEvent, GameState, LevelDef, Objects, Snapshot, Vec } from "@/types/game";
import { footprint, nextQuarterTurn } from "./geometry";
import { findTargetAt, getTarget, placeInTarget, placeLoose } from "./placement";

const HISTORY_LIMIT = 200;

export type GameAction =
  /** Drag-and-drop: `center` is where the object ended up, `pointer` where the finger/cursor was released. */
  | { type: "drop"; id: string; center: Vec; pointer: Vec }
  /** Tap/keyboard placement into a specific target. */
  | { type: "place"; id: string; targetId: string; point?: Vec }
  | { type: "rotate"; id: string }
  | { type: "undo" }
  | { type: "reset" }
  /** Brand-new attempt (Replay): clears history too. */
  | { type: "restart" };

export function initialObjects(level: LevelDef): Objects {
  const objects: Objects = {};
  level.objects.forEach((o, i) => {
    objects[o.id] = { x: o.start.x, y: o.start.y, rotation: o.start.rotation, targetId: null, index: 0, z: i + 1 };
  });
  return objects;
}

export function createGame(level: LevelDef): GameState {
  return {
    levelId: level.id,
    objects: initialObjects(level),
    moves: 0,
    history: [],
    zCounter: level.objects.length + 1,
    event: null,
  };
}

function nonce(state: GameState): number {
  return (state.event?.nonce ?? 0) + 1;
}

function samePlacement(a: Objects, b: Objects, id: string): boolean {
  const p = a[id];
  const q = b[id];
  return (
    p.targetId === q.targetId &&
    Math.abs(p.x - q.x) < 0.5 &&
    Math.abs(p.y - q.y) < 0.5 &&
    Math.abs(p.rotation - q.rotation) < 0.5
  );
}

function commit(
  state: GameState,
  id: string,
  objects: Objects,
  countsAsMove: boolean,
  event: GameEvent,
): GameState {
  const snapshot: Snapshot = { objects: state.objects, moves: state.moves };
  const z = state.zCounter + 1;
  return {
    ...state,
    objects: { ...objects, [id]: { ...objects[id], z } },
    zCounter: z,
    moves: state.moves + (countsAsMove ? 1 : 0),
    history: [...state.history, snapshot].slice(-HISTORY_LIMIT),
    event,
  };
}

function placeInto(state: GameState, level: LevelDef, id: string, targetId: string, center: Vec): GameState {
  const target = getTarget(level, targetId);
  const current = state.objects[id];
  const res = placeInTarget(
    level,
    state.objects,
    id,
    targetId,
    center,
    current.rotation,
    target.autoOrient ? "auto" : "straight",
  );
  if (!res.ok) {
    // Rejected drops leave the board untouched; the object eases back to where it was.
    return {
      ...state,
      event: { type: "rejected", objectId: id, targetId, reason: res.reason, message: res.message, nonce: nonce(state) },
    };
  }
  if (samePlacement(state.objects, res.objects, id)) {
    // Picked up and put straight back: nothing to record.
    return { ...state, event: { type: "placed", objectId: id, targetId, nonce: nonce(state) } };
  }
  return commit(state, id, res.objects, true, { type: "placed", objectId: id, targetId, nonce: nonce(state) });
}

export function gameReducer(level: LevelDef) {
  return function reduce(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case "drop": {
        if (!state.objects[action.id]) return state;
        const target = findTargetAt(level, action.pointer) ?? findTargetAt(level, action.center);
        if (target) return placeInto(state, level, action.id, target.id, action.center);
        const obj = state.objects[action.id];
        const objects = placeLoose(level, state.objects, action.id, action.center, obj.rotation);
        if (samePlacement(state.objects, objects, action.id)) return state;
        // Rearranging the messy desk is free: only placements into targets count as moves.
        return commit(state, action.id, objects, false, { type: "loose", objectId: action.id, nonce: nonce(state) });
      }

      case "place": {
        if (!state.objects[action.id]) return state;
        const target = getTarget(level, action.targetId);
        const { rect } = target;
        // Without a point, rows append at the end and other layouts aim for the centre.
        const point =
          action.point ??
          (target.layout === "row"
            ? { x: rect.x + rect.w + 1000, y: rect.y + rect.h / 2 }
            : { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
        return placeInto(state, level, action.id, target.id, point);
      }

      case "rotate": {
        const obj = state.objects[action.id];
        const def = level.objects.find((o) => o.id === action.id);
        if (!obj || !def || def.rotatable === false) return state;
        const rotation = nextQuarterTurn(obj.rotation);
        if (!obj.targetId) {
          const objects = placeLoose(level, state.objects, action.id, obj, rotation);
          return commit(state, action.id, objects, false, { type: "rotated", objectId: action.id, nonce: nonce(state) });
        }
        const res = placeInTarget(level, state.objects, action.id, obj.targetId, obj, rotation, "strict");
        if (!res.ok) {
          const target = getTarget(level, obj.targetId);
          const fp = footprint(def.w, def.h, rotation);
          const message =
            fp.w > target.rect.w || fp.h > target.rect.h
              ? `The ${def.label} can't turn that way inside the ${target.label}. Take it out to rotate it.`
              : `Not enough room to turn the ${def.label} here.`;
          return { ...state, event: { type: "rotate-blocked", objectId: action.id, message, nonce: nonce(state) } };
        }
        return commit(state, action.id, res.objects, false, { type: "rotated", objectId: action.id, nonce: nonce(state) });
      }

      case "undo": {
        const prev = state.history[state.history.length - 1];
        if (!prev) return state;
        return {
          ...state,
          objects: prev.objects,
          moves: prev.moves,
          history: state.history.slice(0, -1),
          event: { type: "undo", nonce: nonce(state) },
        };
      }

      case "reset": {
        const fresh = initialObjects(level);
        if (state.history.length === 0) return state;
        // Reset is itself undoable, so an accidental reset never loses work.
        return {
          ...state,
          objects: fresh,
          moves: 0,
          history: [...state.history, { objects: state.objects, moves: state.moves }].slice(-HISTORY_LIMIT),
          event: { type: "reset", nonce: nonce(state) },
        };
      }

      case "restart":
        return { ...createGame(level), event: { type: "reset", nonce: nonce(state) } };
    }
  };
}

/** Rebuild a game from persisted objects, rejecting anything that doesn't match the level. */
export function restoreGame(level: LevelDef, saved: unknown): GameState | null {
  if (!saved || typeof saved !== "object") return null;
  const s = saved as { objects?: unknown; moves?: unknown };
  if (!s.objects || typeof s.objects !== "object") return null;
  const raw = s.objects as Record<string, unknown>;
  const targetIds = new Set(level.targets.map((t) => t.id));
  const objects: Objects = {};
  let maxZ = 0;
  for (const def of level.objects) {
    const o = raw[def.id] as Record<string, unknown> | undefined;
    if (!o || typeof o !== "object") return null;
    const { x, y, rotation, targetId, index, z } = o;
    if (![x, y, rotation, index, z].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
    if (targetId !== null && !(typeof targetId === "string" && targetIds.has(targetId))) return null;
    if ((x as number) < 0 || (x as number) > level.board.w || (y as number) < 0 || (y as number) > level.board.h) return null;
    objects[def.id] = {
      x: x as number,
      y: y as number,
      rotation: rotation as number,
      targetId: targetId as string | null,
      index: index as number,
      z: z as number,
    };
    maxZ = Math.max(maxZ, z as number);
  }
  if (Object.keys(raw).length !== level.objects.length) return null;
  const moves = typeof s.moves === "number" && Number.isFinite(s.moves) && s.moves >= 0 ? Math.floor(s.moves) : 0;
  return { levelId: level.id, objects, moves, history: [], zCounter: maxZ + 1, event: null };
}
