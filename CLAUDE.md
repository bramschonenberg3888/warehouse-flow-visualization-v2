# Warehouse Flow Visualization

Next.js 16.1.1 web app for designing warehouse layouts with draggable elements and visualizing goods movement flow paths using an Excalidraw-based canvas editor.

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Dashboard routes (warehouses, elements, wiki)
│   ├── api/                    # NextAuth & tRPC endpoints
│   └── globals.css
├── components/
│   ├── ui/                     # Shadcn/ui components
│   ├── editor/                 # Excalidraw wrapper & element sidebar
│   ├── layout/                 # Header & sidebar navigation
│   ├── warehouse/              # Warehouse cards & forms
│   └── wiki/                   # Wiki content renderer
├── server/
│   ├── api/routers/            # tRPC domain routers
│   └── db/schema/              # Drizzle schemas
├── trpc/                       # Client-side tRPC
├── lib/                        # Utilities & wiki content
├── auth.ts                     # NextAuth configuration
└── env.ts                      # Type-safe environment variables
tests/                          # Vitest unit + Playwright E2E
migrations/                     # Drizzle database migrations
```

## Organization Rules

- **API routes**: `/app/api` - one file per route
- **tRPC routers**: `/server/api/routers` - one router per domain
- **Components**: `/components` - one component per file, grouped by domain
- **Database schemas**: `/server/db/schema` - one file per table
- **Tests**: `/tests/unit` and `/tests/e2e` - mirror source structure

## Code Quality - Zero Tolerance

After editing ANY file, run:

```bash
bun run lint && bun run type-check
```

Fix ALL errors before continuing. For database changes:

```bash
bun run db:generate && bun run db:push
```

## Tech Stack

Next.js 16.1.1, React 19, TypeScript 5.9, tRPC 11, PostgreSQL + Drizzle ORM, NextAuth 5 + @auth/core, Tailwind CSS 4 + shadcn/ui, Excalidraw, Vitest + Playwright

## Design Decisions

### Element Instance vs Template Properties (Full Sync Model)

**Template-Controlled** (sync from template, for brand consistency):

- type, backgroundColor, strokeColor, strokeWidth, strokeStyle
- fillStyle, roughness, roundness, opacity

**Instance-Controlled** (per placement, for warehouse flexibility):

- position (x, y), size (width, height), rotation, label, metadata

When a template is updated, all placed instances reflect visual changes on next load. See the in-app Wiki for details.

## Documentation

When making changes that affect user-facing behavior, update the in-app Wiki:

- Wiki content is in `src/lib/wiki-content.ts`
- Add new articles or update existing ones to reflect changes
- Key articles: "Element Properties" (Full Sync behavior), "Getting Started"

## Future Features

- **Flow Editor**: Define and visualize goods movement paths between warehouse elements
- **CAD Import via Lucidchart**: Upload CAD drawings for warehouse layout backgrounds
