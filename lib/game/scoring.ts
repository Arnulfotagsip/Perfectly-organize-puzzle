import type { LevelDef } from "@/types/game";

/**
 * Stars depend only on placements beyond the minimum (one per object).
 * Undo restores the move counter and loose rearranging is free, so experimenting is never punished.
 */
export function starThresholds(level: LevelDef) {
  const par = level.objects.length;
  const three = level.scoring?.threeStarExtra ?? Math.max(2, Math.round(par * 0.3));
  const two = level.scoring?.twoStarExtra ?? par;
  return { par, three, two };
}

export function computeStars(level: LevelDef, moves: number): 1 | 2 | 3 {
  const { par, three, two } = starThresholds(level);
  const extra = Math.max(0, moves - par);
  if (extra <= three) return 3;
  if (extra <= two) return 2;
  return 1;
}
