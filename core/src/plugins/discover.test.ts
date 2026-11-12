import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { discoverPlugins } from './discover.js';
import { makeTmpDir } from '../../../test/support/tmp.js';

describe('discoverPlugins', () => {
  it('finds valid plugins sorted by id and reports invalid ones', async () => {
    const dir = await makeTmpDir('discover-test');
    await mkdir(join(dir, 'b'));
    await writeFile(
      join(dir, 'b/plugin.json'),
      JSON.stringify({ id: 'b', name: 'B', version: '1.0.0', requires: { core: '>=0.1.0' }, entry: './src/provider' })
    );

    await mkdir(join(dir, 'a'));
    await writeFile(
      join(dir, 'a/plugin.json'),
      JSON.stringify({ id: 'a', name: 'A', version: '1.0.0', requires: { core: '>=0.1.0' }, entry: './src/provider' })
    );

    await mkdir(join(dir, 'bad'));
    await writeFile(join(dir, 'bad/plugin.json'), '{');

    await mkdir(join(dir, 'wrong'));
    await writeFile(
      join(dir, 'wrong/plugin.json'),
      JSON.stringify({ id: 'other', name: 'Other', version: '1.0.0', requires: { core: '>=0.1.0' }, entry: './src/provider' })
    );

    await mkdir(join(dir, 'empty'));

    const { plugins, invalid } = await discoverPlugins(dir);
    expect(plugins.map((p) => p.manifest.id)).toEqual(['a', 'b']);
    expect(invalid.map((i) => i.folder).sort()).toEqual(['bad', 'wrong']);
    expect(invalid.find((i) => i.folder === 'wrong')!.reason).toBe(
      'Folder "wrong" has manifest id "other"; they must match.'
    );
  });

  it('returns empty when the directory does not exist', async () => {
    expect(await discoverPlugins('/nope/keep-plugins')).toEqual({ plugins: [], invalid: [] });
  });
});
