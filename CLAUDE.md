# Warehouse Flow Visualization

Next.js web app for designing warehouse layouts on a grid-based canvas and visualizing goods movement flow paths.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard routes (elements, scenarios, visualization, warehouses, wiki)
│   └── api/                    # NextAuth & tRPC endpoints
├── components/
│   ├── ui/                     # Shadcn/ui components
│   ├── warehouse-editor/       # Grid-based warehouse layout editor
│   ├── scenario-editor/        # Path-based scenario editor (click grid to build paths)
│   ├── visualization/          # Canvas-based flow animation
│   └── layout/, warehouse/, wiki/
├── hooks/                      # Custom React hooks (use-path-visualization, etc.)
├── lib/
│   ├── path-engine/            # Path simulation engine
│   ├── scenario-engine/        # Scenario execution engine
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

Next.js 16, React 19, TypeScript 5.9, tRPC 11, PostgreSQL (Supabase) + Drizzle ORM, NextAuth 5, Tailwind CSS 4 + shadcn/ui, @dnd-kit, Excalidraw, Vitest + Playwright

**Package Manager**: Bun

## Core Concepts

### Grid-Based Warehouse Model

- **Cell size**: 40px (constant in `lib/grid-config.ts`)
- **Movement**: 4-directional (up, down, left, right)
- **Warehouse dimensions**: Defined per warehouse (`gridColumns`, `gridRows`)

### Element Behavior Classification

- **Static**: Fixed fixtures (racking, zones, walls) - placed ON the grid, block movement
- **Mobile**: Can move during simulation (pallets, forklifts) - spawned by path engine

### Workflow

1. **Elements** → Define element templates (colors, behavior)
2. **Warehouses** → Create layout, place elements on grid
3. **Scenarios** → Create scenario, add paths (click grid cells: A → B → C)
4. **Simulate** → Run visualization with animated pallets

### Path System

Paths define movement sequences within a scenario:

- **Stops**: Grid cells (`grid:{col}:{row}`) or placed element IDs
- **Settings per path**: spawn interval, dwell time, speed, max active
- **Requirement**: Each path needs at least 2 stops to be valid

### Element Template vs Instance

**Template-Controlled**: type, backgroundColor, strokeColor, strokeWidth, strokeStyle, fillStyle, roughness, roundness, opacity, elementBehavior

**Instance-Controlled**: position (x, y), size (width, height), rotation, label, metadata

## Documentation

Wiki content is in `src/lib/wiki-content.ts`. Update when changing user-facing behavior.
