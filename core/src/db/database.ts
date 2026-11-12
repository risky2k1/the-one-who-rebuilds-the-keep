import { Kysely, MysqlDialect } from 'kysely';
import { createPool } from 'mysql2';
import type { CoreTables } from '../migrations/types.js';

/**
 * Creates a Kysely instance connected to the MySQL database.
 */
export function createDb(url: string): Kysely<CoreTables> {
  const dialect = new MysqlDialect({
    pool: createPool({
      uri: url,
      connectionLimit: 10,
    }),
  });

  return new Kysely<CoreTables>({
    dialect,
  });
}
