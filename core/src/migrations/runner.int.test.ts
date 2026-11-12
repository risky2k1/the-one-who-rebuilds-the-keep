import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Kysely } from 'kysely';
import { createDb } from '../db/database.js';
import { coreMigrations } from '../db/core-migrations.js';
import { runMigrations } from './runner.js';
import type { CoreTables, Migration } from './types.js';
import { createTestDatabase } from '../../../test/support/test-db.js';

describe('runMigrations', () => {
  let t: { url: string; drop(): Promise<void> };
  let db: Kysely<CoreTables>;

  beforeEach(async () => {
    t = await createTestDatabase();
    db = createDb(t.url);
  });

  afterEach(async () => {
    await db.destroy();
    await t.drop();
  });

  const mk = (name: string, table: string): Migration => ({
    name,
    up: async (d) => {
      await d.schema.createTable(table).addColumn('id', 'integer').execute();
    },
  });

  const rows = () =>
    db.selectFrom('migrations').select(['owner', 'name']).orderBy('id').execute();

  it('applies per owner in order and records each once', async () => {
    const sets = [
      { owner: 'core', migrations: coreMigrations },
      {
        owner: 'plugin:x',
        migrations: [mk('0002_b', 'x_b'), mk('0001_a', 'x_a')],
      },
    ];
    expect(await runMigrations(db, sets)).toEqual([
      { owner: 'core', name: '0001_create_plugins_state' },
      { owner: 'plugin:x', name: '0001_a' },
      { owner: 'plugin:x', name: '0002_b' },
    ]);
    expect(await runMigrations(db, sets)).toEqual([]);
    expect(await rows()).toHaveLength(3);
  });

  it('is safe when two runs race on the same database', async () => {
    const sets = [{ owner: 'plugin:x', migrations: [mk('0001_a', 'x_a')] }];
    const other = createDb(t.url);
    const [a, b] = await Promise.all([
      runMigrations(db, sets),
      runMigrations(other, sets),
    ]);
    await other.destroy();
    expect(a.length + b.length).toBe(1);
    expect(await rows()).toEqual([{ owner: 'plugin:x', name: '0001_a' }]);
  });

  it('keeps earlier migrations, skips the failed one, releases the lock', async () => {
    const boom: Migration = {
      name: '0002_boom',
      up: async () => {
        throw new Error('boom');
      },
    };
    await expect(
      runMigrations(db, [
        { owner: 'plugin:x', migrations: [mk('0001_a', 'x_a'), boom] },
      ])
    ).rejects.toThrow('boom');
    expect(await rows()).toEqual([{ owner: 'plugin:x', name: '0001_a' }]);
    const fixed = mk('0002_boom', 'x_fixed');
    expect(
      await runMigrations(db, [
        { owner: 'plugin:x', migrations: [mk('0001_a', 'x_a'), fixed] },
      ])
    ).toEqual([{ owner: 'plugin:x', name: '0002_boom' }]);
  });

  it('rejects duplicate names within an owner', async () => {
    await expect(
      runMigrations(db, [
        {
          owner: 'plugin:x',
          migrations: [mk('0001_a', 'a1'), mk('0001_a', 'a2')],
        },
      ])
    ).rejects.toThrow('Duplicate migration "0001_a" for owner "plugin:x"');
  });
});
