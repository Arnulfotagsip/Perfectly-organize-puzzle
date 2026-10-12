// Pure save-data model: parsing is defensive so corrupt or old saves never break the game.

export type Theme = "cream" | "mint" | "dusk";
export type MotionPref = "system" | "full" | "reduced";

export interface Settings {
  sound: boolean;
  motion: MotionPref;
  theme: Theme;
}

export interface LevelProgress {
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestMoves: number | null;
}

export interface InProgress {
  objects: unknown;
  moves: number;
}

export interface SaveData {
  version: 1;
  levels: Record<string, LevelProgress>;
  settings: Settings;
  /** Unfinished boards, keyed by level id. Validated against the level on load. */
  inProgress: Record<string, InProgress>;
  lastPlayed: string | null;
  /** A level unlocked but not yet seen on the level-select screen (drives the unlock animation). */
  newlyUnlocked: string | null;
}

export const SAVE_KEY = "perfectly-organized:v1";

export const DEFAULT_SETTINGS: Settings = { sound: true, motion: "system", theme: "cream" };

export function defaultSave(): SaveData {
  return { version: 1, levels: {}, settings: { ...DEFAULT_SETTINGS }, inProgress: {}, lastPlayed: null, newlyUnlocked: null };
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function parseSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  return {
    sound: typeof s.sound === "boolean" ? s.sound : DEFAULT_SETTINGS.sound,
    motion: s.motion === "full" || s.motion === "reduced" || s.motion === "system" ? s.motion : DEFAULT_SETTINGS.motion,
    theme: s.theme === "mint" || s.theme === "dusk" || s.theme === "cream" ? s.theme : DEFAULT_SETTINGS.theme,
  };
}

function parseLevel(v: unknown): LevelProgress | null {
  if (!isObj(v)) return null;
  const stars = typeof v.stars === "number" && [0, 1, 2, 3].includes(v.stars) ? (v.stars as LevelProgress["stars"]) : 0;
  const bestMoves =
    typeof v.bestMoves === "number" && Number.isFinite(v.bestMoves) && v.bestMoves >= 0 ? Math.floor(v.bestMoves) : null;
  return { completed: v.completed === true, stars, bestMoves };
}

export function parseSave(raw: string | null): SaveData {
  if (!raw) return defaultSave();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  if (!isObj(data) || data.version !== 1) return defaultSave();

  const levels: Record<string, LevelProgress> = {};
  if (isObj(data.levels)) {
    for (const [id, v] of Object.entries(data.levels)) {
      const p = parseLevel(v);
      if (p) levels[id] = p;
    }
  }
  const inProgress: Record<string, InProgress> = {};
  if (isObj(data.inProgress)) {
    for (const [id, v] of Object.entries(data.inProgress)) {
      if (isObj(v) && isObj(v.objects) && typeof v.moves === "number") inProgress[id] = { objects: v.objects, moves: v.moves };
    }
  }
  return {
    version: 1,
    levels,
    settings: parseSettings(data.settings),
    inProgress,
    lastPlayed: typeof data.lastPlayed === "string" ? data.lastPlayed : null,
    newlyUnlocked: typeof data.newlyUnlocked === "string" ? data.newlyUnlocked : null,
  };
}

/** Levels unlock in order: the first is always open, each later one once its predecessor is complete. */
export function isUnlocked(save: SaveData, levelIds: string[], id: string): boolean {
  const i = levelIds.indexOf(id);
  if (i <= 0) return i === 0;
  return save.levels[levelIds[i - 1]]?.completed === true || save.levels[id]?.completed === true;
}

/** The level a "Continue" button should open: the first unfinished unlocked level. */
export function currentLevelId(save: SaveData, levelIds: string[]): string {
  return levelIds.find((id) => !save.levels[id]?.completed && isUnlocked(save, levelIds, id)) ?? levelIds[levelIds.length - 1];
}

export function hasProgress(save: SaveData): boolean {
  return Object.values(save.levels).some((l) => l.completed) || Object.keys(save.inProgress).length > 0;
}

export function recordCompletion(
  save: SaveData,
  levelIds: string[],
  id: string,
  stars: 1 | 2 | 3,
  moves: number,
): SaveData {
  const prev = save.levels[id];
  const wasUnlocked = (lid: string) => isUnlocked(save, levelIds, lid);
  const next: SaveData = {
    ...save,
    levels: {
      ...save.levels,
      [id]: {
        completed: true,
        stars: Math.max(prev?.stars ?? 0, stars) as LevelProgress["stars"],
        bestMoves: prev?.bestMoves == null ? moves : Math.min(prev.bestMoves, moves),
      },
    },
    inProgress: Object.fromEntries(Object.entries(save.inProgress).filter(([k]) => k !== id)),
    lastPlayed: id,
  };
  const following = levelIds[levelIds.indexOf(id) + 1];
  if (following && !wasUnlocked(following)) next.newlyUnlocked = following;
  return next;
}
