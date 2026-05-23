import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(scriptDir, '..');
export const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma');

export function readSchema() {
  return fs.readFileSync(schemaPath, 'utf8');
}

export function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function databaseKind() {
  const url = process.env.DATABASE_URL ?? '';
  if (/^postgres(ql)?:\/\//i.test(url)) return 'postgresql';
  if (/^mysql:\/\//i.test(url)) return 'mysql';
  return 'unknown';
}

export function parseModels(schema = readSchema()) {
  const models = [];
  const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
  let match;

  while ((match = modelRegex.exec(schema))) {
    const [, modelName, body] = match;
    const tableMap = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? modelName;
    const fields = [];
    const indexes = [];

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.startsWith('@@index') || line.startsWith('@@unique')) {
        indexes.push(line);
        continue;
      }
      if (line.startsWith('@@')) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 2) continue;
      const [name, type] = parts;
      const dbType = line.match(/@db\.(\w+)/)?.[1] ?? null;
      const columnMap = line.match(/@map\("([^"]+)"\)/)?.[1] ?? name;
      fields.push({
        name,
        column: columnMap,
        type,
        dbType,
        isJson: type.replace(/[?!]/g, '') === 'Json',
        isBytes: type.replace(/[?!]/g, '') === 'Bytes',
        raw: line,
      });
    }

    models.push({ name: modelName, table: tableMap, fields, indexes });
  }

  return models;
}

export function largeFields(models = parseModels()) {
  return models.flatMap((model) =>
    model.fields
      .filter(
        (field) =>
          field.isJson ||
          field.isBytes ||
          ['Text', 'LongText', 'MediumText'].includes(field.dbType),
      )
      .map((field) => ({
        model: model.name,
        table: model.table,
        field: field.name,
        column: field.column,
        type: field.type,
        dbType: field.dbType ?? (field.isJson ? 'Json' : 'Bytes'),
      })),
  );
}

export function moneyFloatFields(models = parseModels()) {
  return models.flatMap((model) =>
    model.fields
      .filter((field) => {
        const name = field.name.toLowerCase();
        return (
          field.type.replace(/[?!]/g, '') === 'Float' &&
          /(amount|price|cost|total|balance|tax|discount|charge|fee|cash)/.test(
            name,
          )
        );
      })
      .map((field) => ({
        model: model.name,
        field: field.name,
        type: field.type,
      })),
  );
}

export function summarizeIndexes(models = parseModels()) {
  return models.map((model) => {
    const seen = new Map();
    const duplicates = [];
    for (const index of model.indexes) {
      const fields = index.match(/\[(.*?)\]/)?.[1]?.replace(/\s+/g, '') ?? index;
      if (seen.has(fields)) duplicates.push(fields);
      seen.set(fields, true);
    }
    return {
      model: model.name,
      indexCount: model.indexes.filter((index) => index.startsWith('@@index'))
        .length,
      uniqueCount: model.indexes.filter((index) => index.startsWith('@@unique'))
        .length,
      duplicates,
    };
  });
}

export async function withPrisma(callback) {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not set; database inspection skipped.');
    return undefined;
  }

  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      return await callback(prisma, databaseKind());
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.log(
      `Database inspection skipped: ${error?.message ?? String(error)}`,
    );
    return undefined;
  }
}

export function printTable(rows, columns) {
  if (!rows.length) {
    console.log('No rows.');
    return;
  }
  const widths = columns.map((column) =>
    Math.max(
      column.length,
      ...rows.map((row) => String(row[column] ?? '').length),
    ),
  );
  console.log(columns.map((column, i) => column.padEnd(widths[i])).join('  '));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) {
    console.log(
      columns
        .map((column, i) => String(row[column] ?? '').padEnd(widths[i]))
        .join('  '),
    );
  }
}
