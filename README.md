# Warehouse Flow Visualization

A Next.js web application for designing warehouse layouts with draggable elements and visualizing goods movement flow paths using an Excalidraw-based canvas editor.

## Prerequisites

- **Node.js** 18.17 or later
- **Bun** (recommended) or npm/yarn
- **PostgreSQL** database

## Quick Start

1. **Install dependencies**

   ```bash
   bun install
   ```

2. **Set up environment variables**

   Copy the example env file and configure it:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your values:

   ```env
   AUTH_SECRET=<generate with: openssl rand -base64 32>
   AUTH_URL=http://localhost:3000
   DATABASE_URL=postgresql://postgres:password@localhost:5432/warehouse_flow
   ```

3. **Set up the database**

   ```bash
   bun run db:push
   ```

   Optionally seed with sample data:

   ```bash
   bun run db:seed
   ```

4. **Start the development server**

   ```bash
   bun dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command               | Description                             |
| --------------------- | --------------------------------------- |
| `bun dev`             | Start development server with Turbopack |
| `bun run build`       | Build for production                    |
| `bun start`           | Start production server                 |
| `bun run lint`        | Run ESLint                              |
| `bun run lint:fix`    | Run ESLint with auto-fix                |
| `bun run format`      | Format code with Prettier               |
| `bun run type-check`  | Run TypeScript type checking            |
| `bun run test`        | Run unit tests with Vitest              |
| `bun run test:ui`     | Run tests with Vitest UI                |
| `bun run test:e2e`    | Run E2E tests with Playwright           |
| `bun run db:generate` | Generate Drizzle migrations             |
| `bun run db:push`     | Push schema to database                 |
| `bun run db:studio`   | Open Drizzle Studio                     |
| `bun run db:seed`     | Seed database with sample data          |

## Tech Stack

- **Framework**: Next.js 16.1.1, React 19
- **Language**: TypeScript 5.9
- **API**: tRPC 11
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: NextAuth 5 (Auth.js)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Canvas**: Excalidraw
- **Testing**: Vitest + Playwright
