import { expect, it } from '@rstest/core';
import { withRstackResolveHook } from '../../src/shared/rstackResolveHook';

it("appends the hook to the user's NODE_OPTIONS as a file: URL", () => {
  // A plain path with a space would split inside NODE_OPTIONS.
  const env = withRstackResolveHook(
    { NODE_OPTIONS: '--max-old-space-size=4096' },
    '/ws/infra/node_modules/rstack/package.json',
    '/opt/my extension/dist/rstack-resolve-hook.mjs',
  );

  expect(env.NODE_OPTIONS).toBe(
    '--max-old-space-size=4096 --import file:///opt/my%20extension/dist/rstack-resolve-hook.mjs',
  );
});
