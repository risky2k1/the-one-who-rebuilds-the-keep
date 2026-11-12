import { describe, expect, it, beforeEach } from 'vitest';
import type { ModuleRef } from '@nestjs/core';
import { createRegistries } from '../registries/registry.js';
import { registerPlugins, bootPlugins } from './lifecycle.js';
import type { LoadedPlugin } from './service-provider.js';

describe('lifecycle', () => {
  const trace: string[] = [];
  const plugin = (id: string, fail?: 'register' | 'boot'): LoadedPlugin => ({
    manifest: {
      id,
      name: id,
      version: '1.0.0',
      requires: { core: '*' },
      entry: './src/provider',
    },
    dir: `/p/${id}`,
    provider: {
      register: (ctx) => {
        if (fail === 'register') throw new Error('nope');
        trace.push(`register:${ctx.pluginId}`);
        ctx.menu.add({ id, title: id, url: `/admin/${id}`, order: 1 });
      },
      boot: () => {
        if (fail === 'boot') throw new Error('nope');
        trace.push(`boot:${id}`);
      },
    },
  });

  beforeEach(() => {
    trace.length = 0;
  });

  it('registers then boots in order and freezes', async () => {
    const regs = createRegistries();
    const ps = [plugin('a'), plugin('b')];
    await registerPlugins(ps, regs);
    await bootPlugins(ps, regs, {} as ModuleRef);
    expect(trace).toEqual(['register:a', 'register:b', 'boot:a', 'boot:b']);
    expect(regs.menu.all().map((i) => i.id)).toEqual(['a', 'b']);
    expect(regs.menu.isFrozen && regs.permissions.isFrozen).toBe(true);
  });

  it('names the failing plugin', async () => {
    await expect(
      registerPlugins([plugin('a', 'register')], createRegistries())
    ).rejects.toThrow('Plugin "a" failed in register(): nope');
  });
});
