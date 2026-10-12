/** Mix a hex colour toward black (amount < 0) or white (amount > 0). */
export function shade(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const t = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const out = channels.map((c) => Math.round(c + (t - c) * p));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export const OUTLINE = "rgba(74,64,54,0.55)";
