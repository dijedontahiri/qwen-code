# Issue 12151 — execution evidence

Original report and bundle-patch idea: https://github.com/QwenLM/qwen-code/issues/12151 by @XxCotHGxX, independently corroborated in that issue by @doudouOUC. These are independent measurements of a source-level adaptation, not the reporter's measurements.

Base: `455f3d07953ff3c2fe2fbd4f0cb06d98c03af169`. Candidate: `2d1b9b2509666a0b9ed6b8c005238b6f40391447`. Runtime for local measurements: Linux x64, Node 22.16.0. The core workspace resolves repository-locked `ignore` **7.0.5**, not the root tooling dependency 5.3.2. Measured 18 September 2026.

The production code and regression tests are on `fix/12151-ignore-cache`. This branch holds working evidence only and is not part of the upstream PR diff.

## Parser retention

The exact executed script is `.qwen/scripts/12151-cache-repro.mjs`. Place it at that same relative path in clean base and candidate worktrees with locked dependencies installed, then run from each repository root:

```sh
QWEN_DEBUG_LOG_FILE=0 node --expose-gc --max-old-space-size=1024 --import tsx .qwen/scripts/12151-cache-repro.mjs 12000
```

It creates 12,000 real directories, loads 45 ignore rules, asserts 24,000 decisions, forces GC before/after and keeps the parser alive for the retained-object measurement. Both runs finish; this demonstrates unbounded retention on the original implementation, not a reproduced default-heap fatal OOM. `distinctRetainedMatchers` counts unique final matchers referenced by the directory memo, not intermediate chain-cache entries. Measurements vary by host and are not unit-test thresholds.

Observed retained heap: 145.798 MiB before versus 9.445 MiB after. Distinct final matchers: 12,000 versus 1. These direct-source measurements used the core workspace's correct ignore version throughout. See raw JSON beside this file.

## Actual tool and CLI behavior

A separate real GlobTool/FileDiscoveryService/filesystem run traversed 8,000 scratch directories with a sparse pattern. Both versions returned the exact same single path. Final directory matchers fell from 4,001 to 1. The saved pre-fix parser was used only for the baseline. This tool-level measurement is separate from full CLI E2E.

An evidence audit found that the initially saved, relocated baseline module resolved the root tooling dependency, ignore 5.3.2, rather than the core dependency 7.0.5. That fixture was corrected, the tool measurements and parity checks were rerun with 7.0.5 on both sides, and their JSON files here are the corrected results. Corrected tool retained heap: 123.945 MiB before, 80.103 MiB after. No production source or committed test was changed for this fixture correction.

The committed CLI integration test spawns the actual bundled CLI against a local fake OpenAI endpoint, traverses 12,000 scratch directories and asserts exactly three matching paths while nested exclusions, re-inclusion, ignored ancestors and .qwenignore remain correct. Final local run: 1 passed, 0 failed, retries disabled. The initial test-only assertion used String() on structured content; it was corrected to inspect JSON content, without changing production behavior.

## Constrained-heap failure demonstration

With the same 12,000-directory workload and `--max-old-space-size=128`, the original parser using ignore 7.0.5 terminated with SIGABRT and `JavaScript heap out of memory`; the candidate completed all 24,000 decisions with exit 0. See bounded-heap-reproduction.json. This deliberately constrained-heap demonstration is not a reproduction of the reporter's default-heap 540,000-directory workload.

## Unit and equivalence checks

The new tests failed against the original source in three intended retention assertions; two semantic controls already passed. After correction, the parser, new cache regressions, FileDiscoveryService and Glob suites passed all 115 tests, and a final rerun after mutation restoration also passed all 115. Focused ESLint and repository-pinned Prettier passed.

Additional equivalence audit, repeated after correcting the baseline dependency: 2,630 real paths, forward/reverse/seeded-shuffled orders, five rounds each, original versus production candidate versus candidate forced to reset every seven lookups, also checked against git check-ignore. 39,450 comparisons, zero mismatches.

Independent mutation audit: retaining chain matchers, excluding memo hits from the reset counter, or retaining empty pattern lookups each causes a targeted test failure. The corrected source was restored after the audit.

## Broader validation and limitations

Local npm run bundle and CLI --version passed (0.24.0). A whole-workspace build attempt was killed at CLI type compilation by the 4 GiB container memory ceiling (exit 137, cgroup oom_kill observed); this is not represented as a successful full build/preflight.

Windows and macOS core builds plus both parser suites succeeded in https://github.com/dijedontahiri/qwen-code/actions/runs/35308904690. That run's Linux helper invoked preflight before bootstrap dependencies; clean.js could not import glob, before any code tests ran. The helper was corrected, without changing contribution code, to bootstrap locked dependencies before executing the unchanged npm run preflight command.

Linux full-preflight rerun: https://github.com/dijedontahiri/qwen-code/actions/runs/35309099872. It checks out the exact candidate, not the helper workflow branch. No full-preflight success is claimed until the run actually completes.
