import fs from 'node:fs';
import path from 'node:path';
import { findPackageJsonUncached, readPackageJson } from './packageResolve';

/**
 * Where an `rstack` (rstack-cli) installation lives that the default walk-up
 * cannot see — e.g. a monorepo that installs its tooling under `infra/` while
 * `rstack.config.*` sits at the root (#103). One setting for every consumer
 * of the package: the `rs fmt` server, and the lint and test stacks when a
 * root `rstack.config.*` bridges them. Detection does not read it — it only
 * changes where resolution looks, like the per-tool `corePath` overrides.
 */
export const RSTACK_PACKAGE_PATH_SETTING = 'rstack.rstackCli.packagePath';

export type RstackPackageResolution =
  | { readonly kind: 'found'; readonly packageJsonPath: string }
  | { readonly kind: 'not-installed' }
  | { readonly kind: 'invalid-setting'; readonly message: string };

export interface ResolveRstackPackageOptions {
  /**
   * The setting's value, `${workspaceFolder}` already expanded; unset or
   * blank means "walk up from `searchFrom`".
   */
  readonly configured: string | undefined;
  /** The workspace folder root; relative settings resolve from it. */
  readonly folderRoot: string;
  /** Where the default `node_modules` walk-up starts. */
  readonly searchFrom: string;
}

const invalidSetting = (
  configuredPath: string,
  problem: string,
): RstackPackageResolution => ({
  kind: 'invalid-setting',
  message: `The "${RSTACK_PACKAGE_PATH_SETTING}" setting points at ${configuredPath}, which ${problem}. Update the setting to an installed "rstack" package directory or its package.json, or clear it to use the nearest installation.`,
});

/**
 * Locates `rstack/package.json` for one consumer. A configured path wins and
 * is never second-guessed by the walk-up: a setting that does not resolve is
 * a mistake in the setting (`invalid-setting`), not a missing install, so it
 * must not take the not-installed state (AGENTS.md).
 *
 * The returned path is a realpath, the same as `findPackageJsonUncached`
 * returns: the lint and test stacks resolve their tool cores *from* the
 * rstack directory, and under pnpm only the store path has rstack's own
 * dependencies beside it.
 */
export const resolveRstackPackageJson = ({
  configured,
  folderRoot,
  searchFrom,
}: ResolveRstackPackageOptions): RstackPackageResolution => {
  const value = configured?.trim();
  if (!value) {
    const packageJsonPath = findPackageJsonUncached('rstack', searchFrom);
    return packageJsonPath === undefined
      ? { kind: 'not-installed' }
      : { kind: 'found', packageJsonPath };
  }

  const resolved = path.resolve(folderRoot, value);
  const configuredPath = value.endsWith('package.json')
    ? resolved
    : path.join(resolved, 'package.json');
  let packageJsonPath: string;
  try {
    if (!fs.statSync(configuredPath).isFile()) throw new Error('not a file');
    packageJsonPath = fs.realpathSync(configuredPath);
  } catch {
    return invalidSetting(configuredPath, 'does not exist');
  }
  if (readPackageJson(packageJsonPath)?.name !== 'rstack') {
    return invalidSetting(configuredPath, 'is not the "rstack" package');
  }
  return { kind: 'found', packageJsonPath };
};
