import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile("../../.env");
} catch {
  // Environment can also be supplied by CI/host process.
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.INSFORGE_DB_STRING ?? "",
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
});
