import semver from 'semver';
import type { PluginManifest } from './manifest.js';

/**
 * Error thrown when plugin dependencies cannot be resolved.
 */
export class PluginResolutionError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join('\n'));
    this.name = 'PluginResolutionError';
  }
}

/**
 * Environment configuration for resolving plugin dependencies.
 */
export interface ResolveEnvironment {
  installed: ReadonlySet<string>;
  coreVersion: string;
  packages: Record<string, string>;
}

/**
 * Resolves the topological load order of active plugins while validating all dependencies.
 */
export function resolveLoadOrder(
  active: PluginManifest[],
  env: ResolveEnvironment
): PluginManifest[] {
  const activeMap = new Map<string, PluginManifest>(
    active.map((p) => [p.id, p])
  );
  const sortedActive = [...active].sort((a, b) => a.id.localeCompare(b.id));
  const problems: string[] = [];

  for (const plugin of sortedActive) {
    // 1. Check core version
    if (!semver.satisfies(env.coreVersion, plugin.requires.core)) {
      problems.push(
        `Plugin "${plugin.id}" requires core ${plugin.requires.core}, but core is ${env.coreVersion}.`
      );
    }

    // 2. Check packages
    if (plugin.requires.packages) {
      const pkgEntries = Object.entries(plugin.requires.packages).sort(
        ([a], [b]) => a.localeCompare(b)
      );
      for (const [pkg, range] of pkgEntries) {
        if (!(pkg in env.packages)) {
          problems.push(
            `Plugin "${plugin.id}" requires package "${pkg}" ${range}, which is not installed.`
          );
        } else if (!semver.satisfies(env.packages[pkg], range)) {
          problems.push(
            `Plugin "${plugin.id}" requires package "${pkg}" ${range}, but "${pkg}" is ${env.packages[pkg]}.`
          );
        }
      }
    }

    // 3. Check plugin dependencies
    if (plugin.requires.plugins) {
      const sortedDeps = [...plugin.requires.plugins].sort((a, b) =>
        a.localeCompare(b)
      );
      for (const dep of sortedDeps) {
        if (!env.installed.has(dep)) {
          problems.push(
            `Plugin "${plugin.id}" requires plugin "${dep}", which is not installed.`
          );
        } else if (!activeMap.has(dep)) {
          problems.push(
            `Plugin "${plugin.id}" requires plugin "${dep}", which is not active.`
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new PluginResolutionError(problems);
  }

  // 4. Cycle detection & Topological sort using DFS
  const adj = new Map<string, string[]>();
  for (const plugin of sortedActive) {
    const deps = [...(plugin.requires.plugins ?? [])].sort((a, b) =>
      a.localeCompare(b)
    );
    adj.set(plugin.id, deps);
  }

  const visited = new Set<string>();
  const visiting = new Map<string, number>();
  const path: string[] = [];
  const result: PluginManifest[] = [];

  function dfs(nodeId: string): void {
    path.push(nodeId);
    visiting.set(nodeId, path.length - 1);

    const deps = adj.get(nodeId) ?? [];
    for (const dep of deps) {
      if (visiting.has(dep)) {
        const cycleStartIndex = visiting.get(dep)!;
        const cycleNodes = path.slice(cycleStartIndex);
        const minNode = cycleNodes.reduce(
          (min, curr) => (curr.localeCompare(min) < 0 ? curr : min),
          cycleNodes[0]
        );
        const minIdx = cycleNodes.indexOf(minNode);
        const rotated = [
          ...cycleNodes.slice(minIdx),
          ...cycleNodes.slice(0, minIdx),
          minNode,
        ];
        throw new PluginResolutionError([
          `Dependency cycle: ${rotated.join(' -> ')}`,
        ]);
      }
      if (!visited.has(dep)) {
        dfs(dep);
      }
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    path.pop();
    result.push(activeMap.get(nodeId)!);
  }

  for (const plugin of sortedActive) {
    if (!visited.has(plugin.id)) {
      dfs(plugin.id);
    }
  }

  return result;
}
