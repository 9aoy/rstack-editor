import type vscode from 'vscode';
import { getConfiguredPathSetting } from './nodeExecutableSetting';
import { RSTACK_PACKAGE_PATH_SETTING } from './rstackPackage';

/**
 * Reads `rstack.rstackCli.packagePath` for a resource (a folder, or a document
 * inside one — the setting is resource-scoped). Kept apart from
 * `rstackPackage.ts` so the resolution itself stays testable without a
 * `vscode` stub, the same split as `nodeExecutableSetting.ts` /
 * `nodeResolution.ts`.
 */
export const getConfiguredRstackPackagePath = (
  folder: vscode.WorkspaceFolder,
  resource?: vscode.Uri,
): string | undefined =>
  getConfiguredPathSetting(RSTACK_PACKAGE_PATH_SETTING, folder, resource);
