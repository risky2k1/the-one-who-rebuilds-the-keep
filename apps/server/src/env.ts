/**
 * Parses and validates environment variables required by the server application.
 */
export function readEnv(env: NodeJS.ProcessEnv): {
  port: number;
  databaseUrl: string;
} {
  const databaseUrl = env.KEEP_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('Missing environment variable KEEP_DATABASE_URL');
  }

  let port = 8084;
  if (env.KEEP_PORT !== undefined && env.KEEP_PORT !== '') {
    const parsed = Number(env.KEEP_PORT);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      throw new Error('KEEP_PORT must be an integer between 1 and 65535');
    }
    port = parsed;
  }

  return { port, databaseUrl };
}
