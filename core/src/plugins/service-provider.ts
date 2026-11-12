import type { Provider, Type } from '@nestjs/common';
import type { ModuleRef } from '@nestjs/core';
import type { Registry } from '../registries/registry.js';
import type { AdminMenuItem, PermissionNode } from '../registries/types.js';
import type { PluginManifest } from './manifest.js';

/**
 * Execution mode for plugin source loading.
 * 'source' loads raw TypeScript (.ts) files via SWC loader.
 * 'dist' loads compiled JavaScript (.js) files in production.
 */
export type PluginMode = 'source' | 'dist';

/**
 * Context provided to a plugin during its register() phase.
 */
export interface RegisterContext {
  pluginId: string;
  permissions: Registry<PermissionNode>;
  menu: Registry<AdminMenuItem>;
}

/**
 * Context provided to a plugin during its boot() phase.
 */
export interface BootContext extends RegisterContext {
  moduleRef: ModuleRef;
}

/**
 * Lifecycle contract and NestJS integration exported by each plugin.
 */
export interface ServiceProvider {
  controllers?: Type<unknown>[];
  providers?: Provider[];
  register?(ctx: RegisterContext): void | Promise<void>;
  boot?(ctx: BootContext): void | Promise<void>;
}

/**
 * Discovered and instantiated plugin definition ready for registration.
 */
export interface LoadedPlugin {
  manifest: PluginManifest;
  dir: string;
  provider: ServiceProvider;
}
