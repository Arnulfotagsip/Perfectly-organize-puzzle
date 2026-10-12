import { memo, type ReactElement } from "react";
import type { LevelDef, Rect, TargetDef } from "@/types/game";
import { ObjectArt } from "@/components/objects/ObjectArt";
import { OUTLINE, shade } from "@/components/objects/color";

function bbox(rects: Rect[], pad: { l: number; t: number; r: number; b: number }): Rect {
  const x0 = Math.min(...rects.map((r) => r.x)) - pad.l;
  const y0 = Math.min(...rects.map((r) => r.y)) - pad.t;
  const x1 = Math.max(...rects.map((r) => r.x + r.w)) + pad.r;
  const y1 = Math.max(...rects.map((r) => r.y + r.h)) + pad.b;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const WOOD = "#d4a87a";

/** Static environment art drawn beneath everything else. */
export const SceneBackground = memo(function SceneBackground({ level }: { level: LevelDef }) {
  const { w, h } = level.board;
  const rects = level.targets.map((t) => t.rect);
  switch (level.environment) {
    case "desk": {
      const panel = bbox(
        level.targets.filter((t) => t.fixture !== "mat").map((t) => t.rect),
        { l: 22, t: 22, r: 22, b: 20 },
      );
      return (
        <g>
          <rect width={w} height={h} fill="#ecd2ae" />
          {[120, 300, 470, 640, 790].map((y, i) => (
            <path key={y} d={`M0 ${y} C ${w * 0.3} ${y + (i % 2 ? 14 : -10)}, ${w * 0.7} ${y + (i % 2 ? -12 : 10)}, ${w} ${y + 4}`} fill="none" stroke="#e0c29a" strokeWidth={3} />
          ))}
          <rect x={panel.x + 4} y={panel.y + 8} width={panel.w} height={panel.h} rx={26} fill="#000" opacity={0.08} />
          <rect x={panel.x} y={panel.y} width={panel.w} height={panel.h} rx={26} fill="#fff7ea" stroke="#e8d6bd" strokeWidth={3} />
        </g>
      );
    }
    case "bookshelf": {
      const c = bbox(rects, { l: 34, t: 42, r: 34, b: 30 });
      const inner = { x: c.x + 18, y: c.y + 18, w: c.w - 36, h: c.h - 18 };
      const bottoms = [...new Set(level.targets.map((t) => t.rect.y + t.rect.h))];
      return (
        <g>
          <rect width={w} height={h} fill="#f6eee2" />
          {Array.from({ length: 16 }, (_, i) => (
            <rect key={i} x={i * 52} y={0} width={26} height={c.y + c.h} fill="#efe4d4" opacity={0.6} />
          ))}
          <rect x={0} y={c.y + c.h} width={w} height={h - c.y - c.h} fill="#e6cfae" />
          <ellipse cx={w / 2} cy={c.y + c.h + (h - c.y - c.h) / 2 + 6} rx={w * 0.46} ry={(h - c.y - c.h) * 0.4} fill="#dcd0ee" opacity={0.75} />
          <rect x={c.x + 6} y={c.y + 10} width={c.w} height={c.h} rx={16} fill="#000" opacity={0.08} />
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={16} fill={WOOD} stroke={shade(WOOD, -0.2)} strokeWidth={3} />
          <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h - 4} rx={8} fill="#ecd9bd" />
          {bottoms.map((y) => (
            <g key={y}>
              <rect x={c.x + 6} y={y} width={c.w - 12} height={18} rx={4} fill={shade(WOOD, 0.08)} stroke={shade(WOOD, -0.2)} strokeWidth={2} />
              <rect x={inner.x} y={y + 18} width={inner.w} height={8} fill="#000" opacity={0.06} />
            </g>
          ))}
        </g>
      );
    }
    case "drawer": {
      const d = bbox(rects, { l: 32, t: 32, r: 32, b: 32 });
      return (
        <g>
          <rect width={w} height={h} fill="#efdcc2" />
          {[90, 280, 470, 660].map((y) => (
            <line key={y} x1={0} x2={w} y1={y + 400} y2={y + 400} stroke="#e4ceb0" strokeWidth={3} />
          ))}
          <rect x={d.x + 4} y={d.y + 12} width={d.w} height={d.h + 26} rx={22} fill="#000" opacity={0.09} />
          <rect x={d.x} y={d.y} width={d.w} height={d.h + 24} rx={22} fill="#cfa77c" stroke={shade("#cfa77c", -0.2)} strokeWidth={3} />
          <rect x={d.x + 14} y={d.y + 14} width={d.w - 28} height={d.h - 28} rx={12} fill="#f3e3cc" />
          <rect x={d.x} y={d.y + d.h - 6} width={d.w} height={30} rx={10} fill={shade("#cfa77c", 0.08)} stroke={shade("#cfa77c", -0.2)} strokeWidth={3} />
          <rect x={d.x + d.w / 2 - 50} y={d.y + d.h + 3} width={100} height={12} rx={6} fill="#b8bfc6" stroke={OUTLINE} strokeWidth={1.5} />
        </g>
      );
    }
    case "pantry": {
      const c = bbox(rects, { l: 30, t: 30, r: 30, b: 26 });
      const counterY = c.y + c.h + 24;
      return (
        <g>
          <rect width={w} height={h} fill="#f5efe4" />
          {Array.from({ length: 14 }, (_, i) => (
            <line key={`h${i}`} x1={0} x2={w} y1={i * 60} y2={i * 60} stroke="#ebe2d3" strokeWidth={2} />
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <line key={`v${i}`} x1={i * 60 + 30} x2={i * 60 + 30} y1={0} y2={counterY} stroke="#ebe2d3" strokeWidth={2} />
          ))}
          <rect x={c.x + 5} y={c.y + 8} width={c.w} height={c.h} rx={16} fill="#000" opacity={0.08} />
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={16} fill="#fffaf1" stroke="#dcc6a6" strokeWidth={3} />
          <rect x={c.x + 12} y={c.y + 12} width={c.w - 24} height={c.h - 24} rx={10} fill="#f3e9d8" />
          <rect x={0} y={counterY} width={w} height={h - counterY} fill="#e6d6bf" />
          <rect x={0} y={counterY} width={w} height={12} fill="#d6c0a2" />
        </g>
      );
    }
  }
});

function Silhouette({ t }: { t: TargetDef }) {
  if (!t.silhouette) return null;
  const { kind, w, h, rotation } = t.silhouette;
  const cx = t.rect.x + t.rect.w / 2;
  const cy = t.rect.y + t.rect.h / 2;
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotation})`} opacity={0.16} style={{ filter: "grayscale(1)" }}>
      <ObjectArt kind={kind} w={w} h={h} color="#6b6158" accent="#6b6158" />
    </g>
  );
}

/** Fixture art for a target. `front` draws parts that sit in front of contained objects (cup walls). */
export const Fixture = memo(function Fixture({ t, layer }: { t: TargetDef; layer: "back" | "front" }) {
  const { x, y, w, h } = t.rect;
  const tint = t.tint ?? "#e9dcc8";
  let el: ReactElement | null = null;

  switch (t.fixture) {
    case "cup": {
      const top = y + h * 0.5;
      const bh = y + h - top;
      if (layer === "back") {
        el = (
          <g>
            <ellipse cx={x + w / 2} cy={top + 6} rx={w / 2 - 2} ry={10} fill={shade(tint, -0.35)} />
          </g>
        );
      } else {
        el = (
          <g>
            <path
              d={`M${x} ${top + 6} H${x + w} V${y + h - 14} Q${x + w} ${y + h} ${x + w - 14} ${y + h} H${x + 14} Q${x} ${y + h} ${x} ${y + h - 14} Z`}
              fill={tint}
              stroke={OUTLINE}
              strokeWidth={2}
            />
            <ellipse cx={x + w / 2} cy={top + 6} rx={w / 2} ry={7} fill="none" stroke={shade(tint, 0.35)} strokeWidth={5} />
            <rect x={x + 12} y={top + 20} width={8} height={bh - 44} rx={4} fill="#fff" opacity={0.4} />
            <rect x={x + 8} y={y + h - 4} width={w - 16} height={8} rx={4} fill="#000" opacity={0.08} />
          </g>
        );
      }
      break;
    }
    case "tray":
      if (layer === "back")
        el = (
          <g>
            <rect x={x - 2} y={y + 4} width={w + 4} height={h} rx={16} fill="#000" opacity={0.07} />
            <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={16} fill={tint} stroke={OUTLINE} strokeWidth={2} />
            <rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={11} fill={shade(tint, 0.45)} />
            <rect x={x + 4} y={y + 4} width={w - 8} height={8} rx={4} fill={shade(tint, -0.08)} opacity={0.6} />
          </g>
        );
      break;
    case "groove":
      if (layer === "back")
        el = (
          <g>
            <rect x={x} y={y} width={w} height={h} rx={14} fill="#efdcc3" stroke={OUTLINE} strokeWidth={2} />
            <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={9} fill="#e2c9a8" />
            <rect x={x + 6} y={y + 6} width={w - 12} height={5} rx={2.5} fill="#000" opacity={0.08} />
          </g>
        );
      break;
    case "outline":
      if (layer === "back")
        el = (
          <g>
            <rect x={x} y={y} width={w} height={h} rx={14} fill="#fffaf2" opacity={0.6} />
            <rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={12} fill="none" stroke="#bfae98" strokeWidth={2.5} strokeDasharray="8 7" />
            <Silhouette t={t} />
          </g>
        );
      break;
    case "mat":
      if (layer === "back")
        el = (
          <g>
            <rect x={x - 12} y={y - 8} width={w + 24} height={h + 20} rx={20} fill="#000" opacity={0.07} />
            <rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} rx={20} fill={tint} stroke={OUTLINE} strokeWidth={2} />
            <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={14} fill="none" stroke="#fff" strokeOpacity={0.65} strokeWidth={2} strokeDasharray="6 6" />
          </g>
        );
      break;
    case "shelf":
      // Planks and back panel are part of the bookshelf scene.
      break;
    case "compartment": {
      if (layer !== "back") break;
      const cell = t.cell ?? 40;
      const dots: ReactElement[] = [];
      for (let cx = x + cell; cx < x + w; cx += cell)
        for (let cy = y + cell; cy < y + h; cy += cell) dots.push(<circle key={`${cx},${cy}`} cx={cx} cy={cy} r={2} fill="#c9b08e" />);
      el = (
        <g>
          <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={12} fill="#d9bb93" />
          <rect x={x} y={y} width={w} height={h} rx={8} fill="#f7ecdc" />
          <rect x={x} y={y} width={w} height={8} rx={4} fill="#000" opacity={0.07} />
          {dots}
        </g>
      );
      break;
    }
    case "pantry-shelf":
      if (layer === "back")
        el = (
          <g>
            <rect x={x - 18} y={y + h} width={w + 36} height={16} rx={4} fill="#fffdf8" stroke="#d6c0a2" strokeWidth={2} />
            <rect x={x - 12} y={y + h + 16} width={w + 24} height={8} fill="#000" opacity={0.06} />
          </g>
        );
      break;
  }
  return el;
});
