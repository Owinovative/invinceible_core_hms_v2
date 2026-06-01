# PostgreSQL Prisma baseline

This directory is the Render PostgreSQL migration target.

- `schema.prisma` is generated from `../prisma/schema.prisma` by
  `npm run prisma:schema:postgres`.
- `migrations/000001_render_postgres_baseline/migration.sql` is a PostgreSQL
  baseline generated from the PostgreSQL schema for an empty Render PostgreSQL
  database.
- The canonical runtime schema remains `../prisma/schema.prisma` for MySQL
  until the PostgreSQL migration is tested and cut over.

Do not apply the existing MySQL migrations in `../prisma/migrations` to
PostgreSQL. They contain MySQL-native SQL such as backticks, `AUTO_INCREMENT`,
`DATETIME(3)`, `DOUBLE`, and `LONGTEXT`.
