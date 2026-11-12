import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const tmpBase = join(repoRoot, '.tmp');

/**
 * Creates an isolated temporary directory inside <repo>/.tmp/.
 */
export async function makeTmpDir(prefix: string): Promise<string> {
  const dir = join(tmpBase, `${prefix}-${randomUUID()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}
