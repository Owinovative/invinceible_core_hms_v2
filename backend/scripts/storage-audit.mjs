import {
  formatBytes,
  largeFields,
  moneyFloatFields,
  parseModels,
  printTable,
  summarizeIndexes,
  withPrisma,
} from './storage-utils.mjs';

const models = parseModels();
const fields = models.reduce((total, model) => total + model.fields.length, 0);
const large = largeFields(models);
const moneyFloats = moneyFloatFields(models);
const indexSummary = summarizeIndexes(models);

console.log('Invinceible Core HMS database storage audit');
console.log(`Models: ${models.length}`);
console.log(`Fields: ${fields}`);
console.log(`Large JSON/Text/Bytes fields: ${large.length}`);
console.log(`Money-like Float fields to monitor: ${moneyFloats.length}`);
console.log(
  `Declared indexes: ${indexSummary.reduce((total, model) => total + model.indexCount, 0)}`,
);
console.log(
  `Declared unique constraints: ${indexSummary.reduce((total, model) => total + model.uniqueCount, 0)}`,
);

console.log('\nLargest schema fields by storage risk');
printTable(
  large.slice(0, 40).map((field) => ({
    model: field.model,
    field: field.field,
    type: field.dbType,
  })),
  ['model', 'field', 'type'],
);

if (moneyFloats.length) {
  console.log('\nMoney-like Float fields');
  printTable(moneyFloats, ['model', 'field', 'type']);
}

await withPrisma(async (prisma, kind) => {
  console.log(`\nDatabase size inspection (${kind})`);

  if (kind === 'postgresql') {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        relname AS table_name,
        pg_total_relation_size(relid)::bigint AS total_bytes,
        pg_relation_size(relid)::bigint AS table_bytes,
        pg_indexes_size(relid)::bigint AS index_bytes
      FROM pg_catalog.pg_statio_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 30
    `);

    printTable(
      rows.map((row) => ({
        table: row.table_name,
        total: formatBytes(row.total_bytes),
        data: formatBytes(row.table_bytes),
        indexes: formatBytes(row.index_bytes),
      })),
      ['table', 'total', 'data', 'indexes'],
    );
    return;
  }

  if (kind === 'mysql') {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        table_name,
        COALESCE(data_length, 0) + COALESCE(index_length, 0) AS total_bytes,
        COALESCE(data_length, 0) AS table_bytes,
        COALESCE(index_length, 0) AS index_bytes
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY total_bytes DESC
      LIMIT 30
    `);

    printTable(
      rows.map((row) => ({
        table: row.table_name,
        total: formatBytes(row.total_bytes),
        data: formatBytes(row.table_bytes),
        indexes: formatBytes(row.index_bytes),
      })),
      ['table', 'total', 'data', 'indexes'],
    );
    return;
  }

  console.log('Unsupported DATABASE_URL scheme; only static schema audit ran.');
});
