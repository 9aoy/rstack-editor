import { fileURLToPath } from 'node:url';
import { expect, it } from '@rstest/core';
import { rstackResolveHookImportArgs } from '../../src/shared/rstackResolveHook';

it('carries both paths through one --import URL intact', () => {
  const hookPath = '/opt/my extension/dist/rstack-resolve-hook.mjs';
  const packageJsonPath = '/ws/my infra/node_modules/rstack/package.json';

  const [flag, href] = rstackResolveHookImportArgs(hookPath, packageJsonPath);

  expect(flag).toBe('--import');
  // What the preload reads from `import.meta.url`.
  const url = new URL(href);
  expect(url.searchParams.get('pkg')).toBe(packageJsonPath);
  expect(fileURLToPath(url)).toBe(hookPath);
});
