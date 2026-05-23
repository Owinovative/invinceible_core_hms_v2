import {
  formatBytes,
  parseModels,
  printTable,
  summarizeIndexes,
  withPrisma,
} from './storage-utils.mjs';

const summary = summarizeIndexes(parseModels());

console.log('Static Prisma index audit');
printTable(
  summary
    .filter(
      (model) =>
        model.indexCount > 0 ||
        model.uniqueCount > 0 ||
        model.duplicates.length > 0,
    )
    .map((model) => ({
      model: model.model,
      indexes: model.indexCount,
      uniques: model.uniqueCount,
      duplicates: model.duplicates.join(', ') || '-',
    })),
  ['model', 'indexes', 'uniques', 'duplicates'],
);

await withPrisma(async (prisma, kind) => {
  console.log(`\nDatabase index usage inspection (${kind})`);

  if (kind === 'postgresql') {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        schemaname,
        relname AS table_name,
        indexrelname AS index_name,
        idx_scan::bigint AS scans,
        pg_relation_size(indexrelid)::bigint AS index_bytes
      FROM pg_stat_user_indexes
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 40
    `);

    printTable(
      rows.map((row) => ({
        table: row.table_name,
        index: row.index_name,
        scans: row.scans,
        size: formatBytes(row.index_bytes),
      })),
      ['table', 'index', 'scans', 'size'],
    );
    console.log(
      'Low-scan indexes are candidates for review only after observing production traffic.',
    );
    return;
  }

  if (kind === 'mysql') {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        table_name,
        index_name,
        COUNT(*) AS column_count,
        MAX(non_unique) AS non_unique
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
      GROUP BY table_name, index_name
      ORDER BY table_name, index_name
    `);

    printTable(
      rows.map((row) => ({
        table: row.table_name,
        index: row.index_name,
        columns: row.column_count,
        unique: Number(row.non_unique) === 0 ? 'yes' : 'no',
      })),
      ['table', 'index', 'columns', 'unique'],
    );
    return;
  }

  console.log('Unsupported DATABASE_URL scheme; database index scan skipped.');
});
