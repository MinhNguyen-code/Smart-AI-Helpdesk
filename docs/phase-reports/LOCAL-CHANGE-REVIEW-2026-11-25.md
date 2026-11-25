# Local change review — 25/11/2026

The owner selected stability of the three-state MVP. Preserve all original local changes and references; publish reviewable groups without merging PR #2 or enabling pending schema changes.

## PR #2 review

Inspected the committed code diff from main `396ffa7` to `505baa8`: internal-note history projection, minimal public probes with real readiness checks, session cleanup defaults/guards, security regression tests and CI. No new blocking issue was identified within that reviewed scope. Cleanup is dry-run unless explicitly applied, SQL target identity remains strict, and the new container job preserves exact loopback account matching.

The [CI run on 505baa8](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45523061343) completed successfully. Decoded MySQL job logs show **9/9 tests, zero skips**, strict runtime/migration account verification and removal of the service container/network. Manual Google acceptance also verified END_USER cross-ticket rejection and administrative access denial for END_USER/IT_AGENT; see [real acceptance report](REAL-GOOGLE-ACCEPTANCE-2026-11-25.md). No review was submitted on behalf of the owner and no merge performed.

## Publication groups

| Group | Contents | Scope |
| --- | --- | --- |
| UI and real acceptance | Current `src/` application shell, login/dashboard/form/detail styles and tests; two fixes exposed during acceptance; this report and the real acceptance report | Server still uses the three-state ticket router. Optional workflow UI only activates if an API explicitly advertises capabilities; current API does not. No migration or backend workflow service included. |
| SLA worker lifecycle | `server/src/index.js`, `server/src/workers/slaWorker.js`, the `start:with-sla` npm script and focused lifecycle tests | Graceful stop and opt-in embedded worker; independent draft for review. No worker started for manual acceptance. |
| Priority hotfix | Existing local direct-negation fix, its unit tests and the synthetic scale benchmark | Publish the existing narrow rule-engine correction separately; does not claim alias/fuzzy/evidence v2 or routing. |
| Deferred workflow | Backend `ticketWorkflow/`, its unit/integration fixtures, pending migration and patch | Kept local; five-state rollout not selected by owner. |
| Deferred design/assets | Auto-triage v2/AI/routing plans, `modern-saas-ui/`, generated setup script, old visual scripts/screenshots and unrelated documentation changes | Preserved locally; no blanket add or cleanup. These are not verified runtime features. |

Each implementation branch is based on reviewed PR #2 head `505baa8`. Draft PRs against main therefore also inherit PR #2 until that dependency is merged. Temporary Git indexes can create these separate branch commits without checking out another branch, stashing, resetting, changing the user's real index or removing any local source file. No automatic merge is part of this work.

Raw manual browser/database evidence remains local under `docs/screenshots/real-google-2026-11-25/`; it is not included by a blanket staging command. Reports state observed results and limits, without OAuth/session secrets or private file storage names.

## Validation recorded so far

- UI: full frontend suite **15/15**, production build **PASS**, repeated successfully from the clean UI publication snapshot; real three-role manual acceptance and API restart scenario completed on the combined local worktree. These are separate evidence scopes. New GitHub CI results still need observation after publication.
- Worker: clean publication snapshot backend **27/27 PASS** across two invocations (22 unit/API tests using unused port 1; 5 config-only tests expecting port 3306). Targeted lifecycle subset **2/2 PASS**; no database connection succeeded or worker fixture write occurred.
- Priority hotfix: clean snapshot unit **6/6 PASS**. Synthetic benchmark: 500 rules, 20,009 description characters, 20 warmup + 100 runs, Node 24.20.0; p50 **4.729 ms**, p95 **5.328 ms**, p99 **5.535 ms**. In-process only; no HTTP/MySQL/concurrency claim.
- No local MySQL integration fixtures, migration, destructive cleanup, SMTP sending or backup restore run. Only the labelled manual acceptance ticket was created/handled through the authorized UI.

## Remaining acceptance work

Keep SMTP deferred. Observe uptime under Mon–Fri 08:00–17:00 Vietnam time before drawing any availability conclusion. Backup/restore should be rehearsed in an isolated service before a separately approved local recovery operation. Classification v2 and four-unit routing remain future feature changes after the stable MVP review; no AI provider or data transmission is enabled.
