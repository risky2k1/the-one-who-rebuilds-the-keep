import type { ModuleRef } from '@nestjs/core';
import type { Registries } from '../registries/types.js';
import type {
  BootContext,
  LoadedPlugin,
  RegisterContext,
} from './service-provider.js';

/**
 * Registers active plugins in topological load order.
 */
export async function registerPlugins(
  plugins: LoadedPlugin[],
  registries: Registries
): Promise<void> {
  for (const plugin of plugins) {
    if (!plugin.provider.register) {
      continue;
    }

    const ctx: RegisterContext = {
      pluginId: plugin.manifest.id,
      permissions: registries.permissions,
      menu: registries.menu,
    };

    try {
      await plugin.provider.register(ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Plugin "${plugin.manifest.id}" failed in register(): ${msg}`,
        {
          cause: err,
        }
      );
    }
  }
}

/**
 * Boots active plugins in topological load order and freezes registries upon completion.
 */
export async function bootPlugins(
  plugins: LoadedPlugin[],
  registries: Registries,
  moduleRef: ModuleRef
): Promise<void> {
  for (const plugin of plugins) {
    if (!plugin.provider.boot) {
      continue;
    }

    const ctx: BootContext = {
      pluginId: plugin.manifest.id,
      permissions: registries.permissions,
      menu: registries.menu,
      moduleRef,
    };

    try {
      await plugin.provider.boot(ctx);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Plugin "${plugin.manifest.id}" failed in boot(): ${msg}`,
        {
          cause: err,
        }
      );
    }
  }

  registries.permissions.freeze();
  registries.menu.freeze();
}
