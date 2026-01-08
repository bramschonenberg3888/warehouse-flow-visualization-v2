# Warehouse Flow Visualization

A Next.js 16 web app for designing warehouse layouts with draggable elements and visualizing goods movement flow paths using an Excalidraw-based canvas editor.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── warehouses/         # Warehouse list, detail, editor
│   │   ├── elements/           # Element templates (list, new, edit)
│   │   └── layout.tsx          # Dashboard layout with sidebar
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth API routes
│   │   └── trpc/[trpc]/        # tRPC API endpoint
│   └── globals.css
├── components/
│   ├── ui/                     # Shadcn/ui components
│   ├── editor/                 # Excalidraw wrapper & element sidebar
│   ├── layout/                 # Header & sidebar navigation
│   └── warehouse/              # Warehouse cards & forms
├── server/
│   ├── api/
│   │   ├── root.ts             # tRPC root router
│   │   ├── trpc.ts             # tRPC setup
│   │   └── routers/            # Domain routers (warehouse, element, category)
│   └── db/
│       ├── index.ts            # Database connection
│       ├── seed.ts             # Seed data script
│       └── schema/             # Drizzle schemas (warehouse, element, category, flow)
├── trpc/                       # Client-side tRPC (react.tsx, server.ts)
├── lib/utils.ts                # Utility functions
├── auth.ts                     # NextAuth configuration
└── env.ts                      # Type-safe env variables
tests/                          # Vitest unit + Playwright E2E
migrations/                     # Drizzle database migrations
```

## Organization Rules

- **API routes**: `/app/api` - one file per route
- **tRPC routers**: `/server/api/routers` - one router per domain
- **Components**: `/components` - one component per file, grouped by domain
- **Database schemas**: `/server/db/schema` - one file per table
- **Tests**: `/tests/unit` and `/tests/e2e` - mirror source structure

## Code Quality

After editing ANY file, run:

```bash
bun run lint && bun run type-check
```

Fix ALL errors before continuing.

For database changes:

```bash
bun run db:generate && bun run db:push
```

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript 5
- **API**: tRPC 11 + TanStack Query
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: NextAuth 5 (beta)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Canvas**: Excalidraw (dynamic import)
- **Testing**: Vitest + Playwright

## Open Design Decisions

### Element Instance vs Template Properties

When placing an element template in a warehouse, which properties should follow the template (update when template changes) vs be customizable per placed instance?

**Template properties** (sync with template):

- type (rectangle/ellipse)
- strokeStyle (solid/dashed)
- roundness (sharp/rounded)
- roughness

**Instance properties** (customizable per placement):

- width/height (size)
- position (x, y)
- rotation
- opacity
- colors (as accent)

**Options to consider:**

1. Template = starting values only, placed elements fully independent after placement
2. Hybrid: some properties always sync, others are per-instance
3. Everything syncs except position/size/rotation (current behavior)

## Future Features

- **CAD Import via Lucidchart**: Upload CAD drawings for warehouse layout backgrounds
