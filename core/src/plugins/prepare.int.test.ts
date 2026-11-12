import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Kysely } from 'kysely';
import { createDb } from '../db/database.js';
import { CORE_VERSION } from '../version.js';
import type { CoreTables } from '../migrations/types.js';
import { preparePlugins, type PreparePluginsOptions } from './prepare.js';
import { createTestDatabase } from '../../../test/support/test-db.js';
import { markActive } from '../../../test/support/plugins-state.js';
import { makeTmpDir } from '../../../test/support/tmp.js';

describe('preparePlugins', () => {
  let t: { url: string; drop(): Promise<void> };
  let db: Kysely<CoreTables>;
  let root: string;

  beforeEach(async () => {
    t = await createTestDatabase();
    db = createDb(t.url);
    root = await makeTmpDir('prepare-test');
  });

  afterEach(async () => {
    await db.destroy();
    await t.drop();
  });

  const createTable = (name: string) =>
    `export async function up(db) { await db.schema.createTable('${name}').addColumn('id', 'integer').execute(); }`;

  const writePlugin = async (
    baseDir: string,
    id: string,
    opts: {
      requires?: string[] | { core?: string; packages?: Record<string, string>; plugins?: string[] };
      migrations?: Record<string, string>;
    } = {}
  ) => {
    const pluginDir = join(baseDir, id);
    await mkdir(join(pluginDir, 'src'), { recursive: true });
    await mkdir(join(pluginDir, 'database/migrations'), { recursive: true });

    const requires = Array.isArray(opts.requires)
      ? { core: '>=0.1.0', plugins: opts.requires }
      : { core: opts.requires?.core ?? '>=0.1.0', ...opts.requires };

    const manifest = {
      id,
      name: id,
      version: '1.0.0',
      requires,
      entry: './src/provider',
    };

    await writeFile(join(pluginDir, 'plugin.json'), JSON.stringify(manifest, null, 2));

    const providerContent = `export default {
  register(ctx) {
    ctx.menu.add({ id: '${id}', title: '${id}', url: '/admin/${id}', order: 1 });
  }
};`;
    await writeFile(join(pluginDir, 'src/provider.ts'), providerContent);

    if (opts.migrations) {
      for (const [name, content] of Object.entries(opts.migrations)) {
        await writeFile(join(pluginDir, `database/migrations/${name}.ts`), content);
      }
    }
  };

  const opts = (): PreparePluginsOptions => ({
    db,
    pluginsDir: root,
    mode: 'source',
    coreVersion: CORE_VERSION,
    packages: {},
    warn: vi.fn(),
  });

  it('loads only active plugins, in dependency order, and runs their migrations', async () => {
    await writePlugin(root, 'page', { migrations: { '0001_a': createTable('page_a') } });
    await writePlugin(root, 'blog', {
      requires: ['page'],
      migrations: { '0001_a': createTable('blog_a') },
    });
    await writePlugin(root, 'off', { migrations: { '0001_a': createTable('off_a') } });
    await markActive(t.url, ['blog', 'page']);

    const loaded = await preparePlugins(opts());
    expect(loaded.map((p) => p.manifest.id)).toEqual(['page', 'blog']);

    const owners = await db.selectFrom('migrations').select('owner').orderBy('id').execute();
    expect(owners.map((r) => r.owner)).toEqual(['core', 'plugin:page', 'plugin:blog']);
  });

  it('applies a new migration of an already-active plugin on the next boot', async () => {
    await writePlugin(root, 'page', { migrations: { '0001_a': createTable('page_a') } });
    await markActive(t.url, ['page']);
    await preparePlugins(opts());

    await writeFile(join(root, 'page/database/migrations/0002_b.ts'), createTable('page_b'));
    await preparePlugins(opts());

    const names = await db
      .selectFrom('migrations')
      .select('name')
      .where('owner', '=', 'plugin:page')
      .orderBy('id')
      .execute();
    expect(names.map((r) => r.name)).toEqual(['0001_a', '0002_b']);
  });

  it('warns and skips an active plugin whose folder is gone', async () => {
    await markActive(t.url, ['ghost']);
    const warn = vi.fn();
    expect(await preparePlugins({ ...opts(), warn })).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      `Plugin "ghost" is marked active but was not found in ${root}; skipping.`
    );
  });

  it('fails on an active plugin with an invalid manifest, warns on an inactive one', async () => {
    await mkdir(join(root, 'broken'));
    await writeFile(join(root, 'broken/plugin.json'), '{');
    await mkdir(join(root, 'junk'));
    await writeFile(join(root, 'junk/plugin.json'), '{');
    await markActive(t.url, ['broken']);

    const warn = vi.fn();
    await expect(preparePlugins({ ...opts(), warn })).rejects.toThrow(
      /^Plugin "broken" is active but its manifest is invalid: /
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/^Ignoring invalid plugin folder "junk": /)
    );
  });

  it('rejects an active plugin whose dependency is inactive', async () => {
    await writePlugin(root, 'page');
    await writePlugin(root, 'blog', { requires: ['page'] });
    await markActive(t.url, ['blog']);
    await expect(preparePlugins(opts())).rejects.toThrow(
      'Plugin "blog" requires plugin "page", which is not active.'
    );
  });
});
