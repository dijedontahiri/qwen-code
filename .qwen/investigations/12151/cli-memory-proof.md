# Actual CLI constrained-memory before/after proof

Executed 18 September 2026 on Linux x64, Node 22.16.0. Baseline production parser: upstream `455f3d07953ff3c2fe2fbd4f0cb06d98c03af169`. Candidate production parser: `2d1b9b2509666a0b9ed6b8c005238b6f40391447`. Both resolve the core dependency `ignore` 7.0.5. No live model provider or credentials were used.

This is additional evidence beyond the parser and GlobTool measurements. The experiment builds the genuine CLI, starts a local fake OpenAI HTTP endpoint, makes the CLI receive a real `glob` tool call, and checks the subsequent tool-result HTTP message and final CLI output.

The fixture contains 30,000 scratch directories, each with one nested directory, for 60,000 scratch directories total; a root `.gitignore` with 45 rules; and one matching `needle.txt`. Both versions receive the same sparse `**/needle.txt` query and the same explicit `--max-old-space-size=384` limit.

The original parser's CLI reaches the tool call but terminates with a JavaScript heap-out-of-memory diagnostic before returning the tool result. The CLI invocation exits 1, with one streaming request and no returned tool-result message. The patched CLI completes with exit 0, sends the correct single path back to the fake endpoint, receives the final response, and prints `CLI_MEMORY_PROOF_COMPLETE`. Neither run timed out. Raw result objects are saved beside this file.

This is deliberately constrained-heap evidence. It is not represented as the reporter's 540,000-directory workload at the default heap limit, a fixed global memory bound, or a live-provider test.

## Reproduction

The executed harness is `.qwen/scripts/12151-cli-memory.mjs` on this evidence branch. Copy it into the same relative path in clean baseline and candidate worktrees with their locked dependencies and bundle assets available. From each worktree root, build the bundle with `npm run bundle`, then run:

```sh
mkdir -p /tmp/qwen-12151-evidence
ulimit -c 0
node --import tsx .qwen/scripts/12151-cli-memory.mjs before 30000 384 /tmp/qwen-12151-evidence
# In the candidate worktree, use the same command with 'after'.
```

The harness creates an isolated existing HOME, a temporary Git repository and a local model endpoint; validates that the CLI reaches the requested tool call; writes its real stdout, stderr and observations; and cleans up its own fixture. The before-mode assertion requires an actual heap-out-of-memory diagnostic, not merely a nonzero exit. The after-mode assertions require successful exit, the correct returned path and the final completion response.

## Fixture audit and restoration

The first setup attempt had a nonexistent temporary HOME and was rejected before the CLI reached a tool call. A second exploratory attempt changed only the transpiled core file; the CLI bundler resolves the core TypeScript source through path aliases, so both bundles still contained the fix. Those attempts are not used as a before/after failure proof.

For the final run, the original TypeScript source was restored in its actual package path before bundling, and the baseline bundle was checked not to contain the new chain cache. The corrected source and original built output were restored in a finally block, the bundle rebuilt, and the candidate bundle checked to contain the chain cache. The source blob after restoration is exactly `ff55f9ff27630b2a9d4f712960bd6cd5aba74577`, identical to the pushed contribution. The built parser was also byte-compared with its saved original corrected output, and the actual CLI still reports 0.24.0. No temporary baseline or experiment code was added to the upstream PR.
