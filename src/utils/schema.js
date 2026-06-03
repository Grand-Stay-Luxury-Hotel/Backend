import { query } from './db.js';

const columnsCache = new Map();

export async function getTableColumns(tableName) {
  const table = String(tableName ?? '').trim();
  if (!table) return new Set();
  if (columnsCache.has(table)) return columnsCache.get(table);

  try {
    const rows = await query(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = :table
      `,
      { table },
    );
    const columns = new Set(rows.map((row) => row.COLUMN_NAME));
    columnsCache.set(table, columns);
    return columns;
  } catch {
    return new Set();
  }
}

export async function getColumnName(tableName, candidates) {
  if (process.env.NODE_ENV === 'test') return candidates[0];
  const columns = await getTableColumns(tableName);
  const found = candidates.find((column) => columns.has(column));
  return found ?? candidates[0];
}
