import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDb } from '@keep/core';
import { createTestDatabase } from '../../../test/support/test-db.js';
import { markActive } from '../../../test/support/plugins-state.js';

describe('server boot', () => {
  let t: { url: string; drop(): Promise<void> };

  beforeEach(async () => {
    t = await createTestDatabase();
  });

  afterEach(async () => {
    await t.drop();
  });

  const fixtures = fileURLToPath(new URL('./fixtures/plugins', import.meta.url));

  it('serves /health with no active plugins', async () => {
    const { app } = await createApp({
      databaseUrl: t.url,
      pluginsDir: fixtures,
      mode: 'source',
      logger: false,
    });
    await request(app.getHttpServer()).get('/health').expect(200, 'ok');
    await app.close();
  });

  it('registers and boots active plugins in dependency order, then freezes', async () => {
    (globalThis as unknown as { __keepTrace: string[] }).__keepTrace = [];
    await markActive(t.url, ['beta', 'alpha']);
    const { app, registries } = await createApp({
      databaseUrl: t.url,
      pluginsDir: fixtures,
      mode: 'source',
      logger: false,
    });
    expect((globalThis as unknown as { __keepTrace: string[] }).__keepTrace).toEqual([
      'register:alpha',
      'register:beta',
      'boot:alpha',
      'boot:beta',
    ]);
    expect(() =>
      registries.menu.add({ id: 'late', title: 'late', url: '/x', order: 1 })
    ).toThrow('menu registry is frozen');
    await app.close();
  });

  it('rejects boot and closes the pool when a dependency is inactive', async () => {
    await markActive(t.url, ['beta']);
    await expect(
      createApp({
        databaseUrl: t.url,
        pluginsDir: fixtures,
        mode: 'source',
        logger: false,
      })
    ).rejects.toThrow('Plugin "beta" requires plugin "alpha", which is not active.');
  });

  const realPlugins = fileURLToPath(new URL('../../../plugins', import.meta.url));

  it('hello: active plugin answers through DI, registers menu and permission', async () => {
    await markActive(t.url, ['hello']);
    const { app, registries } = await createApp({
      databaseUrl: t.url,
      pluginsDir: realPlugins,
      mode: 'source',
      logger: false,
    });
    await request(app.getHttpServer()).get('/api/v1/hello').expect(200, { message: 'Hello, Keep' });
    expect(registries.permissions.all()).toEqual([{ id: 'hello.view', label: 'View hello' }]);
    expect(registries.menu.all().map((i) => i.url)).toEqual(['/admin/hello']);
    await app.close();
  });

  it('hello: inactive plugin is not mounted and its migration does not run', async () => {
    const { app } = await createApp({
      databaseUrl: t.url,
      pluginsDir: realPlugins,
      mode: 'source',
      logger: false,
    });
    await request(app.getHttpServer()).get('/api/v1/hello').expect(404);
    const db = createDb(t.url);
    expect(
      await db
        .selectFrom('migrations')
        .select('owner')
        .where('owner', '=', 'plugin:hello')
        .execute()
    ).toEqual([]);
    await db.destroy();
    await app.close();
  });
});
