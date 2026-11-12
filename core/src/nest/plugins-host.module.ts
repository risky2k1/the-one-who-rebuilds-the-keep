import { Module, type DynamicModule } from '@nestjs/common';
import type { LoadedPlugin } from '../plugins/service-provider.js';

/**
 * Dynamic module aggregating controllers and providers from active plugins.
 */
@Module({})
export class PluginsHostModule {
  static forPlugins(plugins: LoadedPlugin[]): DynamicModule {
    const controllers = plugins.flatMap((p) => p.provider.controllers ?? []);
    const providers = plugins.flatMap((p) => p.provider.providers ?? []);

    return {
      module: PluginsHostModule,
      controllers,
      providers,
      exports: providers,
    };
  }
}
