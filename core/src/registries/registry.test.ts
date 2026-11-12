import { describe, expect, it } from 'vitest';
import { Registry, createRegistries } from './registry.js';

describe('Registry', () => {
  it('keeps insertion order', () => {
    const r = new Registry<{ id: string }>('menu');
    r.add({ id: 'b' });
    r.add({ id: 'a' });
    expect(r.all().map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('rejects duplicate ids', () => {
    const r = new Registry<{ id: string }>('menu');
    r.add({ id: 'a' });
    expect(() => r.add({ id: 'a' })).toThrow('Duplicate id "a" in menu registry');
  });

  it('rejects add after freeze', () => {
    const r = new Registry<{ id: string }>('permissions');
    r.freeze();
    expect(r.isFrozen).toBe(true);
    expect(() => r.add({ id: 'x' })).toThrow('permissions registry is frozen');
  });

  it('createRegistries returns empty, unfrozen registries', () => {
    const regs = createRegistries();
    expect(regs.permissions.all()).toEqual([]);
    expect(regs.menu.isFrozen).toBe(false);
  });
});
