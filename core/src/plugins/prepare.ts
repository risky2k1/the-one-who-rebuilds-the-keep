import type { Kysely } from 'kysely';
import { coreMigrations } from '../db/core-migrations.js';
import { loadMigrationsFromDir } from '../migrations/load-dir.js';
import { runMigrations } from '../migrations/runner.js';
import type { CoreTables, MigrationSet } from '../migrations/types.js';
import { discoverPlugins, type DiscoveredPlugin } from './discover.js';
import { pluginMigrationsDir, resolvePluginFile } from './paths.js';
import { PluginResolutionError, resolveLoadOrder } from './resolve.js';
import type { LoadedPlugin, PluginMode, ServiceProvider } from './service-provider.js';

/**
 * Options for preparing active plugins before NestJS initialization.
 */
export interface PreparePluginsOptions {
  db: Kysely<CoreTables>;
  pluginsDir: string;
  mode: PluginMode;
  coreVersion: string;
  packages: Record<string, string>;
  warn(message: string): void;
}

/**
 * Prepares active plugins: runs core migrations, discovers plugins, filters active plugins,
 * validates dependencies, imports ServiceProviders, and runs pending plugin migrations.
 */
export async function preparePlugins(
  opts: PreparePluginsOptions
): Promise<LoadedPlugin[]> {
  const { db, pluginsDir, mode, coreVersion, packages, warn } = opts;

  // 1. Run core migrations
  await runMigrations(db, [{ owner: 'core', migrations: coreMigrations }]);

  // 2. Discover plugins
  const { plugins: discovered, invalid } = await discoverPlugins(pluginsDir);

  // 3. Read active plugins from plugins_state
  const activeRows = await db
    .selectFrom('plugins_state')
    .select('id')
    .where('status', '=', 'active')
    .execute();
  const activeIds = new Set(activeRows.map((r) => r.id));

  // 4. Handle active vs invalid plugins
  const invalidByFolder = new Map(invalid.map((i) => [i.folder, i]));
  const discoveredById = new Map<string, DiscoveredPlugin>(
    discovered.map((p) => [p.manifest.id, p])
  );
  const manifestErrors: string[] = [];

  // Check invalid plugins
  for (const inv of invalid) {
    if (activeIds.has(inv.folder)) {
      manifestErrors.push(
        `Plugin "${inv.folder}" is active but its manifest is invalid: ${inv.reason}`
      );
    } else {
      warn(`Ignoring invalid plugin folder "${inv.folder}": ${inv.reason}`);
    }
  }

  // Check active plugins missing from disk
  for (const activeId of activeIds) {
    if (!discoveredById.has(activeId) && !invalidByFolder.has(activeId)) {
      warn(
        `Plugin "${activeId}" is marked active but was not found in ${pluginsDir}; skipping.`
      );
    }
  }

  if (manifestErrors.length > 0) {
    throw new PluginResolutionError(manifestErrors);
  }

  // 5. Filter active plugins & resolve load order
  const activeDiscovered = discovered.filter((p) => activeIds.has(p.manifest.id));
  const installedIds = new Set(discovered.map((p) => p.manifest.id));

  const orderedManifests = resolveLoadOrder(
    activeDiscovered.map((p) => p.manifest),
    {
      installed: installedIds,
      coreVersion,
      packages,
    }
  );

  // 6. Import each active plugin's entry
  const loadedPlugins: LoadedPlugin[] = [];
  for (const manifest of orderedManifests) {
    const pluginInfo = discoveredById.get(manifest.id)!;
    const entryFilePath = resolvePluginFile(
      pluginInfo.dir,
      manifest.entry,
      mode,
      manifest.id
    );

    const mod = await import(entryFilePath);
    if (!mod.default || typeof mod.default !== 'object') {
      throw new Error(
        `Plugin "${manifest.id}" entry must default-export a ServiceProvider object.`
      );
    }

    loadedPlugins.push({
      manifest,
      dir: pluginInfo.dir,
      provider: mod.default as ServiceProvider,
    });
  }

  // 7. Run plugin migrations in resolved order
  const migrationSets: MigrationSet[] = [];
  for (const plugin of loadedPlugins) {
    const dir = pluginMigrationsDir(plugin.dir, mode);
    const migrations = await loadMigrationsFromDir(
      dir,
      mode === 'source' ? '.ts' : '.js'
    );
    migrationSets.push({
      owner: `plugin:${plugin.manifest.id}`,
      migrations,
    });
  }

  await runMigrations(db, migrationSets);

  return loadedPlugins;
}
