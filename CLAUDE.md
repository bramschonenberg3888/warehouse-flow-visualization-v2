# Warehouse Flow Visualization

Next.js web app for designing warehouse layouts on a grid-based canvas and visualizing goods movement flow paths.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard routes (elements, flows, scenarios, visualization, warehouses, wiki)
│   └── api/                    # NextAuth & tRPC endpoints
├── components/
│   ├── ui/                     # Shadcn/ui components
│   ├── warehouse-editor/       # Grid-based warehouse layout editor
│   ├── flow-editor/            # Flow path editor (grid cell selection)
│   ├── scenario-builder/       # Visual scenario editor
│   ├── visualization/          # Canvas-based flow animation
│   └── editor/, layout/, warehouse/, wiki/
├── hooks/                      # Custom React hooks
├── lib/
│   ├── scenario-engine/        # Scenario simulation engine
│   ├── grid-config.ts          # Grid configuration (40px cells)
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

Next.js 16, React 19, TypeScript 5.9, tRPC 11, PostgreSQL + Drizzle ORM, NextAuth 5, Tailwind CSS 4 + shadcn/ui, @dnd-kit, Vitest + Playwright

## Core Concepts

### Grid-Based Warehouse Model

The warehouse is fundamentally a **grid** of cells:

- **Cell size**: 40px (constant in `lib/grid-config.ts`)
- **Movement**: 4-directional (up, down, left, right)
- **Warehouse dimensions**: Defined per warehouse (`gridColumns`, `gridRows`)

### Element Behavior Classification

Elements are classified via `elementBehavior` field:

- **Static**: Fixed fixtures (racking, zones, walls) - placed ON the grid, block movement
- **Mobile**: Can move during simulation (pallets, forklifts) - spawned by scenario engine

### Workflow

1. **Create Warehouse** → Define grid size (columns × rows)
2. **Layout Editor** → Place static elements on grid cells
3. **Flow Editor** → Click grid cells to define movement paths (`grid:{col}:{row}`)
4. **Visualization** → Animate mobile elements along flow paths

### Element Template vs Instance

**Template-Controlled**: type, backgroundColor, strokeColor, strokeWidth, strokeStyle, fillStyle, roughness, roundness, opacity, elementBehavior

**Instance-Controlled**: position (x, y), size (width, height), rotation, label, metadata

## Documentation

Wiki content is in `src/lib/wiki-content.ts`. Update when changing user-facing behavior.
