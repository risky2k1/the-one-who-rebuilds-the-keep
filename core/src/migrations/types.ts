import type { Generated, Kysely } from 'kysely';

/**
 * Schema for the core migrations table tracking applied migrations.
 */
export interface MigrationsTable {
  id: Generated<number>;
  owner: string;
  name: string;
  applied_at: Generated<Date>;
}

/**
 * Schema for the core plugins_state table tracking active/inactive plugins.
 */
export interface PluginsStateTable {
  id: string;
  status: 'active' | 'inactive';
  updated_at: Generated<Date>;
}

/**
 * Core table map containing framework-level tables.
 */
export interface CoreTables {
  migrations: MigrationsTable;
  plugins_state: PluginsStateTable;
}

/**
 * Migration definition executed against a database schema.
 */
export interface Migration {
  name: string;
  // any is required here because migrations operate on schema changes where types are not yet defined
  up(db: Kysely<any>): Promise<void>;
  // any is required here because migrations operate on schema changes where types are not yet defined
  down?(db: Kysely<any>): Promise<void>;
}

/**
 * Set of migrations owned by a specific component (e.g. 'core', 'plugin:hello').
 */
export interface MigrationSet {
  owner: string;
  migrations: Migration[];
}
