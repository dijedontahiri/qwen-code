# Web Shell package artifact verification

Issue: #12185

## Baseline

1. Build `@qwen-code/web-shell` from upstream `main` through declaration emit, before any alias-rewrite step.
2. Confirm emitted declarations under `packages/web-shell/dist/types` contain repository-only `@/` specifiers.
3. Confirm `verify:package` rejects that unrevised declaration output.
4. Confirm the six runtime dependencies named in #12185 are not externalized by the upstream library config.

## Fixed behavior

1. Run `npm run build --workspace=@qwen-code/web-shell`.
2. Run `npm run verify:package --workspace=@qwen-code/web-shell` and confirm every package export target exists and no emitted declaration contains an `@/` import.
3. Run the package test suite and confirm every declared dependency and peer dependency is external in the normal library build while the KaTeX and xterm CSS entrypoints remain bundleable in both modes.
4. Confirm the transcript build retains MCP App bundling for tree shaking, while all other declared runtime packages remain external. Run `node packages/web-templates/src/export-html/build.mjs` and verify the unchanged document export size budget passes.
5. Run `npm run prepublishOnly --workspace=@qwen-code/web-shell` to exercise the publication guard, then `npm pack --workspace=@qwen-code/web-shell --dry-run` to inspect the package contents without publishing.
6. Run `npm run preflight` from the repository root.

## Transcript regression

Run the five `client/build-boundary.test.ts` cases with the previous boundary helper from `095b5d781d973c06b4c0c72cb984a463a6c68253`: the transcript-specific MCP App case must fail while the other controls pass. Restore the fixed helper and confirm all five pass.

With dependencies built, compare the standalone HTML export on the previous PR head and the fix. The previous head produces a 2,108,223-byte renderer, exceeding the 1,930,000-byte hard budget. Preserving MCP App tree shaking in the transcript build reduces the measured diagnostic renderer to 1,912,493 bytes without changing that budget. Record the actual size again for the final tested commit rather than treating this diagnostic measurement as final-head evidence.

## Evidence policy

Record the exact commit SHA and command output. Do not treat a fork workflow waiting for upstream authorization as a passing or failing upstream CI result.
