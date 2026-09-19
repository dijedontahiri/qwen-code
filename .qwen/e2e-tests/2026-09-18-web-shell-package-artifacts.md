# Web Shell external package boundary

Issue: #12185

## Public library externalization

1. Install the locked dependencies with the documented Node 22/npm toolchain.
2. Build the SDK prerequisite and `@qwen-code/web-shell`.
3. Run the focused build-boundary and built-artifact regressions.
4. Confirm every declared runtime dependency and package subpath stays external in both public library entries, except the two stylesheet entrypoints that intentionally stay bundled.
5. Pack the real Web Shell artifact and resolve its public exports from an external consumer and through a symlinked consumer.

## Read-only transcript document

The standalone export document has no daemon URL and must render recorded MCP App fallback text without constructing the interactive MCP bridge.

1. Run the MCP App document DOM regression and confirm recorded fallback text renders with no iframe or bridge construction.
2. Build the real document renderer with a metafile. The existing 1,930,000-byte JS ceiling must remain unchanged.
3. Confirm `@modelcontextprotocol/ext-apps` and `@modelcontextprotocol/sdk` are absent from document inputs while the public Web Shell library still externalizes MCP Apps.
4. Restore the previous document builder as a negative control and require the unchanged byte/input guard to fail for the intended MCP boundary before restoring the candidate.
5. Run Web Shell typecheck, lint, format checks, the package's current publish-artifact verifier from main, and repository `npm run preflight` against the exact candidate source.

## Evidence policy

Record the exact source/base/tested SHAs, command exits, document size, metafile input result, packed-consumer result, and final tracked/index/nonignored-untracked audit. Existing declaration-alias and prepublish-guard fixes from merged #12188 are baseline behavior and are not claimed by this change.