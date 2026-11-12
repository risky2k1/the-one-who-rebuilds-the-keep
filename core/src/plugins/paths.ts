import { join, relative as getRelativePath, resolve } from 'node:path';
import type { PluginMode } from './service-provider.js';

/**
 * Resolves a plugin-relative entry path to an absolute path based on execution mode.
 * Throws if the resolved path escapes the plugin directory.
 */
export function resolvePluginFile(
  pluginDir: string,
  relative: string,
  mode: PluginMode,
  pluginId: string
): string {
  const resolvedBase = resolve(pluginDir);
  const targetPath =
    mode === 'source'
      ? resolve(resolvedBase, relative + '.ts')
      : resolve(resolvedBase, 'dist', relative + '.js');

  const rel = getRelativePath(resolvedBase, targetPath);
  if (rel.startsWith('..') || !targetPath.startsWith(resolvedBase)) {
    throw new Error(
      `Plugin "${pluginId}" path "${relative}" resolves outside the plugin folder.`
    );
  }

  return targetPath;
}

/**
 * Returns the migrations directory path for a plugin based on execution mode.
 */
export function pluginMigrationsDir(
  pluginDir: string,
  mode: PluginMode
): string {
  return mode === 'source'
    ? join(pluginDir, 'database/migrations')
    : join(pluginDir, 'dist/database/migrations');
}
