import { randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';

/**
 * Creates an isolated test database on MySQL for integration testing.
 */
export async function createTestDatabase(): Promise<{
  url: string;
  drop(): Promise<void>;
}> {
  const adminUrlStr = process.env.KEEP_TEST_ADMIN_URL;
  if (!adminUrlStr) {
    throw new Error('Missing environment variable KEEP_TEST_ADMIN_URL');
  }

  const dbName = `keep_test_${randomUUID().replace(/-/g, '')}`;

  const adminConn = await mysql.createConnection(adminUrlStr);
  try {
    await adminConn.execute(
      `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminConn.end();
  }

  const targetUrl = new URL(adminUrlStr);
  targetUrl.pathname = `/${dbName}`;
  const url = targetUrl.toString();

  return {
    url,
    drop: async () => {
      const dropConn = await mysql.createConnection(adminUrlStr);
      try {
        await dropConn.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      } finally {
        await dropConn.end();
      }
    },
  };
}
