"use client";

import { memo, useId, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Evaluation, GameEvent, LevelDef, ObjectDef, Objects, ObjectStatus, Vec } from "@/types/game";
import { clampCenter, footprint, normalizeAngle } from "@/lib/game/geometry";
import { accepts, boardRect, findTargetAt } from "@/lib/game/placement";
import type { Hint } from "@/lib/game/hints";
import { ObjectArt } from "@/components/objects/ObjectArt";
import { Fixture, SceneBackground } from "./Scene";

export interface BoardProps {
  level: LevelDef;
  objects: Objects;
  evaluation?: Evaluation;
  /** Static boards (thumbnails, completion view) ignore input. */
  interactive?: boolean;
  selectedId?: string | null;
  hint?: Hint | null;
  event?: GameEvent | null;
  celebrate?: boolean;
  label: string;
  className?: string;
  onPickUp?: (id: string) => void;
  onDrop?: (id: string, center: Vec, pointer: Vec) => void;
  onSelect?: (id: string | null) => void;
  onPlace?: (id: string, targetId: string, point?: Vec) => void;
  onRotate?: (id: string) => void;
}

interface Drag {
  id: string;
  pointerId: number;
  offset: Vec;
  startClient: Vec;
  moved: boolean;
  pos: Vec;
}

const TAP_SLOP_PX = 6;
const DOUBLE_TAP_MS = 320;
const MIN_HIT = 56; // board units: thin objects still get a finger-sized grab area
const NUDGE = 20;

/** Unwrap angles so a 350° → 0° change animates +10°, not −350°. */
function unwrapAngles(prev: Record<string, number>, objects: Objects): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [id, o] of Object.entries(objects)) {
    const last = prev[id];
    if (last === undefined) {
      next[id] = o.rotation;
      continue;
    }
    let delta = normalizeAngle(o.rotation) - normalizeAngle(last);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    next[id] = last + delta;
  }
  return next;
}

function describe(def: ObjectDef, status: ObjectStatus | undefined, where: string | null): string {
  if (!status || status.status === "loose") return `${def.label}, not placed yet`;
  if (status.status === "ok") return `${def.label}, correctly placed in the ${where}`;
  return `${def.label}, in the ${where}: ${status.message}`;
}

export const Board = memo(function Board({
  level,
  objects,
  evaluation,
  interactive = false,
  selectedId = null,
  hint = null,
  event = null,
  celebrate = false,
  label,
  className = "",
  onPickUp,
  onDrop,
  onSelect,
  onPlace,
  onRotate,
}: BoardProps) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  const [drag, setDrag] = useState<{ id: string; pos: Vec } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);

  // Track unwrapped display angles (derived state, updated during render when objects change).
  const [angleSource, setAngleSource] = useState(objects);
  const [angles, setAngles] = useState(() => unwrapAngles({}, objects));
  if (angleSource !== objects) {
    setAngleSource(objects);
    setAngles(unwrapAngles(angles, objects));
  }

  const defs = level.objects;
  const defById = new Map(defs.map((d) => [d.id, d]));
  const targetById = new Map(level.targets.map((t) => [t.id, t]));

  function toBoard(clientX: number, clientY: number): Vec {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }

  function dragCenter(d: Drag, p: Vec): Vec {
    const def = defById.get(d.id)!;
    const fp = footprint(def.w, def.h, objects[d.id].rotation);
    return clampCenter({ x: p.x - d.offset.x, y: p.y - d.offset.y }, fp, boardRect(level));
  }

  function handlePointerDown(e: ReactPointerEvent, id: string) {
    if (!interactive || dragRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const p = toBoard(e.clientX, e.clientY);
    const o = objects[id];
    dragRef.current = {
      id,
      pointerId: e.pointerId,
      offset: { x: p.x - o.x, y: p.y - o.y },
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
      pos: { x: o.x, y: o.y },
    };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startClient.x, e.clientY - d.startClient.y) < TAP_SLOP_PX) return;
      d.moved = true;
      onPickUp?.(d.id);
    }
    const p = toBoard(e.clientX, e.clientY);
    d.pos = dragCenter(d, p);
    setDrag({ id: d.id, pos: d.pos });
    const t = findTargetAt(level, p) ?? findTargetAt(level, d.pos);
    setHoverTarget(t ? t.id : null);
  }

  function endDrag(e: ReactPointerEvent, cancelled: boolean) {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    setDrag(null);
    setHoverTarget(null);
    if (cancelled) return;
    if (d.moved) {
      onDrop?.(d.id, d.pos, toBoard(e.clientX, e.clientY));
      return;
    }
    // A tap: select / deselect, or double tap to rotate.
    const now = performance.now();
    if (lastTap.current && lastTap.current.id === d.id && now - lastTap.current.t < DOUBLE_TAP_MS) {
      lastTap.current = null;
      onRotate?.(d.id);
      onSelect?.(d.id);
      return;
    }
    lastTap.current = { id: d.id, t: now };
    onSelect?.(selectedId === d.id ? null : d.id);
  }

  function handleObjectKey(e: KeyboardEvent, id: string) {
    const o = objects[id];
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault();
        onSelect?.(selectedId === id ? null : id);
        break;
      case "r":
      case "R":
        e.preventDefault();
        onRotate?.(id);
        break;
      case "Escape":
        onSelect?.(null);
        break;
      case "ArrowUp":
      case "ArrowDown":
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault();
        const dx = e.key === "ArrowLeft" ? -NUDGE : e.key === "ArrowRight" ? NUDGE : 0;
        const dy = e.key === "ArrowUp" ? -NUDGE : e.key === "ArrowDown" ? NUDGE : 0;
        const c = { x: o.x + dx, y: o.y + dy };
        onDrop?.(id, c, c);
        break;
      }
    }
  }

  const activeId = drag?.id ?? selectedId;
  const activeDef = activeId ? defById.get(activeId) : undefined;
  const validTargets = activeDef ? level.targets.filter((t) => accepts(t, activeDef)) : [];

  // Layering: objects inside cups sit behind the cup's front wall; everything else on top.
  const order = Object.keys(objects).sort((a, b) => objects[a].z - objects[b].z);
  const isBehindFront = (id: string) => {
    const tid = objects[id].targetId;
    return !!tid && targetById.get(tid)?.fixture === "cup" && drag?.id !== id;
  };
  const back = order.filter((id) => isBehindFront(id));
  const placedFront = order.filter((id) => !isBehindFront(id) && objects[id].targetId && drag?.id !== id);
  const loose = order.filter((id) => !objects[id].targetId && drag?.id !== id);

  const placedEvent = event?.type === "placed" ? event : null;
  const rejectedEvent = event?.type === "rejected" || event?.type === "rotate-blocked" ? event : null;

  function renderObject(id: string) {
    const def = defById.get(id)!;
    const o = objects[id];
    const isDragging = drag?.id === id;
    const pos = isDragging ? drag.pos : o;
    const angle = angles[id] ?? o.rotation;
    const selected = selectedId === id;
    const hitW = Math.max(def.w, MIN_HIT);
    const hitH = Math.max(def.h, MIN_HIT);
    const animClass =
      placedEvent?.objectId === id ? "snap-pop" : rejectedEvent?.objectId === id ? "nudge" : "";
    const animKey = animClass ? `${animClass}-${event?.nonce}` : "still";
    const status = evaluation?.objects[id];
    const where = o.targetId ? (targetById.get(o.targetId)?.label ?? null) : null;
    return (
      <g
        key={id}
        className={`obj${isDragging ? " dragging" : ""}${selected ? " selected" : ""}`}
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) rotate(${angle}deg)` }}
        {...(interactive
          ? {
              tabIndex: 0,
              role: "button",
              "aria-label": describe(def, status, where),
              "aria-pressed": selected,
              onPointerDown: (e: ReactPointerEvent) => handlePointerDown(e, id),
              onKeyDown: (e: KeyboardEvent) => handleObjectKey(e, id),
            }
          : { "aria-hidden": true })}
      >
        <g key={animKey} className={`obj-body ${animClass}`}>
          <rect x={-hitW / 2} y={-hitH / 2} width={hitW} height={hitH} fill="transparent" />
          {(isDragging || selected) && (
            <rect x={-def.w / 2 - 8} y={-def.h / 2 - 8} width={def.w + 16} height={def.h + 16} rx={14} fill="#7a64c4" opacity={0.12} />
          )}
          <g filter={interactive ? `url(#${uid}-${isDragging ? "lift" : "rest"})` : undefined}>
            <ObjectArt kind={def.kind} w={def.w} h={def.h} color={def.color} accent={def.accent} />
          </g>
          <rect
            className="focus-ring"
            x={-def.w / 2 - 6}
            y={-def.h / 2 - 6}
            width={def.w + 12}
            height={def.h + 12}
            rx={12}
            fill="none"
            stroke={selected ? "#7a64c4" : "transparent"}
            strokeWidth={selected ? 3 : 0}
            strokeDasharray={selected ? "7 5" : undefined}
          />
        </g>
      </g>
    );
  }

  function renderBadge(id: string) {
    const st = evaluation?.objects[id];
    if (!st || st.status === "loose" || drag?.id === id) return null;
    const def = defById.get(id)!;
    const o = objects[id];
    const fp = footprint(def.w, def.h, o.rotation);
    const x = Math.min(o.x + fp.w / 2 - 4, level.board.w - 16);
    const y = Math.max(o.y - fp.h / 2 + 4, 16);
    const ok = st.status === "ok";
    return (
      <g key={`b-${id}`} style={{ transform: `translate(${x}px, ${y}px)` }} className="obj" pointerEvents="none" aria-hidden>
        <g key={`${st.status}`} className="badge-in">
          <circle r={12} fill={ok ? "#3f9a78" : "#e08a68"} stroke="#fff" strokeWidth={3} />
          {ok ? (
            <path d="M-5 0.5 L-1.5 4 L5.5 -3.5" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M0 -5.5 V1.5 M0 5.5 V5.6" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
          )}
        </g>
      </g>
    );
  }

  const hintObj = hint ? objects[hint.objectId] : null;
  const hintDef = hint ? defById.get(hint.objectId) : null;
  const hintTarget = hint?.targetId ? targetById.get(hint.targetId) : null;
  const showTapTargets = interactive && !!selectedId && !drag;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${level.board.w} ${level.board.h}`}
      className={`board ${className}`}
      role={interactive ? "group" : "img"}
      aria-label={label}
      onPointerMove={interactive ? handlePointerMove : undefined}
      onPointerUp={interactive ? (e) => endDrag(e, false) : undefined}
      onPointerCancel={interactive ? (e) => endDrag(e, true) : undefined}
      onLostPointerCapture={interactive ? (e) => endDrag(e, true) : undefined}
    >
      {interactive && (
        <defs>
          <filter id={`${uid}-rest`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#4a4036" floodOpacity="0.2" />
          </filter>
          <filter id={`${uid}-lift`} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#4a4036" floodOpacity="0.28" />
          </filter>
          <linearGradient id={`${uid}-shine`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      <g onPointerDown={interactive ? () => onSelect?.(null) : undefined}>
        <SceneBackground level={level} />
      </g>
      {level.targets.map((t) => (
        <Fixture key={t.id} t={t} layer="back" />
      ))}

      {/* Valid drop zones while dragging or after selecting an object. */}
      {validTargets.map((t) => {
        const hovered = hoverTarget === t.id;
        return (
          <rect
            key={`v-${t.id}`}
            x={t.rect.x - 4}
            y={t.rect.y - 4}
            width={t.rect.w + 8}
            height={t.rect.h + 8}
            rx={14}
            fill={hovered ? "#3f9a78" : "#7a64c4"}
            fillOpacity={hovered ? 0.16 : 0.06}
            stroke={hovered ? "#3f9a78" : "#7a64c4"}
            strokeOpacity={0.75}
            strokeWidth={hovered ? 4 : 2.5}
            strokeDasharray={hovered ? undefined : "10 8"}
            pointerEvents="none"
          />
        );
      })}
      {drag && hoverTarget && !validTargets.some((t) => t.id === hoverTarget) && (() => {
        const t = targetById.get(hoverTarget)!;
        return <rect x={t.rect.x - 4} y={t.rect.y - 4} width={t.rect.w + 8} height={t.rect.h + 8} rx={14} fill="#e08a68" fillOpacity={0.12} stroke="#e08a68" strokeOpacity={0.6} strokeWidth={2.5} pointerEvents="none" />;
      })()}

      {back.map(renderObject)}
      {level.targets.map((t) => (
        <Fixture key={`f-${t.id}`} t={t} layer="front" />
      ))}
      {placedFront.map(renderObject)}

      {/* Tap-to-place: with an object selected, tapping (or pressing Enter on) a highlighted zone moves it there. */}
      {showTapTargets &&
        validTargets.map((t) => (
          <rect
            key={`tap-${t.id}`}
            x={t.rect.x - 4}
            y={t.rect.y - 4}
            width={t.rect.w + 8}
            height={t.rect.h + 8}
            rx={14}
            fill="transparent"
            className="cursor-pointer outline-none focus-visible:stroke-[#7a64c4] focus-visible:stroke-[4]"
            tabIndex={0}
            role="button"
            aria-label={`Place the ${activeDef?.label} in the ${t.label}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onPlace?.(selectedId!, t.id, toBoard(e.clientX, e.clientY))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPlace?.(selectedId!, t.id);
              }
            }}
          />
        ))}

      {loose.map(renderObject)}
      {order.map(renderBadge)}

      {/* Hint: pulse around the object and its suggested spot. */}
      {hint && hintObj && hintDef && (
        <g pointerEvents="none">
          {(() => {
            const fp = footprint(hintDef.w, hintDef.h, hintObj.rotation);
            return <rect className="pulse" x={hintObj.x - fp.w / 2 - 12} y={hintObj.y - fp.h / 2 - 12} width={fp.w + 24} height={fp.h + 24} rx={16} fill="none" stroke="#f2b84b" strokeWidth={5} />;
          })()}
          {hintTarget && (
            <rect className="pulse" x={hintTarget.rect.x - 8} y={hintTarget.rect.y - 8} width={hintTarget.rect.w + 16} height={hintTarget.rect.h + 16} rx={18} fill="#f6dc8c" fillOpacity={0.18} stroke="#f2b84b" strokeWidth={5} strokeDasharray="12 8" />
          )}
        </g>
      )}

      {/* Placement sparkle */}
      {placedEvent && objects[placedEvent.objectId] && (
        <g key={`sp-${placedEvent.nonce}`} pointerEvents="none" transform={`translate(${objects[placedEvent.objectId].x} ${objects[placedEvent.objectId].y})`}>
          <circle className="sparkle" r={34} fill="none" stroke="#fff" strokeWidth={5} />
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} className="sparkle" cx={Math.cos((a * Math.PI) / 180) * 44} cy={Math.sin((a * Math.PI) / 180) * 44} r={5} fill="#f6dc8c" />
          ))}
        </g>
      )}

      {drag && renderObject(drag.id)}

      {celebrate && interactive && (
        <g pointerEvents="none">
          <rect className="shine" x={0} y={0} width={level.board.w} height={level.board.h} fill={`url(#${uid}-shine)`} />
          {Array.from({ length: 18 }, (_, i) => {
            const colors = ["#b9a6e8", "#9fd8c4", "#f6b8a6", "#a9cdef", "#f6dc8c"];
            const x = 40 + ((i * 131) % (level.board.w - 80));
            const y = level.board.h - 40 - ((i * 53) % 200);
            return (
              <rect
                key={i}
                className="confetti"
                x={x}
                y={y}
                width={i % 3 ? 12 : 9}
                height={i % 3 ? 7 : 9}
                rx={i % 3 ? 2 : 4.5}
                fill={colors[i % colors.length]}
                style={{ animationDelay: `${(i % 6) * 90}ms` }}
              />
            );
          })}
        </g>
      )}
    </svg>
  );
});
