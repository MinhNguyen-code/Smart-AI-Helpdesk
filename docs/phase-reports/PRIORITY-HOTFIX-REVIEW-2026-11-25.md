# Priority negation hotfix review — 25/11/2026

This draft publishes the existing local v1 hotfix independently from UI, worker lifecycle and deferred workflow code. It is based on PR #2 head `505baa8` and adds no schema, provider, AI request or routing behavior.

`classifyPriority()` rejects keyword occurrences immediately preceded by `không bị`, `không còn`, `đã hết` or `chưa` inside the same clause. A real incident in a following sentence still matches, and the keyword's own `không` (such as `không vào được LMS`) is retained. Organization-wide impact still overrides to P1. Existing normalization, API return contract and priority/SLA snapshots remain compatible.

The unit tests cover these boundaries. `server/scripts/benchmarkTriageScale.js` verifies the selected rule while timing 500 synthetic rules and a 20,009-character description, with 20 warmup and 100 measured runs. It is an in-process benchmark; it does not establish HTTP/MySQL concurrency or semantic accuracy beyond the tested cases. Fresh isolated branch results and GitHub CI must be checked before merge.

Alias/fuzzy matching, evidence v2, ambiguous grammar, four-unit routing and LLM suggestions remain outside this narrow fix. No development/production SQL test is run by this change.

## Clean publication snapshot verification

**6/6 unit tests PASS**. Node 24.20.0 synthetic benchmark: p50 **4.729 ms**, p95 **5.328 ms**, p99 **5.535 ms**. No database connection or HTTP load generated. GitHub CI for the new branch remains pending publication.
