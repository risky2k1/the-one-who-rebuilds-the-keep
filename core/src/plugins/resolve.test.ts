import { describe, expect, it } from 'vitest';
import type { PluginManifest } from './manifest.js';
import { PluginResolutionError, resolveLoadOrder } from './resolve.js';

describe('resolveLoadOrder', () => {
  const m = (
    id: string,
    plugins: string[] = [],
    extra: Partial<PluginManifest['requires']> = {}
  ): PluginManifest => ({
    id,
    name: id,
    version: '1.0.0',
    requires: { core: '>=0.1.0', plugins, ...extra },
    entry: './src/provider',
  });

  const env = (ids: string[]) => ({
    installed: new Set(ids),
    coreVersion: '0.1.0',
    packages: { slug: '1.2.0' },
  });

  it('orders dependencies first, deterministically', () => {
    const out = resolveLoadOrder(
      [m('blog', ['page', 'seo']), m('seo'), m('page')],
      env(['blog', 'seo', 'page'])
    );
    expect(out.map((p) => p.id)).toEqual(['page', 'seo', 'blog']);
  });

  it('detects cycles', () => {
    expect(() =>
      resolveLoadOrder([m('b', ['a']), m('a', ['b'])], env(['a', 'b']))
    ).toThrow('Dependency cycle: a -> b -> a');
  });

  it('rejects missing and inactive plugin dependencies together', () => {
    try {
      resolveLoadOrder([m('blog', ['page', 'media'])], env(['blog', 'page']));
      expect.fail('should have thrown PluginResolutionError');
    } catch (e) {
      expect((e as PluginResolutionError).problems).toEqual([
        'Plugin "blog" requires plugin "media", which is not installed.',
        'Plugin "blog" requires plugin "page", which is not active.',
      ]);
    }
  });

  it('checks core and package ranges', () => {
    expect(() =>
      resolveLoadOrder([m('x', [], { core: '>=2.0.0' })], env(['x']))
    ).toThrow('Plugin "x" requires core >=2.0.0, but core is 0.1.0.');

    expect(() =>
      resolveLoadOrder(
        [m('x', [], { packages: { slug: '>=2.0.0' } })],
        env(['x'])
      )
    ).toThrow('Plugin "x" requires package "slug" >=2.0.0, but "slug" is 1.2.0.');

    expect(() =>
      resolveLoadOrder(
        [m('x', [], { packages: { seo: '*' } })],
        env(['x'])
      )
    ).toThrow('Plugin "x" requires package "seo" *, which is not installed.');
  });
});
