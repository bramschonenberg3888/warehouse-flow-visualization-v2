# Warehouse Flow Visualization

Next.js web app for designing warehouse layouts with draggable elements and visualizing goods movement flow paths using an Excalidraw-based canvas editor.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard routes (elements, flows, scenarios, visualization, warehouses, wiki)
│   └── api/                    # NextAuth & tRPC endpoints
├── components/
│   ├── ui/                     # Shadcn/ui components
│   ├── editor/                 # Excalidraw wrapper & element sidebar
│   ├── flow-editor/            # Flow editor canvas & drag-drop sequence
│   ├── scenario-builder/       # Visual scenario editor
│   ├── visualization/          # Canvas-based flow animation
│   └── layout/, warehouse/, wiki/
├── hooks/                      # Custom React hooks
├── lib/
│   ├── scenario-engine/        # Scenario simulation engine
│   └── *.ts                    # Utilities (element-utils, pathfinding, wiki-content)
├── server/
│   ├── api/routers/            # tRPC routers (one per domain)
│   └── db/schema/              # Drizzle schemas (one per table)
└── trpc/                       # Client-side tRPC
tests/                          # Vitest unit + Playwright E2E
migrations/                     # Drizzle database migrations
```

## Organization Rules

- **tRPC routers**: `/server/api/routers` - one router per domain
- **Components**: `/components` - one component per file, grouped by feature
- **Database schemas**: `/server/db/schema` - one file per table
- **Tests**: `/tests/unit` and `/tests/e2e` - mirror source structure

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
bun run lint && bun run type-check && bun run format
```

Fix ALL errors before continuing. For database changes:

```bash
bun run db:generate && bun run db:push
```

## Tech Stack

Next.js 16.1.1, React 19, TypeScript 5.9, tRPC 11, PostgreSQL + Drizzle ORM, NextAuth 5, Tailwind CSS 4 + shadcn/ui, Excalidraw, @dnd-kit, Vitest + Playwright

## Design Decisions

### Element Instance vs Template Properties (Full Sync Model)

**Template-Controlled**: type, backgroundColor, strokeColor, strokeWidth, strokeStyle, fillStyle, roughness, roundness, opacity

**Instance-Controlled**: position (x, y), size (width, height), rotation, label, metadata

### Documentation

Wiki content is in `src/lib/wiki-content.ts`. Update when changing user-facing behavior.

## Design Challenges

### Static vs Mobile Elements

Currently, pallets are simple colored squares. Future enhancement: classify elements as:

- **Static**: Part of layout (racking, lanes, zones, walls)
- **Mobile**: Can move (pallets, forklifts, AGVs, workers)

Implementation: Add `elementBehavior: 'static' | 'mobile'` to templates. Mobile elements spawned by scenario engine with visual appearance from template.

## Future Features

- **CAD Import via Lucidchart**: Upload CAD drawings for warehouse layout backgrounds

## Architecture Alternatives

Canvas editor alternatives documented in `docs/canvas-alternatives.md`. Key candidates: ReactFlow, React-Konva.

## Next Steps

### Test Scenario Builder UI

The scenario builder was upgraded from raw JSON editing to a visual builder. Test:

1. Create new scenario via UI
2. Add location steps (Specific/Category/Random targets)
3. Add decision steps (Probability/Capacity/Time/Counter conditions)
4. Configure spawning modes (Interval/Batch/Manual)
5. Drag-and-drop reorder steps
6. Verify JSON tab syncs with visual builder
7. Save/load scenarios correctly
8. Run visualization to confirm execution
