# Warehouse Flow Visualization

A Next.js 16 web application for designing and visualizing warehouse layouts with an Excalidraw-based canvas editor.

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
│   ├── ui/                     # Shadcn/ui components (14 components)
│   ├── editor/                 # Excalidraw wrapper & element sidebar
│   ├── layout/                 # Header & sidebar navigation
│   └── warehouse/              # Warehouse cards & forms
├── server/
│   ├── api/
│   │   ├── root.ts             # tRPC root router
│   │   ├── trpc.ts             # tRPC setup
│   │   └── routers/            # Domain routers
│   │       ├── warehouse.ts    # Warehouse CRUD
│   │       ├── element.ts      # Element templates
│   │       ├── placed-element.ts # Canvas elements
│   │       └── category.ts     # Dynamic categories
│   └── db/
│       ├── index.ts            # Database connection
│       ├── seed.ts             # Seed data script
│       └── schema/             # Drizzle schemas
│           ├── warehouse.ts    # Warehouses table
│           ├── element.ts      # Element templates
│           ├── placed-element.ts # Placed elements
│           ├── category.ts     # User categories
│           └── flow.ts         # Flow paths
├── trpc/                       # Client-side tRPC (react.tsx, server.ts)
├── lib/utils.ts                # Utility functions
├── auth.ts                     # NextAuth configuration
└── env.ts                      # Type-safe env variables
tests/
├── unit/                       # Vitest unit tests
└── e2e/                        # Playwright E2E tests
migrations/                     # Drizzle database migrations
```

## Organization Rules

- **API routes**: `/app/api` - one file per route/resource
- **tRPC routers**: `/server/api/routers` - one router per domain
- **Components**: `/components` - one component per file, grouped by domain
- **Database schemas**: `/server/db/schema` - organized by domain
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
- **Canvas**: Excalidraw (dynamic import, CDN CSS)
- **Testing**: Vitest + Playwright

## Future Features

- **CAD Import via Lucidchart**: Add ability to upload CAD drawings through Lucidchart integration for warehouse layout backgrounds
