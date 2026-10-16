import { pathToFileURL } from 'node:url';

/**
 * The spawn env of a process that loads `rstack.config.*` while
 * `rstack.rstackCli.packagePath` selected the `rstack` it runs (#103). The
 * config's own `import 'rstack'` resolves from the config file, where that
 * installation is not visible; the preloaded hook
 * (`rstackResolveHookPreload.mjs`) hands the specifier to Node's resolver
 * from inside the configured package, so the config binds to the same
 * installation. It bridges: nothing a package-manager shim does (`NODE_PATH`)
 * and no file inside `rstack` is reproduced here.
 *
 * `NODE_OPTIONS` is appended to, so a user's own flags keep applying. The hook
 * is passed as a `file:` URL because `NODE_OPTIONS` splits on spaces.
 */
export function withRstackResolveHook(
  baseEnv: NodeJS.ProcessEnv,
  packageJsonPath: string,
  hookPath: string,
): NodeJS.ProcessEnv {
  const importFlag = `--import ${pathToFileURL(hookPath).href}`;
  return {
    ...baseEnv,
    NODE_OPTIONS: baseEnv.NODE_OPTIONS
      ? `${baseEnv.NODE_OPTIONS} ${importFlag}`
      : importFlag,
    // Read by the hook.
    RSTACK_EDITOR_RSTACK_PACKAGE_JSON: packageJsonPath,
  };
}
