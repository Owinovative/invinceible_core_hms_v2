import {
  formatBytes,
  largeFields,
  parseModels,
  printTable,
  withPrisma,
} from './storage-utils.mjs';

const fields = largeFields(parseModels());

console.log('Large field report');
printTable(
  fields.map((field) => ({
    model: field.model,
    table: field.table,
    field: field.field,
    column: field.column,
    type: field.dbType,
  })),
  ['model', 'table', 'field', 'column', 'type'],
);

function quotePostgresIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteMysqlIdentifier(identifier) {
  return `\`${identifier.replaceAll('`', '``')}\``;
}

await withPrisma(async (prisma, kind) => {
  if (!['postgresql', 'mysql'].includes(kind)) {
    console.log('Unsupported DATABASE_URL scheme; length scan skipped.');
    return;
  }

  console.log(`\nObserved maximum field lengths (${kind})`);
  const results = [];

  for (const field of fields) {
    try {
      const table =
        kind === 'postgresql'
          ? quotePostgresIdentifier(field.table)
          : quoteMysqlIdentifier(field.table);
      const column =
        kind === 'postgresql'
          ? quotePostgresIdentifier(field.column)
          : quoteMysqlIdentifier(field.column);
      const rows =
        kind === 'postgresql'
          ? await prisma.$queryRawUnsafe(
              `SELECT MAX(octet_length(${column}::text))::bigint AS max_bytes FROM ${table}`,
            )
          : await prisma.$queryRawUnsafe(
              `SELECT MAX(OCTET_LENGTH(${column})) AS max_bytes FROM ${table}`,
            );
      const maxBytes = rows?.[0]?.max_bytes ?? 0;
      results.push({
        model: field.model,
        field: field.field,
        max: formatBytes(maxBytes),
      });
    } catch (error) {
      results.push({
        model: field.model,
        field: field.field,
        max: `skipped (${error?.code ?? 'query'})`,
      });
    }
  }

  printTable(results, ['model', 'field', 'max']);
});
