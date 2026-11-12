import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// require is used here because SWC strips ESM import attributes (with { type: 'json' }) during compilation
const pkg = require('../package.json') as { version: string };

/**
 * Current version of @keep/core.
 */
export const CORE_VERSION: string = pkg.version;
