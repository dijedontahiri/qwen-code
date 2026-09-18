# Web Shell package artifact verification

Issue: #12185

## Public package correctness

1. Run `npm ci` and `npm run build --workspace=@qwen-code/web-shell`.
2. Run `npm run verify:package --workspace=@qwen-code/web-shell`. Every declared export target must exist and emitted declaration module specifiers must not contain repository-only `@/` aliases.
3. Run the complete Web Shell tests. Both public library modes must externalize every declared dependency and peer dependency, including MCP Apps. Only the existing KaTeX and xterm CSS entrypoints stay bundleable.
4. Run `npm run prepublishOnly --workspace=@qwen-code/web-shell`, then `npm pack --workspace=@qwen-code/web-shell --dry-run --json`. Confirm no `dist/document-export/` files are included. These commands do not publish anything.

## Standalone document output

The additional `document-export` mode builds a private transcript under `dist/document-export/transcript.js`. Only this non-published build bundles MCP Apps before the standalone renderer's esbuild pass. The normal and public transcript entries keep the dependency external, avoiding duplicate singleton state for package consumers.

1. Run `node packages/web-templates/src/export-html/build.mjs`. The unchanged 1,930,000-byte renderer budget and structural dependency guards must pass.
2. Run `npm run test:scripts -- scripts/tests/transcript-css-entry-filter.test.js scripts/tests/export-html-import-meta-guard.test.js`. Private transcript paths must work with POSIX and Windows separators. Other files, nested paths, and a fourth import.meta read must still be rejected. The end-to-end probe must mutate the actual private input consumed by the document build.
3. For the before/after proof, keep the built public transcript but temporarily remove only the document alias from the export build: it must reproduce the oversized renderer. Restore the alias and confirm the budget passes. Never increase or disable the budget for this comparison.
4. Run `npm run preflight` from the root. Record any unrelated failures separately instead of representing a focused package validation as full preflight success.

## Declaration guard regression

Re-emit declarations with `tsc -p tsconfig.lib.json` without alias rewriting. Confirm the package verifier rejects the unresolved `@/` module specifiers. Run the alias rewriter and confirm the verifier passes. Restore any modified build artifacts after negative probes.

## Evidence policy

Record exact source SHAs, real test counts, and the final measured renderer size. Fork validation does not replace upstream CI authorization or maintainer review. Private document artifacts are build intermediates, not package exports or additional published runtime copies.
