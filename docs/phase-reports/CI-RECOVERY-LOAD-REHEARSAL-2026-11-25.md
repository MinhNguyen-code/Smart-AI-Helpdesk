# Isolated recovery and API read-load rehearsal — 25/11/2026

This review branch adds operational evidence to the existing MySQL CI job. It changes no application behavior, migration, database identity policy, local credential or Google configuration. SMTP and five-state workflow remain disabled/deferred by the owner.

## Isolation and recovery scope

- Two fresh `mysql:8.4` job services have no published host ports or persistent host volumes. The source is migrated/seeded and runs the existing integration suite; the second starts with an empty schema and receives the dump. Both use disposable CI credentials only.
- Node processes share the respective MySQL service network namespace, preserving strict `sih_new_test@127.0.0.1` identity checks. The restore verification account has SELECT only. No production/development host or account is used.
- The evidence CLI requires explicit GitHub-hosted CI markers, `NODE_ENV=test`, loopback port 3306 and the exact test schema/runtime user before importing database configuration. Pool target and authenticated identity checks still execute before SQL. Ordinary local calls fail closed; these markers are safeguards against accidental use, not a replacement for network/account isolation.
- After the integration tests, a synthetic fixture is persisted across users, tickets, comments, history, audit, session, notification and outbox tables. `mysqldump --single-transaction --skip-add-drop-table` exports only the CI schema; no database/table drop or truncation is requested.
- Restore imports into the separate fresh service. Every base table's row count, canonical row SHA-256 and SHOW CREATE TABLE SHA-256 are compared with the source; the synthetic ticket must exist. This includes Knex metadata and all application tables.
- This verifies **database-only recovery in an ephemeral service**. It does not restore private image files, OAuth/provider configuration, production backups, point-in-time logs or an entire deployed application. No local restore is attempted.

## Load scope

The CI helper creates one synthetic END_USER/ticket and a signed test-only session. It sends actual HTTP GET ticket-detail requests through Express and real MySQL: five warmups, then eight rounds at concurrency 1/4/8 (8/32/64 measured requests). Every response must be 200 and contain the expected ticket ID. It records p50/p95/p99 and throughput; it applies no unsupported production latency SLA to a shared CI runner. Fixture cleanup is limited to those exact CI IDs.

This is a small single-ticket read scenario, not write load, Google authentication, a representative production dataset, user-browser rendering performance or a capacity guarantee. It is separate from the real-Google manual acceptance report and the pure-function priority benchmark.

## Evidence and verification

JSON summaries are retained as a seven-day GitHub Actions artifact `mysql-operational-evidence`. The SQL dump is not uploaded. `.ci-evidence/` is ignored by Git; no real user data or session secret is printed in the JSON reports.

Local checks: evidence CLI JavaScript syntax PASS; environment-guard unit test **1/1 PASS** (missing/incorrect markers, development schema, root, external host and self-hosted runner rejected); actionlint and three outer/one inner shell syntax checks PASS. Docker service execution, backup contents/restore equality and HTTP/MySQL timings remain **NOT VERIFIED until this branch's CI run**. No CLI fixture mode has been executed against a local database.

## First CI result and local observation campaign

[First branch CI](https://github.com/MinhNguyen-code/Smart-AI-Helpdesk/actions/runs/45529986795) on `0faadb5` completed successfully: existing MySQL integration **9/9**, five warmups + **104 measured HTTP reads / 0 errors**, and restore equality for schema/rows across **14 tables**. Node 24.22.3 read-detail p95: **11.398 / 14.954 / 20.412 ms** at concurrency **1 / 4 / 8**, using 8/32/64 samples. These small synthetic CI measurements retain all limitations above. JSON artifact `mysql-operational-evidence` was uploaded; no SQL dump was uploaded.

The local availability monitor was started with all three probes returning 200. Historical log gaps make its old aggregate unsuitable for the newly confirmed observation period, so the monitor/reporter now accept `MONITOR_LOG_FILE=availability-20261125.jsonl`. The default filename is unchanged, paths are restricted to simple JSONL filenames under `server/monitoring`, and prior logs are preserved. A unit case checks default/custom paths and rejects traversal/absolute paths. Use the same filename for collection and reporting:

```powershell
$env:MONITOR_LOG_FILE='availability-20261125.jsonl'
$env:BUSINESS_TIMEZONE='Asia/Ho_Chi_Minh'
$env:BUSINESS_START_HOUR='8'
$env:BUSINESS_END_HOUR='17'
npm.cmd run monitor:availability
# In another PowerShell with the same environment:
npm.cmd run report:availability
```

The local monitor is a session process, not an installed/reboot-persistent service. Uptime remains **NOT_VERIFIED** until at least ten business days and 95% minute coverage. Stopping the computer/session interrupts observation. No future 99% claim is inferred from the first successful probe. The report-only/monitor-path follow-up requires a new CI run; the first run's operational results are not relabelled as results for a later commit.
