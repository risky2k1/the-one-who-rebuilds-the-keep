import { describe, expect, it } from 'vitest';
import { readEnv } from './env.js';

describe('readEnv', () => {
  it('requires KEEP_DATABASE_URL', () =>
    expect(() => readEnv({})).toThrow('Missing environment variable KEEP_DATABASE_URL'));

  it('defaults the port to 8084', () =>
    expect(readEnv({ KEEP_DATABASE_URL: 'mysql://x' })).toEqual({
      port: 8084,
      databaseUrl: 'mysql://x',
    }));

  it('rejects a bad port', () =>
    expect(() =>
      readEnv({ KEEP_DATABASE_URL: 'mysql://x', KEEP_PORT: 'abc' })
    ).toThrow('KEEP_PORT must be an integer between 1 and 65535'));
});
