import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema",
  out: "./migrations",
  dbCredentials: {
    host: process.env["DB_HOST"] || "aws-1-eu-central-1.pooler.supabase.com",
    port: Number(process.env["DB_PORT"]) || 5432,
    user: process.env["DB_USER"] || "postgres.zxvxduicqzwxsewmcluf",
    password: process.env["DB_PASSWORD"]!,
    database: process.env["DB_NAME"] || "postgres",
    ssl: "require",
  },
  verbose: true,
  strict: true,
})
