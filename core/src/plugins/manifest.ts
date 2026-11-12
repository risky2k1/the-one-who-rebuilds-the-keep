import semver from 'semver';
import { z } from 'zod';

const pluginIdRegex = /^[a-z][a-z0-9-]*$/;

export const manifestSchema = z
  .object({
    id: z.string().regex(pluginIdRegex, 'must match /^[a-z][a-z0-9-]*$/'),
    name: z.string().min(1, 'name cannot be empty'),
    version: z.string().refine((val) => semver.valid(val) !== null, {
      message: 'must be valid semver',
    }),
    requires: z
      .object({
        core: z.string().refine((val) => semver.validRange(val) !== null, {
          message: 'must be valid semver range',
        }),
        packages: z
          .record(
            z.string(),
            z.string().refine((val) => semver.validRange(val) !== null, {
              message: 'must be valid semver range',
            })
          )
          .optional(),
        plugins: z.array(z.string().regex(pluginIdRegex)).optional(),
      })
      .strict(),
    entry: z
      .string()
      .refine(
        (val) => val.startsWith('./') && !val.endsWith('.ts') && !val.endsWith('.js'),
        {
          message: 'entry must start with "./" and not end with .ts or .js',
        }
      ),
  })
  .strict();

/**
 * Manifest representation of a plugin.
 */
export type PluginManifest = z.infer<typeof manifestSchema>;

/**
 * Parse and validate raw JSON into a PluginManifest.
 * Throws an Error with all validation issues if invalid.
 */
export function parseManifest(raw: unknown): PluginManifest {
  const res = manifestSchema.safeParse(raw);
  if (!res.success) {
    const issues = res.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    throw new Error(`Invalid manifest: ${issues.join('; ')}`);
  }
  return res.data;
}
