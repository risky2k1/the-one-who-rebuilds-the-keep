import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { parseManifest, type PluginManifest } from './manifest.js';

/**
 * Valid discovered plugin.
 */
export interface DiscoveredPlugin {
  manifest: PluginManifest;
  dir: string;
}

/**
 * Discovered plugin with invalid manifest or configuration.
 */
export interface InvalidPlugin {
  folder: string;
  dir: string;
  reason: string;
}

/**
 * Scans pluginsDir for plugin folders containing plugin.json.
 */
export async function discoverPlugins(
  pluginsDir: string
): Promise<{ plugins: DiscoveredPlugin[]; invalid: InvalidPlugin[] }> {
  try {
    const s = await stat(pluginsDir);
    if (!s.isDirectory()) {
      return { plugins: [], invalid: [] };
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { plugins: [], invalid: [] };
    }
    throw err;
  }

  const entries = await readdir(pluginsDir, { withFileTypes: true });
  const plugins: DiscoveredPlugin[] = [];
  const invalid: InvalidPlugin[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const folder = entry.name;
    const dir = join(pluginsDir, folder);
    const manifestPath = join(dir, 'plugin.json');

    let manifestContent: string;
    try {
      manifestContent = await readFile(manifestPath, 'utf8');
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        // Thư mục không có plugin.json thì bỏ qua
        continue;
      }
      invalid.push({
        folder,
        dir,
        reason: (err as Error).message,
      });
      continue;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(manifestContent);
    } catch (err: unknown) {
      invalid.push({
        folder,
        dir,
        reason: (err as Error).message,
      });
      continue;
    }

    let manifest: PluginManifest;
    try {
      manifest = parseManifest(parsedJson);
    } catch (err: unknown) {
      invalid.push({
        folder,
        dir,
        reason: (err as Error).message,
      });
      continue;
    }

    if (manifest.id !== folder) {
      invalid.push({
        folder,
        dir,
        reason: `Folder "${folder}" has manifest id "${manifest.id}"; they must match.`,
      });
      continue;
    }

    plugins.push({ manifest, dir });
  }

  plugins.sort((a, b) => a.manifest.id.localeCompare(b.manifest.id));
  return { plugins, invalid };
}
