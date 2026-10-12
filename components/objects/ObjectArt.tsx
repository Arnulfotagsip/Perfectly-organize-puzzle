import { memo, type ReactElement } from "react";
import type { ArtKind } from "@/types/game";
import { OUTLINE, shade } from "./color";

// Every illustration is drawn centred on (0,0) inside its w×h footprint, unrotated.

export interface ArtProps {
  w: number;
  h: number;
  color?: string;
  accent?: string;
}

const SW = 2; // outline stroke width

function Pencil({ w, h, color = "#f6c85f" }: ArtProps) {
  const bw = Math.min(w, 22) * 0.92;
  const x = -bw / 2;
  const top = -h / 2;
  const tip = Math.min(h * 0.16, 32);
  const eraser = Math.min(h * 0.08, 16);
  const ferrule = Math.min(h * 0.06, 12);
  const bodyTop = top + tip;
  const bodyBottom = h / 2 - eraser - ferrule;
  return (
    <g>
      <path d={`M${x} ${bodyTop} L0 ${top} L${-x} ${bodyTop} Z`} fill="#f3d6a8" stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M${x * 0.36} ${top + tip * 0.36} L0 ${top} L${-x * 0.36} ${top + tip * 0.36} Z`} fill="#5a5048" />
      <rect x={x} y={bodyTop} width={bw} height={bodyBottom - bodyTop} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-bw / 6} y={bodyTop} width={bw / 3} height={bodyBottom - bodyTop} fill={shade(color, 0.28)} />
      <rect x={x} y={bodyBottom} width={bw} height={ferrule} fill="#d6d9dc" stroke={OUTLINE} strokeWidth={SW} />
      <line x1={x} x2={-x} y1={bodyBottom + ferrule / 2} y2={bodyBottom + ferrule / 2} stroke="#aeb3b8" strokeWidth={1.5} />
      <rect x={x} y={bodyBottom + ferrule} width={bw} height={eraser} rx={4} fill="#f3a1a6" stroke={OUTLINE} strokeWidth={SW} />
    </g>
  );
}

function Pen({ w, h, color = "#7fa7e0" }: ArtProps) {
  const bw = Math.min(w, 22) * 0.86;
  const x = -bw / 2;
  const top = -h / 2;
  const cap = h * 0.3;
  const tip = Math.min(h * 0.08, 14);
  const bottom = h / 2 - tip;
  return (
    <g>
      <rect x={x} y={top + cap - 4} width={bw} height={bottom - top - cap + 4} rx={3} fill={shade(color, 0.72)} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={x} y={bottom - h * 0.16} width={bw} height={h * 0.13} fill={shade(color, -0.08)} stroke={OUTLINE} strokeWidth={SW} />
      <path d={`M${x + 1} ${bottom} L${-x - 1} ${bottom} L${bw * 0.12} ${h / 2} L${-bw * 0.12} ${h / 2} Z`} fill="#c9ccd0" stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      <rect x={x} y={top} width={bw} height={cap} rx={bw / 2} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-x - 3} y={top + 6} width={4} height={cap + 10} rx={2} fill={shade(color, -0.25)} />
      <rect x={x + 3} y={top + 6} width={3} height={cap - 14} rx={1.5} fill="#fff" opacity={0.45} />
    </g>
  );
}

function Eraser({ w, h, color = "#f6b8a6" }: ArtProps) {
  return (
    <g>
      <rect x={-w / 2} y={-h / 2 + 4} width={w} height={h - 4} rx={9} fill={shade(color, -0.18)} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h - 4} rx={9} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={w * 0.02} y={-h / 2} width={w * 0.48} height={h - 4} rx={8} fill="#a9cdef" stroke={OUTLINE} strokeWidth={SW} />
      <rect x={w * 0.12} y={-h / 2 + 7} width={w * 0.26} height={4} rx={2} fill="#fff" opacity={0.7} />
    </g>
  );
}

function Ruler({ w, h, color = "#f7dfa8" }: ArtProps) {
  const ticks: ReactElement[] = [];
  const step = 9;
  for (let i = 0, x = -w / 2 + 10; x < w / 2 - 6; i++, x += step) {
    const len = i % 5 === 0 ? h * 0.42 : h * 0.22;
    ticks.push(<line key={i} x1={x} x2={x} y1={-h / 2} y2={-h / 2 + len} stroke={shade(color, -0.5)} strokeWidth={1.5} strokeLinecap="round" />);
  }
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={5} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2 + 3} y={h * 0.14} width={w - 6} height={h * 0.26} rx={3} fill={shade(color, -0.07)} />
      {ticks}
    </g>
  );
}

function Scissors({ w, h, color = "#8fc9e8" }: ArtProps) {
  const pivotY = h * 0.04;
  const top = -h / 2 + 3;
  const bw = w * 0.13;
  const ringRx = w * 0.2;
  const ringRy = h * 0.14;
  const ringY = h / 2 - ringRy - 5;
  return (
    <g>
      <path d={`M${-bw} ${pivotY + 6} L${-w * 0.2} ${top + 6} Q${-w * 0.17} ${top - 2} ${-w * 0.08} ${top + 4} L${bw} ${pivotY}`} fill="#e3e8ec" stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M${bw} ${pivotY + 6} L${w * 0.2} ${top + 6} Q${w * 0.17} ${top - 2} ${w * 0.08} ${top + 4} L${-bw} ${pivotY}`} fill="#f2f5f7" stroke={OUTLINE} strokeWidth={SW} strokeLinejoin="round" />
      <path d={`M${-w * 0.06} ${pivotY} L${-w * 0.24} ${ringY - ringRy + 4}`} stroke={color} strokeWidth={w * 0.14} strokeLinecap="round" />
      <path d={`M${w * 0.06} ${pivotY} L${w * 0.24} ${ringY - ringRy + 4}`} stroke={shade(color, -0.1)} strokeWidth={w * 0.14} strokeLinecap="round" />
      <ellipse cx={-w * 0.25} cy={ringY} rx={ringRx} ry={ringRy} fill="none" stroke={color} strokeWidth={w * 0.13} />
      <ellipse cx={w * 0.25} cy={ringY} rx={ringRx} ry={ringRy} fill="none" stroke={shade(color, -0.1)} strokeWidth={w * 0.13} />
      <ellipse cx={-w * 0.25} cy={ringY} rx={ringRx + w * 0.065} ry={ringRy + w * 0.065} fill="none" stroke={OUTLINE} strokeWidth={1.4} />
      <ellipse cx={w * 0.25} cy={ringY} rx={ringRx + w * 0.065} ry={ringRy + w * 0.065} fill="none" stroke={OUTLINE} strokeWidth={1.4} />
      <circle cx={0} cy={pivotY + 2} r={w * 0.07} fill="#b7bec5" stroke={OUTLINE} strokeWidth={1.5} />
    </g>
  );
}

function StickyNotes({ w, h, color = "#fbe38e" }: ArtProps) {
  const s = Math.min(w, h) - 6;
  const fold = s * 0.24;
  return (
    <g>
      <rect x={-s / 2 + 5} y={-s / 2 + 5} width={s} height={s} rx={3} fill={shade(color, -0.12)} stroke={OUTLINE} strokeWidth={1.5} transform="rotate(5)" />
      <path
        d={`M${-s / 2} ${-s / 2} H${s / 2} V${s / 2 - fold} L${s / 2 - fold} ${s / 2} H${-s / 2} Z`}
        fill={color}
        stroke={OUTLINE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d={`M${s / 2} ${s / 2 - fold} L${s / 2 - fold} ${s / 2 - fold} L${s / 2 - fold} ${s / 2} Z`} fill={shade(color, -0.2)} stroke={OUTLINE} strokeWidth={1.5} strokeLinejoin="round" />
      <rect x={-s / 2} y={-s / 2} width={s} height={s * 0.16} fill={shade(color, -0.06)} />
      {[0.12, 0.3].map((t) => (
        <line key={t} x1={-s * 0.32} x2={s * 0.2} y1={-s / 2 + s * (0.35 + t)} y2={-s / 2 + s * (0.35 + t)} stroke={shade(color, -0.3)} strokeWidth={2} strokeLinecap="round" />
      ))}
    </g>
  );
}

function Notebook({ w, h, color = "#b9a6e8", accent = "#f6efe0" }: ArtProps) {
  const rings: ReactElement[] = [];
  for (let y = -h / 2 + 18; y < h / 2 - 10; y += 20) {
    rings.push(<rect key={y} x={-w / 2 - 6} y={y} width={16} height={7} rx={3.5} fill="#e8eaed" stroke={OUTLINE} strokeWidth={1.5} />);
  }
  return (
    <g>
      <rect x={-w / 2 + 4} y={-h / 2 + 5} width={w - 2} height={h - 2} rx={10} fill="#fffaf0" stroke={OUTLINE} strokeWidth={1.5} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w * 0.25} y={-h * 0.3} width={w * 0.6} height={h * 0.2} rx={6} fill={accent} stroke={OUTLINE} strokeWidth={1.5} />
      <line x1={-w * 0.17} x2={w * 0.27} y1={-h * 0.23} y2={-h * 0.23} stroke={shade(color, -0.25)} strokeWidth={3} strokeLinecap="round" />
      <line x1={-w * 0.17} x2={w * 0.15} y1={-h * 0.16} y2={-h * 0.16} stroke={shade(color, -0.1)} strokeWidth={3} strokeLinecap="round" />
      <rect x={w * 0.36} y={-h / 2} width={9} height={h} fill={shade(color, -0.25)} />
      {rings}
    </g>
  );
}

function Stapler({ w, h, color = "#9fd8c4" }: ArtProps) {
  const baseH = h * 0.3;
  return (
    <g>
      <rect x={-w / 2} y={h / 2 - baseH} width={w} height={baseH} rx={baseH / 2} fill="#7b8089" stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2 + 10} y={-h / 2 + h * 0.48} width={w - 22} height={h * 0.18} rx={4} fill="#5b6068" />
      <path
        d={`M${-w / 2 + 2} ${-h / 2 + h * 0.5} Q${-w / 2 + 2} ${-h / 2} ${-w / 2 + 30} ${-h / 2} H${w / 2 - 22} Q${w / 2} ${-h / 2} ${w / 2} ${-h / 2 + h * 0.36} V${-h / 2 + h * 0.56} H${-w / 2 + 2} Z`}
        fill={color}
        stroke={OUTLINE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <rect x={-w / 2 + 34} y={-h / 2 + 7} width={w * 0.45} height={5} rx={2.5} fill="#fff" opacity={0.55} />
      <circle cx={-w / 2 + 16} cy={-h / 2 + h * 0.5} r={6} fill="#d6d9dc" stroke={OUTLINE} strokeWidth={1.5} />
    </g>
  );
}

const CLIP_PATH = "M10 30 V9 a3.5 3.5 0 0 0 -7 0 V38 a6 6 0 0 0 12 0 V5 a5 5 0 0 0 -10 0";

function PaperClips({ w, h }: ArtProps) {
  const clips: [number, number, number, string][] = [
    [-w * 0.32, -h * 0.05, 96, "#a28fd8"],
    [-w * 0.1, -h * 0.28, 72, "#6fbfa4"],
    [w * 0.08, -h * 0.02, 104, "#e8917a"],
  ];
  return (
    <g>
      <ellipse cx={0} cy={h * 0.12} rx={w * 0.48} ry={h * 0.36} fill="#000" opacity={0.06} />
      {clips.map(([x, y, rot, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot}) translate(-9 -22)`}>
          <path d={CLIP_PATH} fill="none" stroke={shade(c, -0.3)} strokeWidth={4.4} strokeLinecap="round" />
          <path d={CLIP_PATH} fill="none" stroke={c} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

function Book({ w, h, color = "#9fc7a8", accent = "#f4ecd8" }: ArtProps) {
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2 + 2} y={-h / 2 + 2} width={5} height={h - 4} rx={2} fill={shade(color, -0.15)} />
      <rect x={-w / 2} y={-h / 2 + h * 0.08} width={w} height={6} fill={accent} opacity={0.9} />
      <rect x={-w / 2} y={h / 2 - h * 0.08 - 6} width={w} height={6} fill={accent} opacity={0.9} />
      <rect x={-w * 0.22} y={-h * 0.2} width={w * 0.44} height={h * 0.34} rx={3} fill={accent} opacity={0.85} />
      <line x1={0} x2={0} y1={-h * 0.15} y2={h * 0.09} stroke={shade(color, -0.35)} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

function Plant({ w, h, color = "#e7a07c" }: ArtProps) {
  const potTop = h * 0.08;
  const leaves: [number, number, number, string][] = [
    [-34, 46, -40, "#7fbf93"],
    [34, 46, 40, "#7fbf93"],
    [-16, 56, -14, "#93cfa3"],
    [16, 56, 16, "#6fae86"],
    [0, 60, 0, "#a6dcb0"],
    [-44, 36, -62, "#6fae86"],
    [44, 36, 62, "#93cfa3"],
  ];
  return (
    <g>
      {leaves.map(([dx, len, rot, c], i) => (
        <ellipse
          key={i}
          cx={0}
          cy={-len}
          rx={len * 0.32}
          ry={len}
          fill={c}
          stroke={OUTLINE}
          strokeWidth={1.5}
          transform={`translate(${dx * 0.3} ${potTop}) rotate(${rot})`}
        />
      ))}
      <path
        d={`M${-w * 0.3} ${potTop} H${w * 0.3} L${w * 0.23} ${h / 2} H${-w * 0.23} Z`}
        fill={color}
        stroke={OUTLINE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <rect x={-w * 0.34} y={potTop - 4} width={w * 0.68} height={16} rx={5} fill={shade(color, -0.12)} stroke={OUTLINE} strokeWidth={SW} />
      <path d={`M${-w * 0.12} ${h * 0.3} q${w * 0.12} -10 ${w * 0.24} 0`} fill="none" stroke={shade(color, 0.35)} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

function PhotoFrame({ w, h, color = "#c8a27a" }: ArtProps) {
  const m = 12;
  const p = 22;
  const iw = w - p * 2;
  const ih = h - p * 2;
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={8} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2 + m} y={-h / 2 + m} width={w - m * 2} height={h - m * 2} rx={4} fill="#fdf8ef" />
      <svg x={-iw / 2} y={-ih / 2} width={iw} height={ih} viewBox="0 0 100 100" preserveAspectRatio="none" overflow="hidden">
        <rect width="100" height="100" fill="#cfe4f5" />
        <circle cx="72" cy="28" r="12" fill="#f6dc8c" />
        <path d="M0 78 L30 42 L52 66 L68 50 L100 82 V100 H0 Z" fill="#b9a6e8" />
        <path d="M0 88 Q50 70 100 90 V100 H0 Z" fill="#9fd8a4" />
      </svg>
      <rect x={-iw / 2} y={-ih / 2} width={iw} height={ih} fill="none" stroke={OUTLINE} strokeWidth={1.2} />
    </g>
  );
}

function Cable({ w, h, color = "#f7f3ea" }: ArtProps) {
  const r = Math.min(w, h) * 0.32;
  const loops: [number, number, number][] = [
    [-4, -2, r],
    [3, 3, r * 0.92],
    [0, -5, r * 0.84],
  ];
  return (
    <g>
      {loops.map(([dx, dy, rr], i) => (
        <circle key={`o${i}`} cx={dx} cy={dy} r={rr} fill="none" stroke={OUTLINE} strokeWidth={9} />
      ))}
      {loops.map(([dx, dy, rr], i) => (
        <circle key={`i${i}`} cx={dx} cy={dy} r={rr} fill="none" stroke={color} strokeWidth={6} />
      ))}
      <path d={`M${r * 0.6} ${r * 0.75} Q${w * 0.36} ${h * 0.3} ${w * 0.34} ${h * 0.38}`} fill="none" stroke={OUTLINE} strokeWidth={9} strokeLinecap="round" />
      <path d={`M${r * 0.6} ${r * 0.75} Q${w * 0.36} ${h * 0.3} ${w * 0.34} ${h * 0.38}`} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
      <rect x={w * 0.24} y={h * 0.32} width={22} height={16} rx={4} fill={color} stroke={OUTLINE} strokeWidth={SW} transform={`rotate(-30 ${w * 0.35} ${h * 0.4})`} />
      <rect x={w * 0.36} y={h * 0.25} width={10} height={6} rx={1.5} fill="#b7bec5" transform={`rotate(-30 ${w * 0.35} ${h * 0.4})`} />
    </g>
  );
}

function Watch({ w, h, color = "#9fd8c4" }: ArtProps) {
  const sw = w * 0.5;
  const r = w * 0.36;
  return (
    <g>
      <rect x={-sw / 2} y={-h / 2} width={sw} height={h} rx={10} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      {[0.3, 0.38].map((t) => (
        <circle key={t} cx={0} cy={h * t} r={2.5} fill={shade(color, -0.35)} />
      ))}
      <rect x={r - 2} y={-5} width={8} height={10} rx={2} fill="#c9ccd0" stroke={OUTLINE} strokeWidth={1.5} />
      <circle cx={0} cy={0} r={r} fill="#e6e9ec" stroke={OUTLINE} strokeWidth={SW} />
      <circle cx={0} cy={0} r={r - 5} fill="#fffdf8" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1={0} x2={0} y1={-(r - 7)} y2={-(r - 11)} stroke="#8a8f96" strokeWidth={2} strokeLinecap="round" transform={`rotate(${a})`} />
      ))}
      <line x1={0} y1={0} x2={0} y2={-(r - 13)} stroke="#4a4036" strokeWidth={2.5} strokeLinecap="round" transform="rotate(-50)" />
      <line x1={0} y1={0} x2={0} y2={-(r - 9)} stroke="#4a4036" strokeWidth={2} strokeLinecap="round" transform="rotate(60)" />
      <circle cx={0} cy={0} r={2.5} fill="#e8917a" />
    </g>
  );
}

function Key({ x, y, rot, fill }: { x: number; y: number; rot: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 -4 H52 V0 H48 V5 H43 V0 H39 V4 H34 V0 H0 Z" fill={fill} stroke={OUTLINE} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={-6} cy={-2} r={12} fill={fill} stroke={OUTLINE} strokeWidth={1.5} />
      <circle cx={-10} cy={-2} r={3.5} fill="#fbf5ec" stroke={OUTLINE} strokeWidth={1} />
    </g>
  );
}

function Keys({ w, h, color = "#f2c75c" }: ArtProps) {
  const ringX = -w * 0.3;
  return (
    <g>
      <Key x={ringX + 18} y={-6} rot={-14} fill="#d7dde2" />
      <Key x={ringX + 18} y={10} rot={18} fill={color} />
      <circle cx={ringX} cy={0} r={13} fill="none" stroke={OUTLINE} strokeWidth={6} />
      <circle cx={ringX} cy={0} r={13} fill="none" stroke="#c9ccd0" strokeWidth={3.5} />
      <rect x={-w / 2 + 2} y={h * 0.08} width={20} height={26} rx={7} fill="#f6b8a6" stroke={OUTLINE} strokeWidth={1.5} transform={`rotate(20 ${-w / 2 + 12} ${h * 0.2})`} />
    </g>
  );
}

function Earbuds({ w, h, color = "#fbfaf7" }: ArtProps) {
  const s = Math.min(w, h) * 0.86;
  return (
    <g>
      <rect x={-s / 2} y={-s / 2 + 3} width={s} height={s} rx={s * 0.32} fill="#000" opacity={0.08} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.32} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <path d={`M${-s / 2 + 2} ${-s * 0.12} H${s / 2 - 2}`} stroke={OUTLINE} strokeWidth={1.4} />
      <circle cx={0} cy={s * 0.14} r={3} fill="#6fbfa4" />
      <rect x={-s * 0.28} y={-s * 0.4} width={s * 0.3} height={5} rx={2.5} fill="#fff" opacity={0.9} />
    </g>
  );
}

function Can({ w, h, color = "#e98a7e" }: ArtProps) {
  const rim = Math.min(12, h * 0.13);
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={7} fill="#d9dde0" stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2} y={-h / 2 + rim} width={w} height={h - rim * 2} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={-w / 2 + w * t} x2={-w / 2 + w * t} y1={-h / 2 + 2} y2={-h / 2 + rim - 2} stroke="#b7bec5" strokeWidth={1.2} />
      ))}
      <circle cx={0} cy={0} r={w * 0.24} fill="#fffaf0" stroke={OUTLINE} strokeWidth={1.4} />
      <path d={`M${-w * 0.08} ${w * 0.08} Q0 ${-w * 0.16} ${w * 0.1} ${-w * 0.06} Q${w * 0.02} ${w * 0.02} ${-w * 0.08} ${w * 0.08} Z`} fill={shade(color, -0.1)} />
      <rect x={-w / 2 + 6} y={-h / 2 + rim + 4} width={5} height={h - rim * 2 - 8} rx={2.5} fill="#fff" opacity={0.3} />
    </g>
  );
}

function Jar({ w, h, color = "#f2c75c" }: ArtProps) {
  const lid = h * 0.17;
  const bodyTop = -h / 2 + lid - 2;
  return (
    <g>
      <rect x={-w / 2 + 2} y={bodyTop} width={w - 4} height={h / 2 - bodyTop} rx={14} fill="#eef5f7" stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2 + 6} y={bodyTop + h * 0.14} width={w - 12} height={h / 2 - bodyTop - h * 0.14 - 4} rx={10} fill={color} />
      <rect x={-w / 2 + 2} y={-h * 0.02} width={w - 4} height={h * 0.26} fill="#fffaf0" stroke={OUTLINE} strokeWidth={1.4} />
      <rect x={-w / 2 + 2} y={h * 0.18} width={w - 4} height={4} fill={shade(color, -0.2)} />
      <rect x={-w / 2} y={-h / 2} width={w} height={lid} rx={5} fill={shade(color, -0.28)} stroke={OUTLINE} strokeWidth={SW} />
      {[0.2, 0.4, 0.6, 0.8].map((t) => (
        <line key={t} x1={-w / 2 + w * t} x2={-w / 2 + w * t} y1={-h / 2 + 3} y2={-h / 2 + lid - 3} stroke={shade(color, -0.45)} strokeWidth={1.2} />
      ))}
      <rect x={-w / 2 + 8} y={bodyTop + 8} width={5} height={h * 0.3} rx={2.5} fill="#fff" opacity={0.6} />
    </g>
  );
}

function CerealBox({ w, h, color = "#f2b277", accent = "#fbe38e" }: ArtProps) {
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2} y={-h / 2} width={w} height={10} fill={shade(color, -0.15)} />
      <rect x={-w / 2 + 8} y={-h / 2 + 20} width={w - 16} height={h * 0.18} rx={6} fill={accent} stroke={OUTLINE} strokeWidth={1.4} />
      <rect x={-w * 0.28} y={-h / 2 + 20 + h * 0.06} width={w * 0.56} height={5} rx={2.5} fill={shade(color, -0.35)} />
      {[[-12, 18], [4, 14], [14, 22], [-2, 26], [-16, 28]].map(([x, y], i) => (
        <circle key={i} cx={x * (w / 100)} cy={y} r={5} fill={i % 2 ? "#f6dc8c" : "#f2a7b8"} />
      ))}
      <path d={`M${-w * 0.34} ${h * 0.16} H${w * 0.34} Q${w * 0.3} ${h * 0.36} 0 ${h * 0.37} Q${-w * 0.3} ${h * 0.36} ${-w * 0.34} ${h * 0.16} Z`} fill="#fffdf8" stroke={OUTLINE} strokeWidth={1.5} />
      <rect x={w / 2 - 9} y={-h / 2 + 10} width={6} height={h - 14} fill={shade(color, -0.1)} opacity={0.8} />
    </g>
  );
}

function PastaBox({ w, h, color = "#8db8e2", accent = "#f6e7a8" }: ArtProps) {
  const ww = w * 0.62;
  const wh = h * 0.42;
  const pasta: [number, number, number][] = [
    [-10, -10, 30], [6, -14, -20], [-4, 4, 60], [10, 8, 10], [-12, 18, -40], [6, 22, 40],
  ];
  return (
    <g>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={color} stroke={OUTLINE} strokeWidth={SW} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h * 0.16} fill={accent} stroke={OUTLINE} strokeWidth={1.4} />
      <rect x={-ww / 2} y={-wh / 2 + h * 0.06} width={ww} height={wh} rx={ww / 2.6} fill="#fffaf0" stroke={OUTLINE} strokeWidth={1.5} />
      <g transform={`translate(0 ${h * 0.06})`}>
        {pasta.map(([x, y, r], i) => (
          <rect key={i} x={x * (w / 80) - 7} y={y * (h / 150) - 3} width={14} height={6} rx={3} fill="#f3d98b" stroke="#d9b866" strokeWidth={1} transform={`rotate(${r} ${x * (w / 80)} ${y * (h / 150)})`} />
        ))}
      </g>
      <rect x={-w * 0.3} y={h * 0.36} width={w * 0.6} height={6} rx={3} fill={shade(color, -0.3)} />
    </g>
  );
}

const ART: Record<ArtKind, (p: ArtProps) => ReactElement> = {
  pencil: Pencil,
  pen: Pen,
  eraser: Eraser,
  ruler: Ruler,
  scissors: Scissors,
  "sticky-notes": StickyNotes,
  notebook: Notebook,
  stapler: Stapler,
  "paper-clips": PaperClips,
  book: Book,
  plant: Plant,
  "photo-frame": PhotoFrame,
  cable: Cable,
  watch: Watch,
  keys: Keys,
  earbuds: Earbuds,
  can: Can,
  jar: Jar,
  "cereal-box": CerealBox,
  "pasta-box": PastaBox,
};

export const ObjectArt = memo(function ObjectArt({ kind, ...props }: ArtProps & { kind: ArtKind }) {
  const Art = ART[kind];
  return <Art {...props} />;
});
