import { describe, expect, it } from 'vitest';
import pkg from '../package.json' with { type: 'json' };
import { CORE_VERSION } from './version.js';

describe('CORE_VERSION', () => {
  it('matches core/package.json', () => {
    expect(CORE_VERSION).toBe(pkg.version);
    expect(CORE_VERSION).toBe('0.1.0');
  });
});
