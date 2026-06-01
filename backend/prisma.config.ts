import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseProvider = (process.env.DATABASE_PROVIDER || "mysql")
  .trim()
  .toLowerCase();

const isPostgres =
  databaseProvider === "postgres" || databaseProvider === "postgresql";

export default defineConfig({
  schema: isPostgres
    ? "prisma-postgresql/schema.prisma"
    : "prisma/schema.prisma",
  migrations: {
    path: isPostgres ? "prisma-postgresql/migrations" : "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || "",
  },
});
