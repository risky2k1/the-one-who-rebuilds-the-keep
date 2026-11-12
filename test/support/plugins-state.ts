import { sql } from 'kysely';
import { createDb } from '../../core/src/db/database.js';
import { coreMigrations } from '../../core/src/db/core-migrations.js';
import { runMigrations } from '../../core/src/migrations/runner.js';

/**
 * Ensures core tables exist and marks the specified plugins as active.
 */
export async function markActive(url: string, ids: string[]): Promise<void> {
  const db = createDb(url);
  try {
    await runMigrations(db, [{ owner: 'core', migrations: coreMigrations }]);
    for (const id of ids) {
      await db
        .insertInto('plugins_state')
        .values({
          id,
          status: 'active',
        })
        .onDuplicateKeyUpdate({
          status: 'active',
          updated_at: sql`CURRENT_TIMESTAMP`,
        })
        .execute();
    }
  } finally {
    await db.destroy();
  }
}
