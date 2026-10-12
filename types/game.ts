// Core type definitions shared by the engine, level data and UI.

export type Vec = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type Environment = "desk" | "bookshelf" | "drawer" | "pantry";

/** Illustration keys understood by <ObjectArt>. */
export type ArtKind =
  | "pencil"
  | "pen"
  | "eraser"
  | "ruler"
  | "scissors"
  | "sticky-notes"
  | "notebook"
  | "stapler"
  | "paper-clips"
  | "book"
  | "plant"
  | "photo-frame"
  | "cable"
  | "watch"
  | "keys"
  | "earbuds"
  | "can"
  | "jar"
  | "cereal-box"
  | "pasta-box";

/** Fixture keys understood by <Fixture>. */
export type FixtureKind =
  | "cup"
  | "tray"
  | "groove"
  | "outline"
  | "mat"
  | "shelf"
  | "compartment"
  | "pantry-shelf";

export interface ObjectDef {
  /** Stable identifier, unique within the level. */
  id: string;
  kind: ArtKind;
  /** Human readable name used in messages, e.g. "yellow pencil". */
  label: string;
  category: string;
  /** Unrotated footprint, in board units. */
  w: number;
  h: number;
  /** Initial centre position and rotation (degrees, clockwise). */
  start: { x: number; y: number; rotation: number };
  /** Defaults to true. */
  rotatable?: boolean;
  color?: string;
  accent?: string;
  /** Optional sort key used by `order` rules with `by: "value"`. */
  value?: number;
}

/**
 * How objects inside a target are positioned.
 * - slot: a single exact position (capacity 1), object is centred.
 * - free: anywhere fully inside the rect, no overlap with neighbours.
 * - row:  objects line up side by side, bottom aligned (shelves, cups).
 * - grid: objects occupy whole cells; overlap is impossible.
 */
export type Layout = "slot" | "free" | "row" | "grid";

export interface TargetDef {
  id: string;
  /** Used in messages, e.g. "pencil cup". */
  label: string;
  rect: Rect;
  layout: Layout;
  fixture: FixtureKind;
  accepts: { categories?: string[]; ids?: string[] };
  /** Rotations that count as correctly aligned. Defaults to any. */
  allowedRotations?: number[];
  /** When true, objects are turned to the nearest fitting allowed rotation on drop. */
  autoOrient?: boolean;
  /** Row layout: gap between items and horizontal alignment. */
  gap?: number;
  justify?: "start" | "center";
  /** Grid layout: cell size. Rect w/h must be multiples of it. */
  cell?: number;
  /** Fixture colour override. */
  tint?: string;
  /** Optional silhouette drawn inside an outline fixture. */
  silhouette?: { kind: ArtKind; w: number; h: number; rotation: number };
}

export type Rule =
  | {
      type: "order";
      targetId: string;
      by: "height" | "value";
      direction: "asc" | "desc";
      /** Player-facing description, e.g. "Top shelf: shortest to tallest". */
      label: string;
    }
  | {
      type: "group-by-category";
      targetIds: string[];
      label: string;
    };

export interface LevelDef {
  id: string;
  name: string;
  environment: Environment;
  /** One line shown on cards. */
  summary: string;
  /** Short bullet instructions shown before/while playing. */
  instructions: string[];
  board: { w: number; h: number };
  objects: ObjectDef[];
  targets: TargetDef[];
  rules: Rule[];
  /** One known-good target per object; used for hints and solvability tests. */
  solution: Record<string, string>;
  scoring?: { threeStarExtra?: number; twoStarExtra?: number };
}

export interface ObjState {
  x: number;
  y: number;
  rotation: number;
  targetId: string | null;
  /** Position within a row target. */
  index: number;
  /** Stacking order; higher draws on top. */
  z: number;
}

export type Objects = Record<string, ObjState>;

export type RejectReason = "wrong-target" | "no-fit" | "occupied" | "full";

export type GameEvent =
  | { type: "placed"; objectId: string; targetId: string; nonce: number }
  | { type: "loose"; objectId: string; nonce: number }
  | {
      type: "rejected";
      objectId: string;
      targetId: string;
      reason: RejectReason;
      message: string;
      nonce: number;
    }
  | { type: "rotated"; objectId: string; nonce: number }
  | { type: "rotate-blocked"; objectId: string; message: string; nonce: number }
  | { type: "undo"; nonce: number }
  | { type: "reset"; nonce: number };

export interface Snapshot {
  objects: Objects;
  moves: number;
}

export interface GameState {
  levelId: string;
  objects: Objects;
  moves: number;
  history: Snapshot[];
  zCounter: number;
  event: GameEvent | null;
}

export type ObjectStatus =
  | { status: "loose" }
  | { status: "ok" }
  | { status: "issue"; message: string };

export interface Evaluation {
  objects: Record<string, ObjectStatus>;
  rules: { rule: Rule; ok: boolean }[];
  done: number;
  total: number;
  complete: boolean;
}
