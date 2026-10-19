# Task 4 report: opt-out URL checker
Commit: data(data-brokers): first opt-out URL check (see git log). Not pushed.
TDD: tests/broker-data/check-urls.test.js written first; run failed (module missing); after check-urls.js, 9/9 pass.
Files: research/data-brokers/build/check-urls.js, tests/broker-data/check-urls.test.js, package.json (brokers:check-urls), 726 broker JSONs (only optOut.status/verifiedAt changed; same 2-space formatting).
Run: 726 http(s) URLs checked (9 records have null/mailto optOut, skipped): 617 verified, 15 suspect, 94 dead. Concurrency 8, 15s timeout, one retry on network error only.
Validate: exit 0 (735 brokers). Full suite: 1431 pass, 1 fail = pre-existing P6 breaker-phase3.
Concerns: of 94 dead, 65 are HTTP 403 (likely bot blocking by CDNs), 14 network errors, 12x404, 2x429, 1x500. Brief rule (>=400 => dead) followed literally, so "dead" overstates; a follow-up may want 403/429 -> suspect or a browser recheck. verifiedAt is the local date (2026-10-18); the first run briefly wrote UTC 2026-10-19 and was corrected before commit, and the code now uses the local date. staging/ untouched and not committed.

## Fix round 1 (ruling R9)
Changes: new optOut status 'blocked' (schema.js enum + schema test). classifyResponse: 404/410 dead; 401/403/429/5xx blocked; DNS (ENOTFOUND, EAI_AGAIN via new `error` field) dead; other network/timeout blocked; root-redirect and cross-domain rules unchanged (suspect). Retry once after 2s on network error, 429, 5xx. New `--only=<status>` flag.
Tests added/updated: 404 is dead, 410 is dead, 403/429/500 is blocked, DNS failure is dead, timeout is blocked, schema accepts blocked. (New tests were written together with the implementation, not separately watched red.)
Commands: `npm run brokers:check-urls -- --only=dead` -> checked 94: verified 1, suspect 0, blocked 73, dead 20. `npm run brokers:validate` exit 0. broker-data tests 69 pass. Full suite 1437 pass, 1 fail (pre-existing P6).
Final counts (726): verified 618, suspect 15, blocked 73, dead 20.
