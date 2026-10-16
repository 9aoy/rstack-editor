import { pathToFileURL } from 'node:url';

/**
 * The node args for a process that loads `rstack.config.*` while
 * `rstack.rstackCli.packagePath` selected the `rstack` it runs (#103). The
 * config's own `import 'rstack'` resolves from the config file, where that
 * installation is not visible; the preloaded hook
 * (`rstackResolveHookPreload.mjs`) hands the specifier to Node's resolver
 * from inside the configured package, so the config binds to the same
 * installation. It bridges: nothing a package-manager shim does (`NODE_PATH`)
 * and no file inside `rstack` is reproduced here.
 *
 * An explicit node arg rather than env, so it reaches exactly the spawned
 * process and also fits a terminal command line. The package.json path rides
 * in the hook URL's `pkg` query, keeping the flag a single argv element.
 */
export function rstackResolveHookImportArgs(
  hookPath: string,
  packageJsonPath: string,
): string[] {
  const url = pathToFileURL(hookPath);
  url.searchParams.set('pkg', packageJsonPath);
  return ['--import', url.href];
}
