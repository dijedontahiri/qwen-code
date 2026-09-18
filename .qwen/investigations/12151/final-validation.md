# Issue 12151 — completed validation record

Validated 18 September 2026. Upstream contribution: https://github.com/QwenLM/qwen-code/pull/12156, fixing https://github.com/QwenLM/qwen-code/issues/12151. Original diagnosis and bundle-patch direction are credited to @XxCotHGxX and the independent confirmation by @doudouOUC.

## Full repository gate — passed

Run: https://github.com/dijedontahiri/qwen-code/actions/runs/35309099872

Exact tested contribution: `2d1b9b2509666a0b9ed6b8c005238b6f40391447`.
Base: `455f3d07953ff3c2fe2fbd4f0cb06d98c03af169`.

The unmodified `npm run preflight` command completed successfully: clean, locked installation, formatting, zero-warning ESLint, workspace build, type checks, workspace/script tests, and startup-bundle closure check. A subsequent fresh bundle, actual CLI integration test with retries disabled, exact-head check and clean-worktree audit also passed.

The 24 Vitest summaries in the preserved preflight log report **82,890 passed test executions and 114 existing skipped tests**, with no failed-test summary. These are aggregate executions reported by the repository's workspace/script suites, not tests newly authored for this PR. The complete log retains dependency deprecation, audit and build-size warnings; success does not mean every warning or every existing repository issue has disappeared.

Artifact: `issue-12151-linux-validation`, ID `10534550147`, SHA-256 `3b2f5341b0b0b2959b2e8fa13d84e0fd3917f0918d072d8b31fbb216b41cf107`.

## Post-synchronization gate — passed

Run: https://github.com/dijedontahiri/qwen-code/actions/runs/35311408830

Exact tested PR head: `66e433d76d1631dfa5a84d6222e8a2b2d81dfade`.
Integrated upstream: `8500c0d88286a9492b8dfc9ad6ecad91cd712bc6`.

The non-force-pushed merge adds two upstream documentation/contract-test commits. The runner proved all four contribution files were byte-identical to the pre-sync full-preflight candidate. Normal locked installation and complete workspace build, **115 focused core tests**, **12 upstream documentation-contract tests**, focused lint/format checks, actual CLI E2E, the real CLI constrained-memory before/after experiment, restored-bundle E2E and clean-head audit all passed.

The hosted actual CLI experiment used Node 22.23.2, 60,000 scratch directories, 45 root rules, a sparse single-file glob and an explicit 384 MiB V8 old-space limit. The old implementation reached the glob but failed with heap out of memory, exit 1, without returning the tool result. The fix returned the correct path, completed the final response and exited 0. Neither run timed out. This independently repeats the local Node 22.16.0 result; it is not the reporter's default-heap 540,000-directory scenario or a total process-memory guarantee.

Artifact: `issue-12151-synced-head-evidence`, ID `10533780795`, SHA-256 `8e8f379afe739562b8ecce36761fcd6e529d89ae7c6f74b592cc0703fb57cba0`.

## Cross-platform gate — passed individual jobs

Run: https://github.com/dijedontahiri/qwen-code/actions/runs/35308904690

The Windows and macOS core builds and existing/new parser suites passed. This run's initial Linux helper failed before code tests because clean needed bootstrap dependencies; that setup was corrected in the successful full-preflight run above. The historical mixed-status run is not represented as wholly green.

## Critical runtime dependency audit — passed

Run: https://github.com/dijedontahiri/qwen-code/actions/runs/35312786486

Exact head: `66e433d76d1631dfa5a84d6222e8a2b2d81dfade`.

The repository's `npm run audit:runtime:critical` passed. An additional direct `npm audit --omit=dev --audit-level=critical --json` returned actual vulnerability metadata, which was explicitly checked rather than accepting a registry outage as success: **0 critical, 0 high, 2 moderate, 1 low**. Lower-severity findings remain. The full development-inclusive installation audit reported 16 findings, including two critical; this patch changes no dependencies or lockfiles and does not claim to fix those unrelated findings.

Artifact: `issue-12151-runtime-audit`, ID `10534500817`.

## Branch and upstream status

All four source/test/documentation files are pushed on `fix/12151-ignore-cache`; evidence and helper workflows remain on fork-only branches. The exact validated PR head is `66e433d76d1631dfa5a84d6222e8a2b2d81dfade`.

Upstream subsequently advanced to `b7543aeb1bd58537a2216253e8ba5020d4814c9c`, adding a broader browser-related change and another commit. Those changes do not overlap the four contribution files, but they are not part of the tested head. The completed validation is attributed to the exact commits above, not presented as testing a later merge. Upstream CI still requires maintainer authorization, and final review/merge remain upstream decisions.
