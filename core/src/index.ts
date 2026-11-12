export { CORE_VERSION } from './version.js';
export { Registry, createRegistries } from './registries/registry.js';
export type { AdminMenuItem, PermissionNode, Registries } from './registries/types.js';
export { manifestSchema, parseManifest } from './plugins/manifest.js';
export type { PluginManifest } from './plugins/manifest.js';
export { discoverPlugins } from './plugins/discover.js';
export type { DiscoveredPlugin, InvalidPlugin } from './plugins/discover.js';
export { PluginResolutionError, resolveLoadOrder } from './plugins/resolve.js';
export type { ResolveEnvironment } from './plugins/resolve.js';
export { createDb } from './db/database.js';
export { coreMigrations } from './db/core-migrations.js';
export { runMigrations } from './migrations/runner.js';
export { loadMigrationsFromDir } from './migrations/load-dir.js';
export type {
  CoreTables,
  Migration,
  MigrationSet,
  MigrationsTable,
  PluginsStateTable,
} from './migrations/types.js';
