import path from 'node:path';
import vscode from 'vscode';
import { expandWorkspaceFolder } from './nodeExecutableSetting';
import { RSTACK_PACKAGE_PATH_SETTING } from './rstackPackage';
import { withRstackResolveHook } from './rstackResolveHook';

/**
 * Reads `rstack.rstackCli.packagePath` for a resource (a folder, or a document
 * inside one — the setting is resource-scoped), `${workspaceFolder}` expanded.
 * Returns `undefined` when unset or blank. Kept apart from `rstackPackage.ts`
 * so the resolution itself stays testable without a `vscode` stub, the same
 * split as `nodeExecutableSetting.ts` / `nodeResolution.ts`.
 */
export const getConfiguredRstackPackagePath = (
  folder: vscode.WorkspaceFolder,
  resource: vscode.Uri = folder.uri,
): string | undefined => {
  const value = vscode.workspace
    .getConfiguration(undefined, resource)
    .get(RSTACK_PACKAGE_PATH_SETTING);
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  return expandWorkspaceFolder(value, folder);
};

/**
 * The env for a spawned process that loads `rstack.config.*` with the rstack
 * at `rstackDirectory`: `baseEnv` plus the resolve hook when the setting chose
 * that rstack (`withRstackResolveHook`), otherwise `undefined`.
 */
export const rstackResolveHookEnv = (
  folder: vscode.WorkspaceFolder,
  rstackDirectory: string | undefined,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv | undefined =>
  rstackDirectory === undefined ||
  getConfiguredRstackPackagePath(folder) === undefined
    ? undefined
    : withRstackResolveHook(
        baseEnv,
        path.join(rstackDirectory, 'package.json'),
        // Copied beside the bundles by `rslib.config.mts`.
        path.resolve(__dirname, 'rstack-resolve-hook.mjs'),
      );
