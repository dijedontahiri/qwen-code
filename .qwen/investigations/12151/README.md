# Issue 12151 — execution evidence

Original report and bundle-patch idea: https://github.com/QwenLM/qwen-code/issues/12151 by @XxCotHGxX, independently corroborated in that issue by @doudouOUC. These are independent measurements of a source-level adaptation, not the reporter's measurements.

Base: `455f3d07953ff3c2fe2fbd4f0cb06d98c03af169`. Candidate: `2d1b9b2509666a0b9ed6b8c005238b6f40391447`. Runtime for local measurements: Linux x64, Node 22.16.0, repository-locked ignore 5.3.2. Measured 18 September 2026.

The production code and regression tests are on `fix/12151-ignore-cache`. This branch holds working evidence only and is not part of the upstream PR diff.

## Parser retention

The exact executed script is `.qwen/scripts/12151-cache-repro.mjs`. Place the script at that same relative path in clean base and candidate worktrees with locked dependencies installed, then run from each repository root:

```sh
QWEN_DEBUG_LOG_FILE=0 node --expose-gc --max-old-space-size=1024 --import tsx .qwen/scripts/12151-cache-repro.mjs 12000
```

It creates 12,000 real directories, loads 45 ignore rules, asserts 24,000 decisions, forces GC before/after and keeps the parser alive for the retained-object measurement. Both runs finish; this demonstrates unbounded retention on the original implementation, not a reproduced default-heap fatal OOM. `distinctRetainedMatchers` counts unique final matchers referenced by the directory memo, not intermediate chain-cache entries. Measurements vary by host and are not unit-test thresholds.

Observed retained heap: 145.798 MiB before versus 9.445 MiB after. Distinct final matchers: 12,000 versus 1. See raw JSON beside this file.

## Actual tool and CLI behavior

A separate real GlobTool/FileDiscoveryService/filesystem run traversed 8,000 scratch directories with a sparse pattern. Both versions returned the exact same single path. Final directory matchers fell from 4,001 to 1. The saved pre-fix parser was used only for the baseline. This tool-level measurement is separate from full CLI E2E.

The committed CLI integration test spawns the actual bundled CLI against a local fake OpenAI endpoint, traverses 12,000 scratch directories and asserts exactly three matching paths while nested exclusions, re-inclusion, ignored ancestors and .qwenignore remain correct. Final local run: 1 passed, 0 failed, retries disabled. The initial test-only assertion used String() on structured content; it was corrected to inspect JSON content, without changing production behavior.

## Unit and equivalence checks

The new tests failed against the original source in three intended retention assertions; two semantic controls already passed. After the correction the parser, new cache regressions, FileDiscoveryService and Glob suites passed all 115 tests. Focused ESLint and repository-pinned Prettier passed.

Additional equivalence audit: 2,630 real paths, forward/reverse/seeded-shuffled orders, five rounds each, original versus production candidate versus candidate forced to reset every seven lookups, also checked against git check-ignore. 39,450 comparisons, zero mismatches.

Independent mutation audit: retaining chain matchers, excluding memo hits from the reset counter, or retaining empty pattern lookups each causes a targeted test failure. The original corrected source was restored after every audit.

## Broader validation and limitations

Local npm run bundle and CLI --version passed (0.24.0). A whole-workspace build attempt was killed at CLI type compilation by the 4 GiB container memory ceiling (exit 137, cgroup oom_kill observed); this is not represented as a successful full build/preflight.

Hosted exact-head validation: https://github.com/dijedontahiri/qwen-code/actions/runs/35308904690. macOS parser suite succeeded. The initial Linux helper invoked preflight before bootstrap dependencies; clean.js could not import glob, before any code tests ran. The helper was corrected to bootstrap locked dependencies before executing the unchanged npm run preflight command. See the latest run of `.github/workflows/validate-12151-final.yml` on `validation/12151-final` for the rerun. No full-preflight success is claimed until it actually completes.
