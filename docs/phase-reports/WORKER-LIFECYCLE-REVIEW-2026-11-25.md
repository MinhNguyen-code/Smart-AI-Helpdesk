# SLA worker lifecycle review — 25/11/2026

This draft isolates the pre-existing local API/worker lifecycle changes from UI and workflow development. It is based on PR #2 head `505baa8`; no database migration or identity policy change is included.

- `startSlaWorker()` can be stopped explicitly and waits for its active check. It schedules the next check only after the current one finishes, retries failure with exponential delay capped at 60 seconds, and resets delay after recovery. Existing transactional breach notification logic remains unchanged.
- The API starts an embedded SLA worker only with `--with-sla-worker` (`npm run start:with-sla`). Default startup does not run a worker. Shutdown stops accepting HTTP, waits for startup/worker work, then closes the shared database pool with a bounded shutdown timeout.
- Dedicated worker startup uses `pathToFileURL()` to identify its own entry point. It closes its pool only after its active check has stopped.

Verification: two no-database unit tests pass for in-flight shutdown, absence of extra ticks after stop, failure backoff and recovery reset. They use an injected check and fake timers; no real SLA scan, fixture write or email send occurs. Full branch CI still needs observation after publication. The manual real-Google acceptance separately verified default API shutdown/startup and durable sessions/ticket data, with the embedded worker disabled.

This is not evidence of reboot autostart, supervised deployment or 99% uptime. The owner deferred SMTP and selected a provisional Mon–Fri 08:00–17:00 Vietnam observation schedule. Do not run multiple dedicated/embedded workers unintentionally.

## Clean publication snapshot verification

Backend **27/27 PASS** across two invocations. Connection-capable tests used unused loopback port 1 (readiness unavailable was expected); five config-only assertions used expected port 3306 without connecting. This excludes unrelated untracked workflow tests and the priority hotfix. These checks do not replace pending MySQL service CI for this branch.
