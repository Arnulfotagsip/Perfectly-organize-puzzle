import type { Rect, Vec } from "@/types/game";

export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

/** Nearest multiple of 90, normalised to [0, 360). */
export function straighten(deg: number): number {
  return normalizeAngle(Math.round(deg / 90) * 90);
}

/** A quarter turn clockwise from the nearest straight orientation, so every press visibly turns. */
export function nextQuarterTurn(deg: number): number {
  return normalizeAngle(straighten(deg) + 90);
}

/** Smallest absolute difference between two angles. */
export function angleDistance(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(d, 360 - d);
}

/** Axis-aligned bounding size of a w×h rectangle rotated by `deg`. */
export function footprint(w: number, h: number, deg: number): { w: number; h: number } {
  const a = normalizeAngle(deg);
  if (a % 180 === 0) return { w, h };
  if (a % 90 === 0) return { w: h, h: w };
  const r = (a * Math.PI) / 180;
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  return { w: w * c + h * s, h: w * s + h * c };
}

export function rectAround(center: Vec, size: { w: number; h: number }): Rect {
  return { x: center.x - size.w / 2, y: center.y - size.h / 2, w: size.w, h: size.h };
}

export function containsPoint(r: Rect, p: Vec, pad = 0): boolean {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
}

export function overlaps(a: Rect, b: Rect, tolerance = 0.5): boolean {
  return (
    a.x < b.x + b.w - tolerance &&
    b.x < a.x + a.w - tolerance &&
    a.y < b.y + b.h - tolerance &&
    b.y < a.y + a.h - tolerance
  );
}

/** Clamp a centre so an object of `size` stays fully inside `bounds`. */
export function clampCenter(center: Vec, size: { w: number; h: number }, bounds: Rect): Vec {
  const minX = bounds.x + size.w / 2;
  const maxX = bounds.x + bounds.w - size.w / 2;
  const minY = bounds.y + size.h / 2;
  const maxY = bounds.y + bounds.h - size.h / 2;
  return {
    x: minX > maxX ? bounds.x + bounds.w / 2 : Math.min(maxX, Math.max(minX, center.x)),
    y: minY > maxY ? bounds.y + bounds.h / 2 : Math.min(maxY, Math.max(minY, center.y)),
  };
}

export function distanceToRect(r: Rect, p: Vec): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
