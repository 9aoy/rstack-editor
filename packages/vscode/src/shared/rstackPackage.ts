import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

/** The `not-installed` log's pointer to the setting, for every rstack caller. */
export const RSTACK_PACKAGE_PATH_HINT = `if it is installed elsewhere, set "${RSTACK_PACKAGE_PATH_SETTING}" to it`;

/** Whether the setting chose the package, which decides the resolve hook. */
export type RstackPackageSource = 'setting' | 'walk-up';

export type RstackPackageResolution =
  | {
      readonly kind: 'found';
      readonly packageJsonPath: string;
      /** The parsed package.json, read once for every consumer. */
      readonly pkg: Record<string, unknown> | undefined;
      readonly source: RstackPackageSource;
    }
  | { readonly kind: 'not-installed' }
  | { readonly kind: 'invalid-setting'; readonly message: string };

export interface ResolveRstackPackageOptions {
  /**
   * The setting's value, `${workspaceFolder}` already expanded; unset means
   * "walk up from `searchFrom`".
   */
  readonly configured: string | undefined;
  /** The workspace folder root; relative settings resolve from it. */
  readonly folderRoot: string;
  /** Where the default `node_modules` walk-up starts; defaults to `folderRoot`. */
  readonly searchFrom?: string;
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
  searchFrom = folderRoot,
}: ResolveRstackPackageOptions): RstackPackageResolution => {
  if (configured === undefined) {
    const packageJsonPath = findPackageJsonUncached('rstack', searchFrom);
    return packageJsonPath === undefined
      ? { kind: 'not-installed' }
      : {
          kind: 'found',
          packageJsonPath,
          pkg: readPackageJson(packageJsonPath),
          source: 'walk-up',
        };
  }

  const resolved = path.resolve(folderRoot, configured);
  const configuredPath = configured.endsWith('package.json')
    ? resolved
    : path.join(resolved, 'package.json');
  let packageJsonPath: string;
  try {
    if (!fs.statSync(configuredPath).isFile()) throw new Error('not a file');
    packageJsonPath = fs.realpathSync(configuredPath);
  } catch {
    return invalidSetting(configuredPath, 'does not exist');
  }
  const pkg = readPackageJson(packageJsonPath);
  if (pkg?.name !== 'rstack') {
    return invalidSetting(configuredPath, 'is not the "rstack" package');
  }
  return { kind: 'found', packageJsonPath, pkg, source: 'setting' };
};

/**
 * The resolve hook as node args, for a process that loads `rstack.config.*`
 * while the setting chose its `rstack`: the config's own `import 'rstack'`
 * resolves from the config file, where that installation is not visible. The
 * preloaded hook (`rstackResolveHookPreload.mjs`) hands the specifier to
 * Node's resolver from inside the configured package; nothing a
 * package-manager shim does (`NODE_PATH`) and no file inside `rstack` is
 * reproduced. A node arg rather than env, so it reaches exactly the spawned
 * process and fits a terminal command line; the package.json path rides in
 * the URL's `pkg` query, keeping the flag one argv element.
 */
export function rstackResolveHookImportArgs(
  hookPath: string,
  packageJsonPath: string,
): string[] {
  const url = pathToFileURL(hookPath);
  url.searchParams.set('pkg', packageJsonPath);
  return ['--import', url.href];
}

/**
 * The hook args (before the script path) for the rstack at `rstackDirectory`:
 * none unless the setting chose it.
 */
export const rstackResolveHookArgs = (
  rstackDirectory: string | undefined,
  source: RstackPackageSource | undefined,
): string[] =>
  rstackDirectory === undefined || source !== 'setting'
    ? []
    : rstackResolveHookImportArgs(
        // Copied beside the bundles by `rslib.config.mts`.
        path.resolve(__dirname, 'rstack-resolve-hook.mjs'),
        path.join(rstackDirectory, 'package.json'),
      );
