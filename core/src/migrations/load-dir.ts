import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Migration } from './types.js';

/**
 * Loads migrations from a specified directory with matching file extension (.ts or .js).
 */
export async function loadMigrationsFromDir(
  dir: string,
  ext: '.ts' | '.js'
): Promise<Migration[]> {
  try {
    const s = await stat(dir);
    if (!s.isDirectory()) {
      return [];
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const migrationFiles: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (
      name.endsWith(ext) &&
      !name.endsWith(`.d${ext}`) &&
      !name.includes('.test.')
    ) {
      migrationFiles.push(name);
    }
  }

  migrationFiles.sort();

  const migrations: Migration[] = [];

  for (const file of migrationFiles) {
    const fullPath = join(dir, file);
    const mod = await import(fullPath);
    if (typeof mod.up !== 'function') {
      throw new Error(`Migration file ${fullPath} has no up() export`);
    }

    const migrationName = file.slice(0, -ext.length);
    migrations.push({
      name: migrationName,
      up: mod.up,
      down: mod.down,
    });
  }

  return migrations;
}
