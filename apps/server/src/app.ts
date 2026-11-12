import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  createDb,
  createRegistries,
  preparePlugins,
  registerPlugins,
  CORE_VERSION,
  type PluginMode,
  type Registries,
} from '@keep/core';
import { AppModule } from './app.module.js';

/**
 * Options for bootstrapping the NestJS application instance.
 */
export interface CreateAppOptions {
  databaseUrl: string;
  pluginsDir: string;
  mode: PluginMode;
  logger?: false;
}

/**
 * Creates and initializes the NestFastify application, orchestrating the two-stage plugin bootstrap.
 */
export async function createApp(opts: CreateAppOptions): Promise<{
  app: NestFastifyApplication;
  registries: Registries;
}> {
  const db = createDb(opts.databaseUrl);
  const registries = createRegistries();

  try {
    const warn =
      opts.logger === false
        ? () => {}
        : (msg: string) => Logger.warn(msg, 'PluginManager');

    const plugins = await preparePlugins({
      db,
      pluginsDir: opts.pluginsDir,
      mode: opts.mode,
      coreVersion: CORE_VERSION,
      packages: {},
      warn,
    });

    await registerPlugins(plugins, registries);

    const app = await NestFactory.create<NestFastifyApplication>(
      AppModule.forRoot({
        db,
        registries,
        plugins,
      }),
      new FastifyAdapter(),
      opts.logger === false ? { logger: false } : {}
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return { app, registries };
  } catch (err: unknown) {
    await db.destroy();
    throw err;
  }
}
