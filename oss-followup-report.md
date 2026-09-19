# OSS follow-up, 19 September 2026

## Scope and live inventory

The authenticated audit found 25 open external PRs by dijedontahiri: 22 in strapi/strapi and 3 in QwenLM/qwen-code. Search reported incomplete_results=false. Every returned PR reported mergeable=true at audit time; this means no merge conflicts, not approval or readiness to merge.

Source: https://github.com/dijedontahiri/qwen-code/actions/runs/35457723336/job/105935872337

Strapi PRs: #27735, #27731, #27730, #27729, #27728, #27727, #27726, #27725, #27724, #27721, #27716, #27715, #27713, #27708, #27707, #27706, #27704, #27702, #27701, #27699, #27698, #26488.

Qwen PRs: #12191, #12156, #12115.

## Repair actually pushed

Qwen #12191 had a formatting failure in packages/web-shell/client/package-externalization.artifact.test.ts. The previous acceptance run passed the four focused regression suites, typecheck and lint, but its actual format outcome failed. The quality gate failed correctly and skipped document-export, packed-consumer and full-preflight checks.

The formatting-only correction was verified with the exact source lockfile's Prettier 3.6.1 and TypeScript 5.8.3. The old package-wide format check failed as expected; the corrected check passed. Parser-normalized compiled JavaScript matched before and after. No test assertions or production behavior were changed.

Pushed product commit: 5d004749bef5914c44a265c79f81bd97bd463ba6.
Verified and pushed file blob: af057c9e8a5291982ddfedd714970f1a893e41fb.

Proof: https://github.com/dijedontahiri/qwen-code/actions/runs/35458224351/job/105937216974
Commit: https://github.com/dijedontahiri/qwen-code/commit/5d004749bef5914c44a265c79f81bd97bd463ba6
PR: https://github.com/QwenLM/qwen-code/pull/12191

The PR description now records the real failure and repair. The existing fork-only acceptance workflow was updated to check out this exact new product SHA, with its gates unchanged. Run 35458326640 was in progress at the last check, installing locked dependencies. Full product acceptance has NOT passed yet; the PR remains a draft.

Acceptance: https://github.com/dijedontahiri/qwen-code/actions/runs/35458326640

## Remaining blockers

### Qwen #12156

The exact-head full preflight in run 35450601506 failed in packages/channels/feishu/src/adapter.test.ts:
- dispatches both media and ordinary text: bridge.prompt expected 1 call, observed 0, line 748.
- observed contact enrichment / writes an enriched observation when only the user lookup resolves: fetchSpy expected 2 calls, observed 4, line 1655.

The failing workspace reported 2 failed and 286 passed tests. Focused parser checks, bundle, real CLI regression and final source audit passed. No baseline reproduction was performed in this follow-up, so the Feishu failures are not labelled unrelated or flaky. They were not fixed by changing this cache PR's scope.

Source: https://github.com/dijedontahiri/qwen-code/actions/runs/35450601506
Extracted original logs: https://github.com/dijedontahiri/qwen-code/actions/runs/35457943455/job/105936452445

### Qwen #12115

Run 35454318432 completed with failure in the full repository test stage. Focused installer regressions, shell checks, formatting, clean/install/lint/build/typecheck stages and final exact-source audit passed. The serve-fast-path stage was skipped. The final failing test assertion was not retrieved in this follow-up. The current product head 78ba1c4b8d15fe52e0538334664de733c1f3a196 is not fully validated.

Source: https://github.com/dijedontahiri/qwen-code/actions/runs/35454318432

### Strapi

All 22 audited open Strapi PRs carried a failing Vercel status whose description was Authorization required to deploy. This is a permission gate, not evidence that all 22 changes have code defects. It cannot be cleared by changing source code or bypassing project permissions.

#27704 has an APPROVED review from innerdvations, but upstream WebKit shard 2/4 remains failed. Its log shows a browser page crash, a localhost connection-refused failure during restart, and worker-process exits. The final reported result was 1 failed, 2 flaky, 7 skipped, 22 passed. This follow-up did not reproduce these symptoms on a baseline or establish their root cause. The explicit failed-job rerun request was denied with HTTP 403 Resource not accessible by integration; a maintainer-authorized rerun remains necessary.

Original job: https://github.com/strapi/strapi/actions/runs/35331306368/job/105660843251
Extracted original logs: https://github.com/dijedontahiri/qwen-code/actions/runs/35457943455/job/105936452445

## Limits and unchanged settings

TanStack/query #11549 was checked directly and is closed without merge; it is not counted as accepted. The other prior TanStack PRs were located but their final disposition was not individually reverified here.

No connected development computer was available, so unpublished local work in other forks was not verified. This audit did not rerun every package or full-monorepo test suite across every contribution. It is not an all-green report.

No scheduler, schedule, upstream review hold, or merge was changed. Auxiliary diagnostics live only on a fork branch, not in any product PR diff. The failed first format-proof harness compared emitted whitespace; the subsequent successful proof used parser-based normalization. Failed diagnostic attempts were not counted as product passes.
