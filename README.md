# Perfectly Organized

*Arrange. Organize. Feel Good.* A cozy drag-and-drop organization puzzle game: 100 levels across desks, bookshelves, drawers and pantries.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Development server                             |
| `npm run build`     | Production build (prerenders all 100 levels)   |
| `npm start`         | Serve the production build                     |
| `npm test`          | Engine, level and persistence tests (Vitest)   |
| `npm run typecheck` | TypeScript check                               |
| `npm run lint`      | ESLint                                         |

## How it's organized

- `types/game.ts`: level, object, target and rule types.
- `lib/game/`: the pure game engine. Covers placement and snapping (slot / free zone / row / grid), validation (alignment, ordering, category grouping), the reducer (drop, place, rotate, undo, reset), hints, scoring and the solver used by tests.
- `data/levels/`: levels 1–5 are hand-made tutorials (`desk.ts`, `bookshelf.ts`, …). Levels 6–100 come from `generated.ts`, a seeded generator that is deterministic per level number. Difficulty ramps through more objects, more rotation, auto-straightening turned off, tighter containers, subtler sort orders and stricter stars.
- `lib/persistence/`: localStorage save with defensive parsing.
- `lib/audio/sound.ts`: synthesized Web Audio effects, with no audio files.
- `components/board/`: the SVG board, with pointer-event dragging, tap-to-place, keyboard support, the scene and fixtures.
- `components/objects/ObjectArt.tsx`: all object illustrations, drawn as SVG.
- `components/game/`, `components/menus/`, `components/ui/`: screens and UI primitives.

To add a hand-made level, write a `LevelDef` and add it to `HANDMADE` in `data/levels/index.ts`. The tests then check automatically that it is well formed and solvable.
