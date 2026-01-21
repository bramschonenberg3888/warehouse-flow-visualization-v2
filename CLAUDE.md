# Warehouse Flow Visualization

Next.js web app for designing warehouse layouts on a grid-based canvas and visualizing goods movement flow paths.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (workspace)/            # Main app routes (elements, scenarios, visualization, warehouses, wiki)
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

## Design System

This project uses the **Ocean + Plus Jakarta Sans** design system.

### UI Components

**Always use shadcn/ui components.** Install with:

```bash
npx shadcn@latest add [component-name]
```

Available components: button, card, input, label, select, checkbox, dialog, dropdown-menu, alert, badge, avatar, tabs, table, form, toast, tooltip, popover, separator, skeleton, switch, textarea, and more.

**Never create custom components** when a shadcn/ui equivalent exists.

### Styling Rules

**Use semantic Tailwind classes** that reference the design system:

| Use This                  | Not This          |
| ------------------------- | ----------------- |
| `bg-primary`              | `bg-blue-500`     |
| `bg-secondary`            | `bg-gray-100`     |
| `bg-muted`                | `bg-slate-100`    |
| `bg-accent`               | `bg-blue-100`     |
| `bg-destructive`          | `bg-red-500`      |
| `bg-card`                 | `bg-white`        |
| `bg-background`           | `bg-white`        |
| `text-foreground`         | `text-gray-900`   |
| `text-muted-foreground`   | `text-gray-500`   |
| `text-primary-foreground` | `text-white`      |
| `border-border`           | `border-gray-200` |
| `border-input`            | `border-gray-300` |
| `ring-ring`               | `ring-blue-500`   |

**Never hardcode colors.** No hex codes (`#3b82f6`), no Tailwind palette colors (`blue-500`, `gray-100`), no OKLCH values.

### Color Semantics

- `primary` - Main actions, links, focus states (Ocean blue)
- `secondary` - Secondary actions, less emphasis
- `muted` - Disabled states, subtle backgrounds
- `accent` - Hover states, highlights
- `destructive` - Delete, error, danger actions
- `card` - Card backgrounds
- `popover` - Dropdown/tooltip backgrounds

### Dark Mode

Dark mode is automatic via CSS variables. To enable:

- Add `dark` class to `<html>` element
- Variables auto-switch, no code changes needed

For dark mode toggle, use:

```tsx
document.documentElement.classList.toggle("dark")
```

### Typography

Font family is set globally (Plus Jakarta Sans). Use Tailwind's size classes:

- `text-sm`, `text-base`, `text-lg`, `text-xl`, etc.
- Font weights: `font-normal`, `font-medium`, `font-semibold`, `font-bold`

### Spacing & Layout

Use Tailwind's default spacing scale. For consistent sections:

- Page padding: `p-6` or `p-8`
- Section gaps: `space-y-8` or `gap-8`
- Component gaps: `space-y-4` or `gap-4`
- Inline gaps: `space-x-2` or `gap-2`

### Border Radius

Use the design system radius tokens:

- `rounded-sm` - Subtle rounding
- `rounded-md` - Default for inputs, buttons
- `rounded-lg` - Cards, dialogs
