# Real Google acceptance — 25/11/2026

Status: **PASS for the observed three-role, three-state Google acceptance scenario; PARTIAL for overall project acceptance**. This report distinguishes user-assisted Google sign-in in Microsoft Edge from automated test sessions. No login bypass, cookie copying, role changes, migration, fixture cleanup or SMTP delivery is used.

## Environment and scope

- Workspace: `D:\Smart IT Helpdesk`. API port 5000, frontend port 5173. API started without SLA/email workers.
- Before database access, `validateDatabaseConfig()` and `assertIdentity()` verified schema `smart_it_helpdesk_new_dev` with `sih_new_app@127.0.0.1`. Six existing migrations were observed; none applied in this acceptance.
- Owner directly completed Google sign-in for the three existing approved accounts. The agent verified each role on the authenticated application UI. No passwords, codes, Google subjects, session identifiers or tokens are recorded here.
- One explicitly labelled synthetic acceptance ticket was created through React using the real END_USER session. The ticket is retained for audit; no other ticket was modified or deleted. SQL verification is read-only.
- The original reference directories remain unchanged. Existing local UI/workflow/worker changes remain present and are not assumed to be published. Manual browser acceptance used this combined worktree; clean publication-branch checks are separate evidence and do not retroactively establish browser acceptance of each independent branch.

## Observed evidence

| Step | Result |
| --- | --- |
| END_USER Google session | Role END_USER verified in Edge. Initial IT_AGENT session was identified and the owner changed accounts. |
| Create with image | Ticket ID **2**, code `78a9b0054f374e93ad3640040bfb2422`, title `[NGHIỆM THU 25-11] Không vào được LMS - tài khoản END_USER`. Reporter ID 3, category LMS, individual impact. |
| Image persistence | `acceptance-attachment.png`, image/png, 17,840 bytes; stored bytes equal the synthetic source, SHA-256 `2da14146900234bb167a37f7338193ad888941df618e0efb5b8094f5ab2b4763`. This is a labelled synthetic upload, not an incident screenshot. |
| Priority and SLA | Rule ID 5 `không vào được lms` selected P1. Creation 08:27:15, response deadline 08:42:15, resolution deadline 10:27:15 (UTC+07, 25/11/2026). |
| END_USER cross-ticket access | Browser navigation to `/api/v1/tickets/1` returned JSON statusCode 404. Read-only SQL confirmed that existing ticket belongs to reporter ID 2, not ID 3. |
| END_USER administrative access | `/api/v1/users` returned JSON statusCode 403. END_USER status control was disabled and assignment/ACK controls were absent. No unauthorized mutation was attempted. |
| Staff notification | New-ticket notifications persisted for recipients 1 (ADMIN) and 2 (IT_AGENT); authenticated IT_AGENT bell count increased from 4 to 5. |
| IT_AGENT handling | Self-assignment to ID 2, ACK at 08:31:30, OPEN→IN_PROGRESS, public reply at 08:31:58, then RESOLVED at 08:32:15. Read-only SQL verified version 5, one public comment, seven history events, and END_USER reply notification. Both response/resolution deadlines met. |
| IT_AGENT administrative access | `/api/v1/users` returned JSON statusCode 403 in the real IT_AGENT session. |
| ADMIN Google session | Role ADMIN verified in Edge. |
| ADMIN Rules/SLA | Loaded all six active rules and all four P1–P4 policies. P1 is 15/120 minutes. Read-only inspection; no shared rule/policy edited. |
| ADMIN users/dashboard | All three accounts displayed active with correct roles and linked Google identity. Dashboard for 19–25/11 showed one ticket, MTTA 4 minutes (rounded from 255 seconds), MTTR 5 minutes and 100% SLA (1/1). No user/role/rule/SLA mutation. |
| API restart and retained session/data | PASS. Original API process received SIGINT and logged completed HTTP/pool shutdown; a new process was started without workers. ADMIN stayed authenticated after browser reload. Deep comparison verified unchanged ticket, attachment metadata, comments, history and notification identity/type/recipient records; stored image bytes still matched. |
| END_USER sees final resolution/reply | PASS. Owner signed back in as END_USER after restart. UI displayed one unread reply notification; opening it marked that one item read and opened the resolved ticket, its public staff reply and image link. Status selector remained disabled; no staff assignment/ACK controls appeared. |

## Defects exposed and changes

1. After successful legacy three-state ticket creation/upload, the first detail modal used the bare POST response and falsely showed no image/history. Manual refresh revealed correctly persisted data. `src/App.jsx` now reloads full detail after every live creation, including the current three-state contract. A new RTL regression drives creation, file upload and detail reload, verifying the saved attachment and history appear immediately.
2. During repeated role/page checks the unchanged global limiter reached **200 requests/15 minutes** and returned 429. The previous frontend treated any `/auth/me` failure as unauthenticated. It now distinguishes 401 from 429/network/server failures and offers explicit session retry without showing a false login prompt. Two RTL regressions cover 429 and 503 followed by successful recovery. No limiter configuration changed; acceptance waits for its normal reset.

## Checks in this session

- Targeted ticket-creation regression: **1/1 PASS**.
- Full frontend suite after both fixes: **8 files / 15 tests PASS**.
- Production build: **PASS**, Vite 7.3.8, 2,042 modules.
- Scoped whitespace check for the touched source files: **PASS**.
- Worker lifecycle review added two no-database tests: graceful stop waits for its active check and prevents further ticks; failure retry/backoff resets after recovery. Targeted run: **2/2 PASS**. This does not prove real SLA worker operation or long-term availability.
- New acceptance source test mocks are frontend regression evidence only; they do not establish Google sign-in or database behavior. The live observations above use the owner's actual Google sessions and read-only database verification.

## Related CI and remaining scope

PR #2 at `505baa8` remains open/unmerged. Its [CI run](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45523061343) succeeded; decoded MySQL job logs show runtime/migration identities on the fresh service and **9 pass / 0 fail / 0 skipped**, followed by service/container teardown. These are separate from this development-schema manual acceptance.

SMTP is deferred by the owner. Availability uses the owner-selected provisional Mon–Fri 08:00–17:00 Vietnam schedule; no 99% claim is made. Five-state workflow, routing and triage v2 remain separate rollout/review work. This report does not authorize applying pending migrations to development or production.

Owner decision in this session: **retain the three-state MVP and prioritize stability**. No PENDING_USER/CLOSED migration or workflow patch is enabled. The completed scenario is not exhaustive acceptance of every authorization mutation, internal-note visibility through the browser, an unapproved Google account, SMTP, backup/restore or uptime. Internal-note privacy is covered separately by the existing successful MySQL CI regression. The two frontend fixes have automated regression evidence; no second synthetic ticket was created solely to repeat their browser checks.

Evidence files are under `docs/screenshots/real-google-2026-11-25/`. Browser snapshots contain only observed UI/response information; database captures exclude credentials, session data and stored private filenames. Publishable evidence should be reviewed before including raw screenshots or browser snapshots in Git commits.
