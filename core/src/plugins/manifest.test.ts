import { describe, expect, it } from 'vitest';
import { parseManifest } from './manifest.js';

describe('parseManifest', () => {
  const ok = {
    id: 'blog',
    name: 'Blog',
    version: '1.0.0',
    requires: { core: '>=0.1.0', plugins: ['page'] },
    entry: './src/provider',
  };

  it('accepts a valid manifest', () => {
    expect(parseManifest(ok)).toEqual(ok);
  });

  it.each([
    [{ ...ok, id: 'Blog' }, 'id'],
    [{ ...ok, version: 'one' }, 'version'],
    [{ ...ok, requires: { core: 'banana' } }, 'requires.core'],
    [{ ...ok, entry: './src/provider.ts' }, 'entry'],
    [{ ...ok, extra: 1 }, 'extra'],
  ])('rejects %o (field %s)', (raw, field) => {
    expect(() => parseManifest(raw)).toThrow(/^Invalid manifest: .*/);
    expect(() => parseManifest(raw)).toThrow(new RegExp(field.replace('.', '\\.')));
  });
});
