import { sql } from 'kysely';
import type { Migration } from '../migrations/types.js';

/**
 * Built-in core system migrations.
 */
export const coreMigrations: Migration[] = [
  {
    name: '0001_create_plugins_state',
    up: async (db) => {
      await db.schema
        .createTable('plugins_state')
        .ifNotExists()
        .addColumn('id', 'varchar(100)', (col) => col.primaryKey())
        .addColumn('status', 'varchar(16)', (col) => col.notNull())
        .addColumn('updated_at', 'datetime', (col) =>
          col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
        )
        .execute();
    },
    down: async (db) => {
      await db.schema.dropTable('plugins_state').ifExists().execute();
    },
  },
];
