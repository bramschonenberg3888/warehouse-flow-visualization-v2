# Warehouse Flow Visualization

A Next.js 16 web application for warehouse flow visualization, built with TypeScript, tRPC, Drizzle ORM, and NextAuth.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & layouts
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── warehouses/     # Warehouse list & detail pages
│   │   │   └── [id]/editor # Visual warehouse editor
│   │   └── layout.tsx      # Dashboard layout with sidebar
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth API routes
│   │   └── trpc/[trpc]/         # tRPC API routes
│   └── globals.css
├── components/
│   ├── ui/                 # Shadcn/ui components
│   ├── editor/             # Excalidraw canvas & element library
│   ├── layout/             # Header & sidebar navigation
│   └── warehouse/          # Warehouse cards & forms
├── server/
│   ├── api/
│   │   ├── root.ts         # tRPC root router
│   │   ├── trpc.ts         # tRPC setup
│   │   └── routers/        # Domain routers (warehouse, element, placed-element)
│   └── db/
│       ├── index.ts        # Database connection
│       ├── seed.ts         # Seed data script
│       └── schema/         # Drizzle schemas (warehouse, element, flow)
├── trpc/                   # Client-side tRPC (react.tsx, server.ts)
├── lib/utils.ts            # Utility functions (cn helper)
├── auth.ts                 # NextAuth configuration
├── env.ts                  # Type-safe environment variables
└── proxy.ts                # Request proxy config
tests/
├── unit/                   # Vitest unit tests
└── e2e/                    # Playwright E2E tests
migrations/                 # Drizzle database migrations
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
