import { sql, type Kysely } from 'kysely';
import type { CoreTables, MigrationSet } from './types.js';

/**
 * Runs pending migrations across provided migration sets under a MySQL advisory lock.
 *
 * NOTE: MySQL does not support transactional DDL. Each migration is recorded
 * in the migrations table immediately after its up() function succeeds.
 */
export async function runMigrations(
  db: Kysely<CoreTables>,
  sets: MigrationSet[]
): Promise<Array<{ owner: string; name: string }>> {
  return await db.connection().execute(async (conn) => {
    // 1. Acquire lock on this single connection
    const lockResult = await sql<{ lock_status: number | null }>`
      SELECT GET_LOCK(CONCAT('keep_migrations:', DATABASE()), 30) AS lock_status
    `.execute(conn);

    const lockStatus = lockResult.rows[0]?.lock_status;
    if (lockStatus !== 1) {
      throw new Error('Could not acquire the migration lock within 30s');
    }

    try {
      // 2. Ensure migrations table exists
      await conn.schema
        .createTable('migrations')
        .ifNotExists()
        .addColumn('id', 'integer', (col) => col.autoIncrement().primaryKey().unsigned())
        .addColumn('owner', 'varchar(150)', (col) => col.notNull())
        .addColumn('name', 'varchar(255)', (col) => col.notNull())
        .addColumn('applied_at', 'datetime', (col) =>
          col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .addUniqueConstraint('migrations_owner_name_unique', ['owner', 'name'])
        .execute();

      const newlyApplied: Array<{ owner: string; name: string }> = [];

      for (const set of sets) {
        // Validate duplicate migration names within set
        const seenNames = new Set<string>();
        for (const m of set.migrations) {
          if (seenNames.has(m.name)) {
            throw new Error(`Duplicate migration "${m.name}" for owner "${set.owner}"`);
          }
          seenNames.add(m.name);
        }

        // Fetch already applied migrations for this owner
        const existingRows = await conn
          .selectFrom('migrations')
          .select('name')
          .where('owner', '=', set.owner)
          .execute();
        const appliedNames = new Set(existingRows.map((r) => r.name));

        const sortedMigrations = [...set.migrations].sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        for (const migration of sortedMigrations) {
          if (appliedNames.has(migration.name)) {
            continue;
          }

          // Run up(conn) and record
          await migration.up(conn);
          await conn
            .insertInto('migrations')
            .values({
              owner: set.owner,
              name: migration.name,
            })
            .execute();

          newlyApplied.push({
            owner: set.owner,
            name: migration.name,
          });
        }
      }

      return newlyApplied;
    } finally {
      await sql`SELECT RELEASE_LOCK(CONCAT('keep_migrations:', DATABASE()))`.execute(conn);
    }
  });
}
