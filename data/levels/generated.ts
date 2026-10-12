import type { Environment, LevelDef, ObjectDef, Rect, Rule, TargetDef } from "@/types/game";
import { footprint } from "@/lib/game/geometry";

// Deterministic level generator for levels 6–100. Each level is built from a seeded RNG, so a given
// level number always produces the same puzzle. Difficulty `d` runs from 0 (level 6) to 1 (level 100).

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (r: Rng, a: number, b: number) => lerp(a, b, r());
function shuffle<T>(r: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Starting angle: either a gentle tilt (straightens itself) or a turned base that must be rotated. */
function startAngle(r: Rng, needsTurn: boolean, turns: number[] = [90, 180, 270]): number {
  const jitter = between(r, -9, 9);
  if (!needsTurn) return (360 + jitter) % 360;
  return (turns[Math.floor(r() * turns.length)] + jitter + 360) % 360;
}

type Draft = Omit<ObjectDef, "start"> & { rotation: number };

/** Lay objects out as a messy-but-reachable pile inside `region`, row by row. Overlap is allowed. */
function scatter(r: Rng, drafts: Draft[], region: Rect): ObjectDef[] {
  const items = shuffle(r, drafts).map((d) => ({ d, fp: footprint(d.w, d.h, d.rotation) }));
  const rows: (typeof items)[] = [[]];
  let width = 0;
  for (const it of items) {
    if (rows[rows.length - 1].length && width + it.fp.w > region.w * 1.15) {
      rows.push([]);
      width = 0;
    }
    rows[rows.length - 1].push(it);
    width += it.fp.w;
  }
  const out: ObjectDef[] = [];
  rows.forEach((row, ri) => {
    const cyBase = rows.length === 1 ? region.y + region.h / 2 : region.y + (region.h * (ri + 0.5)) / rows.length;
    const total = row.reduce((s, it) => s + it.fp.w, 0);
    const gap = row.length > 1 ? (region.w - total) / (row.length - 1) : 0;
    let x = row.length > 1 ? region.x : region.x + (region.w - total) / 2;
    for (const it of row) {
      const cx = Math.min(region.x + region.w - it.fp.w / 2, Math.max(region.x + it.fp.w / 2, x + it.fp.w / 2 + between(r, -6, 6)));
      const cy = Math.min(region.y + region.h - it.fp.h / 2, Math.max(region.y + it.fp.h / 2, cyBase + between(r, -14, 14)));
      x += it.fp.w + gap;
      const { rotation, ...def } = it.d;
      out.push({ ...def, start: { x: Math.round(cx), y: Math.round(cy), rotation: Math.round(rotation * 10) / 10 } });
    }
  });
  // Keep a stable definition order (hints walk objects in this order).
  return drafts.map((d) => out.find((o) => o.id === d.id)!);
}

const NAMES: Record<Environment, string[]> = {
  desk: ["Homework Desk", "Study Nook", "Studio Desk", "Office Corner", "Craft Table", "Writing Desk", "Planner Desk", "Sketch Desk"],
  bookshelf: ["Reading Nook", "Paperback Pile", "Cozy Shelf", "Book Club", "Rainy-Day Shelf", "Story Wall", "Attic Library", "Window Seat"],
  drawer: ["Junk Drawer", "Bedside Drawer", "Desk Drawer", "Hallway Drawer", "Gadget Drawer", "Weekend Drawer", "Travel Drawer", "Catch-All Drawer"],
  pantry: ["Snack Shelf", "Baking Cupboard", "Weekly Restock", "Soup Season", "Breakfast Shelf", "Market Haul", "Rainy-Day Pantry", "Picnic Prep"],
};

const BOARD = { w: 800, h: 860 };

// ---------------------------------------------------------------- Desk

const PENCIL_COLORS: [string, string][] = [["yellow", "#f6c85f"], ["green", "#9fd8a4"], ["blue", "#8db8e2"], ["red", "#e98a8a"]];
const PEN_COLORS: [string, string][] = [["pink", "#f2a7b8"], ["blue", "#7fa7e0"], ["purple", "#b392c9"], ["teal", "#7fc4bf"]];
const NOTE_COLORS: [string, string][] = [["yellow", "#fbe38e"], ["mint", "#bfe8d6"], ["peach", "#f9cbb7"]];
const ERASER_COLORS: [string, string][] = [["pink", "#f6b8a6"], ["lilac", "#cbbdf0"], ["white", "#f1ece4"]];

function deskLevel(r: Rng, d: number): Omit<LevelDef, "id" | "name"> {
  const nPencils = 2 + (d > 0.35 ? 1 : 0);
  const nPens = 2 + (d > 0.55 ? 1 : 0);
  const nErasers = 1 + (d > 0.45 ? 1 : 0);
  const nNotes = 1 + (d > 0.7 ? 1 : 0);
  const manualCups = d > 0.4; // pencils no longer stand themselves up
  const manualScissors = d > 0.65;
  const trayW = Math.round(lerp(412, 300, d));

  const targets: TargetDef[] = [
    { id: "pencil-cup", label: "pencil cup", tint: "#c9b8ef", rect: { x: 60, y: 76, w: 110, h: 214 }, layout: "row", fixture: "cup", justify: "center", gap: 8, accepts: { categories: ["pencils"] }, allowedRotations: [0], autoOrient: !manualCups },
    { id: "pen-cup", label: "pen cup", tint: "#a9dcc9", rect: { x: 190, y: 76, w: 110, h: 214 }, layout: "row", fixture: "cup", justify: "center", gap: 8, accepts: { categories: ["pens"] }, allowedRotations: [0], autoOrient: !manualCups },
    { id: "ruler-groove", label: "ruler groove", rect: { x: 330, y: 72, w: 300, h: 56 }, layout: "slot", fixture: "groove", accepts: { ids: ["ruler"] }, allowedRotations: [0, 180] },
    { id: "stapler-spot", label: "stapler spot", rect: { x: 330, y: 150, w: 170, h: 80 }, layout: "slot", fixture: "outline", accepts: { ids: ["stapler"] }, allowedRotations: [0], autoOrient: true, silhouette: { kind: "stapler", w: 150, h: 60, rotation: 0 } },
    { id: "clip-dish", label: "clip dish", tint: "#f6c9b8", rect: { x: 520, y: 150, w: 110, h: 80 }, layout: "slot", fixture: "tray", accepts: { ids: ["clips"] }, autoOrient: true, allowedRotations: [0, 180] },
    { id: "scissors-spot", label: "scissors outline", rect: { x: 650, y: 72, w: 92, h: 158 }, layout: "slot", fixture: "outline", accepts: { ids: ["scissors"] }, allowedRotations: manualScissors ? [0, 180] : [0], autoOrient: !manualScissors, silhouette: { kind: "scissors", w: 70, h: 150, rotation: 0 } },
    { id: "small-tray", label: "small-items tray", tint: "#bcd7f0", rect: { x: 330, y: 252, w: trayW, h: 96 }, layout: "free", fixture: "tray", accepts: { categories: ["small"] }, autoOrient: true, allowedRotations: [0, 90, 180, 270] },
    { id: "desk-mat", label: "desk mat", tint: "#a9cbb7", rect: { x: 540, y: 470, w: 220, h: 286 }, layout: "slot", fixture: "mat", accepts: { ids: ["notebook"] }, allowedRotations: [0] },
  ];

  const drafts: Draft[] = [];
  const solution: Record<string, string> = {};
  const add = (o: Draft, target: string) => {
    drafts.push(o);
    solution[o.id] = target;
  };
  const notebookColor = ["#b9a6e8", "#f2b07a", "#8db8e2", "#9fcf9a"][Math.floor(r() * 4)];
  add({ id: "notebook", kind: "notebook", label: "notebook", category: "paper", w: 190, h: 250, color: notebookColor, accent: "#f6efe0", rotation: startAngle(r, d > 0.5, [180]) }, "desk-mat");
  shuffle(r, PENCIL_COLORS).slice(0, nPencils).forEach(([name, color]) =>
    add({ id: `pencil-${name}`, kind: "pencil", label: `${name} pencil`, category: "pencils", w: 22, h: 190, color, rotation: manualCups ? startAngle(r, true, [90, 180, 270]) : between(r, 40, 140) }, "pencil-cup"),
  );
  shuffle(r, PEN_COLORS).slice(0, nPens).forEach(([name, color]) =>
    add({ id: `pen-${name}`, kind: "pen", label: `${name} pen`, category: "pens", w: 22, h: 180, color, rotation: manualCups ? startAngle(r, true, [90, 180, 270]) : between(r, 40, 140) }, "pen-cup"),
  );
  add({ id: "ruler", kind: "ruler", label: "ruler", category: "tools", w: 280, h: 40, color: "#f7dfa8", rotation: startAngle(r, true, [90, 270]) }, "ruler-groove");
  add({ id: "scissors", kind: "scissors", label: "scissors", category: "tools", w: 70, h: 150, color: ["#8fc9e8", "#f2a7b8", "#9fd8c4"][Math.floor(r() * 3)], rotation: manualScissors ? startAngle(r, true, [90, 270]) : between(r, 160, 220) }, "scissors-spot");
  add({ id: "stapler", kind: "stapler", label: "stapler", category: "tools", w: 150, h: 60, color: "#9fd8c4", rotation: between(r, 140, 200) }, "stapler-spot");
  add({ id: "clips", kind: "paper-clips", label: "paper clips", category: "clips", w: 74, h: 52, rotation: between(r, -10, 10) }, "clip-dish");
  shuffle(r, ERASER_COLORS).slice(0, nErasers).forEach(([name, color]) =>
    add({ id: `eraser-${name}`, kind: "eraser", label: `${name} eraser`, category: "small", w: 64, h: 36, color, rotation: between(r, -25, 25) }, "small-tray"),
  );
  shuffle(r, NOTE_COLORS).slice(0, nNotes).forEach(([name, color]) =>
    add({ id: `notes-${name}`, kind: "sticky-notes", label: `${name} sticky notes`, category: "small", w: 70, h: 70, color, rotation: between(r, -15, 15) }, "small-tray"),
  );

  const instructions = [
    "Pencils and pens each have their own cup; tools go in their outlines.",
    manualCups ? "Nothing stands itself up any more — rotate pencils and pens before they'll fit." : "Small bits share the tray — find room for each.",
    "Straighten the notebook on the desk mat.",
  ];
  return {
    environment: "desk",
    summary: `${drafts.length} things to tidy${manualCups ? ", rotation needed" : ""}.`,
    instructions,
    board: BOARD,
    targets,
    objects: scatter(r, drafts, { x: 16, y: 372, w: 500, h: 478 }),
    rules: [],
    solution,
  };
}

// ---------------------------------------------------------------- Bookshelf

const BOOK_COLORS: [string, string][] = [
  ["coral", "#e98a8a"], ["apricot", "#f2b07a"], ["butter", "#f2d77e"], ["sage", "#9fcf9a"], ["teal", "#7fc4bf"], ["sky", "#8db8e2"],
  ["navy", "#6f86b8"], ["lilac", "#b392c9"], ["rose", "#e89aae"], ["sand", "#d9bf94"], ["forest", "#7fae8a"], ["wine", "#b9707e"],
];
const RAINBOW: [string, string][] = [
  ["red", "#e98a8a"], ["orange", "#f2b07a"], ["yellow", "#f2d77e"], ["green", "#9fcf9a"], ["teal", "#7fc4bf"], ["blue", "#8db8e2"], ["purple", "#b392c9"], ["pink", "#e89aae"],
];
const ACCENTS = ["#fdf5e4", "#f6e7a8", "#7b5b4e", "#f4ecd8"];

type ShelfOrder = "height-asc" | "height-desc" | "rainbow" | "rainbow-desc";

function bookRow(
  r: Rng,
  d: number,
  opts: { prefix: string; category: string; noun: string; count: number; minH: number; maxH: number; order: ShelfOrder; targetId: string; shelfLabel: string },
): { drafts: Draft[]; rule: Rule } {
  const { count, order } = opts;
  const turnShare = lerp(0.15, 0.65, d);
  const drafts: Draft[] = [];
  if (order === "rainbow" || order === "rainbow-desc") {
    const start = Math.floor(r() * (RAINBOW.length - count + 1));
    const colors = RAINBOW.slice(start, start + count);
    colors.forEach(([name, color], i) => {
      drafts.push({
        id: `${opts.prefix}-${name}`, kind: "book", label: `${name} ${opts.noun}`, category: opts.category,
        w: Math.round(between(r, 38, 56)), h: Math.round(between(r, opts.minH, opts.maxH)), value: i + 1,
        color, accent: ACCENTS[Math.floor(r() * ACCENTS.length)], rotation: startAngle(r, r() < turnShare),
      });
    });
    const desc = order === "rainbow-desc";
    const first = colors[0][0];
    const last = colors[colors.length - 1][0];
    return {
      drafts,
      rule: { type: "order", targetId: opts.targetId, by: "value", direction: desc ? "desc" : "asc", label: `${cap(opts.shelfLabel)}: rainbow order, ${desc ? last : first} to ${desc ? first : last}` },
    };
  }
  // Height order: the closer the heights, the harder it is to judge by eye.
  const step = Math.min(lerp(22, 7, d), (opts.maxH - opts.minH) / count);
  const spanStart = between(r, opts.minH, Math.max(opts.minH, opts.maxH - step * count));
  const colors = shuffle(r, BOOK_COLORS).slice(0, count);
  colors.forEach(([name, color], i) => {
    drafts.push({
      id: `${opts.prefix}-${name}`, kind: "book", label: `${name} ${opts.noun}`, category: opts.category,
      w: Math.round(between(r, 38, 60)), h: Math.round(spanStart + i * step + r() * step * 0.3),
      color, accent: ACCENTS[Math.floor(r() * ACCENTS.length)], rotation: startAngle(r, r() < turnShare),
    });
  });
  const asc = order === "height-asc";
  return {
    drafts,
    rule: { type: "order", targetId: opts.targetId, by: "height", direction: asc ? "asc" : "desc", label: `${cap(opts.shelfLabel)}: ${asc ? "shortest to tallest" : "tallest to shortest"}` },
  };
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function bookshelfLevel(r: Rng, d: number): Omit<LevelDef, "id" | "name"> {
  const orders: ShelfOrder[] = d < 0.3 ? ["height-asc", "rainbow"] : ["height-asc", "height-desc", "rainbow", "rainbow-desc"];
  const pickOrder = () => orders[Math.floor(r() * orders.length)];
  const region = { x: 16, y: 618, w: 768, h: 232 };

  if (d < 0.35) {
    const count = 5 + Math.round(d * 6);
    const { drafts, rule } = bookRow(r, d, { prefix: "book", category: "books", noun: "book", count, minH: 140, maxH: 225, order: pickOrder(), targetId: "top-shelf", shelfLabel: "top shelf" });
    const targets: TargetDef[] = [
      { id: "top-shelf", label: "top shelf", rect: { x: 84, y: 92, w: 632, h: 236 }, layout: "row", fixture: "shelf", gap: 4, justify: "start", accepts: { categories: ["books"] }, allowedRotations: [0] },
      { id: "plant-spot", label: "plant spot", rect: { x: 130, y: 378, w: 170, h: 196 }, layout: "slot", fixture: "outline", accepts: { ids: ["plant"] }, autoOrient: true, allowedRotations: [0], silhouette: { kind: "plant", w: 140, h: 180, rotation: 0 } },
      { id: "frame-spot", label: "photo frame spot", rect: { x: 500, y: 410, w: 160, h: 164 }, layout: "slot", fixture: "outline", accepts: { ids: ["frame"] }, autoOrient: true, allowedRotations: [0], silhouette: { kind: "photo-frame", w: 130, h: 150, rotation: 0 } },
    ];
    const all: Draft[] = [
      ...drafts,
      { id: "plant", kind: "plant", label: "potted plant", category: "decor", w: 140, h: 180, rotatable: false, color: "#e7a07c", rotation: 0 },
      { id: "frame", kind: "photo-frame", label: "photo frame", category: "decor", w: 130, h: 150, color: "#c8a27a", rotation: between(r, -10, 10) },
    ];
    const solution: Record<string, string> = { plant: "plant-spot", frame: "frame-spot" };
    drafts.forEach((b) => (solution[b.id] = "top-shelf"));
    return {
      environment: "bookshelf",
      summary: `${count} books to line up.`,
      instructions: ["Stand every book upright on the top shelf.", `${rule.label} — drop a book between two others to slot it in.`, "The plant and frame have their own spots."],
      board: BOARD,
      targets,
      objects: scatter(r, all, region),
      rules: [rule],
      solution,
    };
  }

  const perShelf = 4 + Math.round(d * 3);
  const top = bookRow(r, d, { prefix: "pb", category: "paperbacks", noun: "paperback", count: perShelf, minH: 140, maxH: 186, order: pickOrder(), targetId: "top-shelf", shelfLabel: "top shelf" });
  const mid = bookRow(r, d, { prefix: "hc", category: "hardcovers", noun: "hardcover", count: perShelf - (d > 0.8 ? 0 : 1), minH: 192, maxH: 242, order: pickOrder(), targetId: "middle-shelf", shelfLabel: "middle shelf" });
  const targets: TargetDef[] = [
    { id: "top-shelf", label: "top shelf", rect: { x: 84, y: 92, w: 632, h: 196 }, layout: "row", fixture: "shelf", gap: 4, justify: "start", accepts: { categories: ["paperbacks"] }, allowedRotations: [0] },
    { id: "middle-shelf", label: "middle shelf", rect: { x: 84, y: 330, w: 632, h: 248 }, layout: "row", fixture: "shelf", gap: 4, justify: "start", accepts: { categories: ["hardcovers"] }, allowedRotations: [0] },
  ];
  const solution: Record<string, string> = {};
  top.drafts.forEach((b) => (solution[b.id] = "top-shelf"));
  mid.drafts.forEach((b) => (solution[b.id] = "middle-shelf"));
  const all = [...top.drafts, ...mid.drafts];
  return {
    environment: "bookshelf",
    summary: `${all.length} books, two sorted shelves.`,
    instructions: ["Paperbacks go on the top shelf, hardcovers on the middle shelf.", `${top.rule.label}.`, `${mid.rule.label}. Every book stands upright.`],
    board: BOARD,
    targets,
    objects: scatter(r, all, region),
    rules: [top.rule, mid.rule],
    solution,
  };
}

// ---------------------------------------------------------------- Drawer

const CELL = 40;

interface Comp {
  id: string;
  label: string;
  category: string;
  cols: number;
  rows: number;
  items: Draft[];
}

function drawerLevel(r: Rng, d: number): Omit<LevelDef, "id" | "name"> {
  const slack = d < 0.45 ? 1 : 0; // spare cells early on; exact-fit packing later
  const turnShare = lerp(0.2, 0.8, d);
  const tilt = () => startAngle(r, r() < turnShare, [90, 270]);

  const nWriting = 2 + (d > 0.25 ? 1 : 0) + (d > 0.7 ? 1 : 0);
  const writingKinds: [string, Draft["kind"], string][] = shuffle(r, [
    ["black pen", "pen", "#5b6170"], ["pencil", "pencil", "#f6c85f"], ["highlighter", "pen", "#b8e986"], ["red pen", "pen", "#e98a8a"], ["blue pencil", "pencil", "#8db8e2"],
  ]).slice(0, nWriting) as [string, Draft["kind"], string][];
  const writing: Comp = {
    id: "writing", label: "writing compartment", category: "writing", cols: 5 + slack, rows: nWriting,
    items: writingKinds.map(([label, kind, color]) => ({
      id: label.replace(/\s+/g, "-"), kind, label, category: "writing", w: 40, h: 200, color, rotation: startAngle(r, false) + between(r, -20, 20),
    })),
  };

  const nScissors = d > 0.6 ? 2 : 1;
  const tools: Comp = {
    id: "tools", label: "scissors compartment", category: "tools", cols: 4 + slack, rows: 2 * nScissors,
    items: Array.from({ length: nScissors }, (_, i) => ({
      id: `scissors-${i + 1}`, kind: "scissors" as const, label: i ? "small scissors" : "scissors", category: "tools", w: 80, h: 160,
      color: ["#f2a7b8", "#8fc9e8"][i], rotation: startAngle(r, false) + between(r, -15, 15),
    })),
  };

  const twoBuds = d > 0.75;
  const tech: Comp = {
    id: "tech", label: "tech compartment", category: "tech", cols: (twoBuds ? 5 : 3) + slack, rows: twoBuds ? 4 : 5,
    items: [
      { id: "cable", kind: "cable", label: "charging cable", category: "tech", w: 120, h: 120, color: "#f7f3ea", rotation: tilt() },
      { id: "earbuds", kind: "earbuds", label: "earbuds case", category: "tech", w: 80, h: 80, color: "#fbfaf7", rotation: tilt() },
      ...(twoBuds ? [{ id: "earbuds-2", kind: "earbuds" as const, label: "spare earbuds case", category: "tech", w: 80, h: 80, color: "#e8f4ef", rotation: tilt() }] : []),
    ],
  };

  const acc: Comp = {
    id: "accessories", label: "accessories compartment", category: "accessories", cols: 3 + slack, rows: 5,
    items: [
      { id: "watch", kind: "watch", label: "watch", category: "accessories", w: 80, h: 120, color: ["#9fd8c4", "#f6b8a6", "#b9a6e8"][Math.floor(r() * 3)], rotation: tilt() },
      { id: "keys", kind: "keys", label: "keys", category: "accessories", w: 120, h: 80, color: "#f2c75c", rotation: tilt() },
    ],
  };

  // Two rows of compartments, centred.
  const gap = 20;
  const rowsOfComps = [[writing, tools], [tech, acc]];
  const targets: TargetDef[] = [];
  let y = 72;
  for (const row of rowsOfComps) {
    const width = row.reduce((s, c) => s + c.cols * CELL, 0) + gap * (row.length - 1);
    let x = Math.round((BOARD.w - width) / 2);
    const height = Math.max(...row.map((c) => c.rows * CELL));
    for (const c of row) {
      targets.push({ id: c.id, label: c.label, rect: { x, y, w: c.cols * CELL, h: c.rows * CELL }, layout: "grid", cell: CELL, fixture: "compartment", accepts: { categories: [c.category] } });
      x += c.cols * CELL + gap;
    }
    y += height + gap;
  }
  const drawerBottom = y - gap + 32 + 30;
  const all = rowsOfComps.flat().flatMap((c) => c.items);
  const solution = Object.fromEntries(rowsOfComps.flat().flatMap((c) => c.items.map((i) => [i.id, c.id])));
  return {
    environment: "drawer",
    summary: `${all.length} items, ${slack ? "a little spare room" : "an exact fit"}.`,
    instructions: [
      "Each compartment holds one kind of thing: writing tools, scissors, tech, or accessories.",
      "Long items only fit lying sideways — rotate them first.",
      slack ? "Items snap to the grid and can't overlap." : "No spare room: every cell counts, so plan where the big pieces go.",
    ],
    board: BOARD,
    targets,
    objects: scatter(r, all, { x: 16, y: drawerBottom + 16, w: 768, h: BOARD.h - drawerBottom - 24 }),
    rules: [],
    solution,
  };
}

// ---------------------------------------------------------------- Pantry

const CANS: [string, string][] = [["tomato soup", "#e98a7e"], ["bean", "#9fcf9a"], ["corn", "#f2d77e"], ["coconut milk", "#efe6d2"], ["chickpea", "#e3c48f"], ["pea", "#a9c97a"]];
const JARS: [string, string][] = [["honey", "#f2c75c"], ["jam", "#c9739a"], ["pickle", "#a9c97a"], ["olive", "#8fa86b"], ["peanut butter", "#d9a46a"], ["salsa", "#e0816a"]];
const BOXES: [string, string, "cereal-box" | "pasta-box"][] = [
  ["cereal", "#f2b277", "cereal-box"], ["pasta", "#8db8e2", "pasta-box"], ["cracker", "#b9a6e8", "cereal-box"], ["oat", "#e7cf9a", "cereal-box"], ["rice", "#9fd8c4", "pasta-box"], ["tea", "#f2a7b8", "pasta-box"],
];

function pantryLevel(r: Rng, d: number): Omit<LevelDef, "id" | "name"> {
  const per = 2 + Math.round(d * 2);
  const turnShare = lerp(0.15, 0.6, d);
  const shortBoxes = d > 0.5; // short boxes fit any shelf, so height no longer gives the answer away
  const drafts: Draft[] = [];
  shuffle(r, CANS).slice(0, per).forEach(([name, color]) =>
    drafts.push({ id: `can-${slug(name)}`, kind: "can", label: `${name} can`, category: "cans", w: Math.round(between(r, 64, 76)), h: Math.round(between(r, 84, 100)), color, rotation: startAngle(r, r() < turnShare) }),
  );
  shuffle(r, JARS).slice(0, per).forEach(([name, color]) =>
    drafts.push({ id: `jar-${slug(name)}`, kind: "jar", label: `${name} jar`, category: "jars", w: Math.round(between(r, 66, 76)), h: Math.round(between(r, 100, 118)), color, rotation: startAngle(r, r() < turnShare) }),
  );
  shuffle(r, BOXES).slice(0, per).forEach(([name, color, kind], i) => {
    const short = shortBoxes && i % 2 === 0;
    drafts.push({
      id: `box-${slug(name)}`, kind, label: `${name} box`, category: "boxes", accent: "#fbe38e", color,
      w: Math.round(between(r, 78, 100)), h: Math.round(short ? between(r, 108, 124) : between(r, 140, 165)),
      rotation: startAngle(r, r() < turnShare),
    });
  });
  const shelf = (id: string, label: string, y: number, h: number): TargetDef => ({
    id, label, rect: { x: 90, y, w: 620, h }, layout: "row", fixture: "pantry-shelf", gap: 12, justify: "start", accepts: { categories: ["cans", "jars", "boxes"] }, allowedRotations: [0],
  });
  const targets = [shelf("top", "top shelf", 62, 130), shelf("middle", "middle shelf", 232, 130), shelf("bottom", "bottom shelf", 402, 175)];
  const solution = Object.fromEntries(drafts.map((o) => [o.id, o.category === "cans" ? "top" : o.category === "jars" ? "middle" : "bottom"]));
  return {
    environment: "pantry",
    summary: `${drafts.length} groceries to group.`,
    instructions: [
      "Give each shelf a single kind of item: cans, jars, or boxes.",
      "Labels face out — stand everything upright.",
      shortBoxes ? "Some boxes are short now, so height won't tell you which shelf is theirs." : "The tall boxes only fit on one shelf.",
    ],
    board: BOARD,
    targets,
    objects: scatter(r, drafts, { x: 16, y: 616, w: 768, h: 236 }),
    rules: [{ type: "group-by-category", targetIds: ["top", "middle", "bottom"], label: "One kind of item per shelf" }],
    solution,
  };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

// ---------------------------------------------------------------- Assembly

const ORDER: Environment[] = ["desk", "bookshelf", "drawer", "pantry"];
const BUILDERS: Record<Environment, (r: Rng, d: number) => Omit<LevelDef, "id" | "name">> = {
  desk: deskLevel,
  bookshelf: bookshelfLevel,
  drawer: drawerLevel,
  pantry: pantryLevel,
};

export function generateLevel(n: number, first: number, last: number): LevelDef {
  const d = Math.min(1, Math.max(0, (n - first) / (last - first)));
  const i = n - first;
  const env = ORDER[i % ORDER.length];
  const r = mulberry32(n * 9973 + 17);
  const base = BUILDERS[env](r, d);
  const names = NAMES[env];
  const cycle = Math.floor(i / ORDER.length);
  const par = base.objects.length;
  return {
    ...base,
    id: `level-${n}`,
    name: names[cycle % names.length],
    // Star thresholds tighten as levels get harder.
    scoring: { threeStarExtra: Math.max(1, Math.round(lerp(par * 0.35, par * 0.12, d))), twoStarExtra: Math.max(2, Math.round(lerp(par, par * 0.5, d))) },
  };
}

export function generateLevels(first: number, last: number): LevelDef[] {
  return Array.from({ length: last - first + 1 }, (_, k) => generateLevel(first + k, first, last));
}
