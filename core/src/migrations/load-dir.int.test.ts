import { describe, it, expect, beforeEach } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadMigrationsFromDir } from './load-dir.js';
import { makeTmpDir } from '../../../test/support/tmp.js';

describe('loadMigrationsFromDir', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await makeTmpDir('load-dir-test');
    await writeFile(join(dir, '0002_b.ts'), 'export async function up() {}');
    await writeFile(join(dir, '0001_a.ts'), 'export async function up() {}');
    await writeFile(join(dir, 'notes.md'), '# notes');
    await writeFile(join(dir, 'x.d.ts'), 'export type X = number;');
  });

  it('loads .ts migrations sorted by name', async () => {
    expect((await loadMigrationsFromDir(dir, '.ts')).map((m) => m.name)).toEqual([
      '0001_a',
      '0002_b',
    ]);
  });

  it('returns [] for a missing directory', async () => {
    expect(await loadMigrationsFromDir(join(dir, 'nope'), '.ts')).toEqual([]);
  });

  it('rejects a file without up()', async () => {
    await writeFile(join(dir, '0003_c.ts'), 'export const x = 1;');
    await expect(loadMigrationsFromDir(dir, '.ts')).rejects.toThrow(
      /has no up\(\) export/
    );
  });
});
