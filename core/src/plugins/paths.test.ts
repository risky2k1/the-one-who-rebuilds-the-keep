import { describe, expect, it } from 'vitest';
import { resolvePluginFile } from './paths.js';

describe('paths', () => {
  it('maps entry per mode', () => {
    expect(
      resolvePluginFile('/p/hello', './src/provider', 'source', 'hello')
    ).toBe('/p/hello/src/provider.ts');
    expect(
      resolvePluginFile('/p/hello', './src/provider', 'dist', 'hello')
    ).toBe('/p/hello/dist/src/provider.js');
  });

  it('rejects paths escaping the plugin folder', () => {
    expect(() =>
      resolvePluginFile('/p/hello', './../evil', 'source', 'hello')
    ).toThrow('Plugin "hello" path "./../evil" resolves outside the plugin folder.');
  });
});
