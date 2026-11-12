import {
  Global,
  Module,
  type DynamicModule,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Kysely } from 'kysely';
import type { CoreTables } from '../migrations/types.js';
import { bootPlugins } from '../plugins/lifecycle.js';
import type { LoadedPlugin } from '../plugins/service-provider.js';
import type { Registries } from '../registries/types.js';
import { PluginsHostModule } from './plugins-host.module.js';
import { KYSELY, REGISTRIES } from './tokens.js';

/**
 * Options for configuring CoreModule.
 */
export interface CoreModuleOptions {
  db: Kysely<CoreTables>;
  registries: Registries;
  plugins: LoadedPlugin[];
}

/**
 * Global NestJS module providing Core infrastructure (DB, Registries) and hosting dynamic plugins.
 */
@Global()
@Module({})
export class CoreModule
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private static options: CoreModuleOptions;

  constructor(private readonly moduleRef: ModuleRef) {}

  static forRoot(opts: CoreModuleOptions): DynamicModule {
    CoreModule.options = opts;

    return {
      global: true,
      module: CoreModule,
      imports: [PluginsHostModule.forPlugins(opts.plugins)],
      providers: [
        {
          provide: KYSELY,
          useValue: opts.db,
        },
        {
          provide: REGISTRIES,
          useValue: opts.registries,
        },
      ],
      exports: [KYSELY, REGISTRIES],
    };
  }

  async onApplicationBootstrap(): Promise<void> {
    const opts = CoreModule.options;
    if (opts) {
      await bootPlugins(opts.plugins, opts.registries, this.moduleRef);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    const opts = CoreModule.options;
    if (opts?.db) {
      await opts.db.destroy();
    }
  }
}
