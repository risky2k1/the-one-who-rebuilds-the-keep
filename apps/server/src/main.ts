import 'reflect-metadata';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { readEnv } from './env.js';

async function bootstrap(): Promise<void> {
  const env = readEnv(process.env);
  const mode = import.meta.url.endsWith('.ts') ? 'source' : 'dist';
  const pluginsDir = fileURLToPath(new URL('../../../plugins', import.meta.url));

  const { app } = await createApp({
    databaseUrl: env.databaseUrl,
    pluginsDir,
    mode,
  });

  app.enableShutdownHooks();
  await app.listen(env.port, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
