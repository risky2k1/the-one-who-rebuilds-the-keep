import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { cruise, type ICruiseResult } from 'dependency-cruiser';

describe('architecture rules', () => {
  it('flags core importing a plugin', async () => {
    // @ts-expect-error CJS config file has no declaration file
    const ruleSet = (await import('../.dependency-cruiser.cjs')).default.forbidden;
    const fixture = fileURLToPath(
      new URL('./fixtures/arch-violation', import.meta.url)
    );
    const res = await cruise(['core', 'plugins'], {
      baseDir: fixture,
      ruleSet: { forbidden: ruleSet },
      validate: true,
    });
    const names = (res.output as ICruiseResult).summary.violations.map(
      (v) => v.rule.name
    );
    expect(names).toContain('core-no-outer');
  });
});
