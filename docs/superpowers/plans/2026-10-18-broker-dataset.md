# Open Data Broker Dataset Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `research/data-brokers/`, an open dataset of every broker on the CA, VT, TX and OR registries, with each documented "who sells to whom" link sourced, validated by script, and exported in a form the Phase 2 map can load.

**Architecture:** Plain JSON files (one per broker, plus `links.json` and `sources.json`) are the source of truth. Node ESM scripts in `research/data-brokers/build/` do three jobs: import registry snapshots into broker records, validate the whole set, and check opt-out URLs. A final export writes `src/data/broker-map.json` for the game, containing **published (tier A) links only**. Research families (enforcement, SEC, procurement, privacy policies) are run by parallel research agents that write staged records; a merge step dedupes them, and the validator decides what lands.

**Tech Stack:** Node 22 (built-in `fetch`, `fs/promises`), vitest 5 (already a devDependency). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-broker-constellation-design.md`, sections "Phase 1 — The broker dataset" and "Calls I made". Phase 2 (the map, the debrief checklist and re-filing) gets its own plan once this dataset exists, because hub choice and layout depend on the data.

## Global Constraints

- No new npm dependencies, runtime or dev.
- Dataset license: CC BY 4.0 (`research/data-brokers/LICENSE`).
- `optOut.method` is one of `web-form | email | mail | portal | sweep-only | none`.
- `kind` vocabulary (fixed): `people-search, marketing, risk-identity, location, financial, health, automotive, identity-resolution, data-marketplace, ad-network, buyer`.
- Link `type` is one of `owns | supplies | buys | matches-identity`.
- Link `tier` is one of `A | B | C`.
  - A: regulator, court, SEC or procurement document.
  - B: the company's own statement.
  - C: reputable journalism.
- **Only tier A links are published in the first release.** Tier B and C links are stored with `"published": false`.
- Every link has ≥1 source id. Every source has `url` **and** `archived` (a Wayback URL) and `accessed` (YYYY-MM-DD).
- Unknown size is `{"known": false, "signals": []}`. Never estimate.
- Claims are written as narrowly as the source supports. If a claim can't be sourced, drop it, don't soften it.
- Hubs = top 12 by reach.
- The README carries an `asOf` date.

## Review Focus

1. **The same company under different names across registries** (e.g. "Acxiom LLC" in CA, "ACXIOM CORPORATION" in VT). Expected: one record, with the other spellings as aliases and every registry flag set. Pinned by Task 3's `dedupe merges case/suffix variants` test.
2. **Registry rows with an empty or garbage website/opt-out field.** Expected: `optOut` is `null` (unknown), not `none` (which means "we confirmed no opt-out exists"). Pinned by Task 3's `blank opt-out stays unknown` test.
3. **A link whose only source is later found dead.** Expected: the validator still passes if an `archived` copy exists, and fails if not. Pinned by Task 2's `source needs archived copy` test.
4. **An opt-out URL that redirects to a generic homepage.** Expected: the checker marks it `suspect`, not verified. Pinned by Task 4's `redirect to root is suspect` test.
5. **An unpublished (B/C) link leaking into the game export.** Expected: the export contains only `published: true` links, and only tier A can be published. Pinned by Task 6's `export drops unpublished links` and the validator's `only tier A may be published` test.

---

## File Structure

```
research/data-brokers/
  README.md                 methods, tiers, asOf, how to cite, how to rebuild
  LICENSE                   CC BY 4.0
  brokers/<id>.json         one per broker (the source of truth)
  links.json                [{from,to,type,tier,claim,sources,published}]
  sources.json              {"<id>": {url, archived, kind, accessed, title}}
  sources/registries/       raw registry snapshots: <state>-<YYYY-MM-DD>.csv + SOURCES.md
  staging/<family>/         research agents' output before merge (add `research/data-brokers/staging/` to .gitignore in Task 5)
  build/schema.js           constants + validateBroker / validateLink / validateSource
  build/validate.js         CLI: validates the whole dataset, exits 1 on any error
  build/csv.js              parseCsv(text) -> string[][]
  build/import-registry.js  CLI + importRows(state, rows, existing) for each state's columns
  build/ids.js              slugify(name), normalizeName(name)
  build/merge-staging.js    CLI: merges staging/<family>/ into brokers/ + links.json + sources.json
  build/check-urls.js       CLI + classifyResponse(...); writes optOut.verifiedAt / status
  build/reach.js            computeReach(brokers, links) -> Map<id, number>; pickHubs(...)
  build/export.js           CLI: writes src/data/broker-map.json
tests/broker-data/*.test.js
```

---

### Task 1: IDs and CSV parsing

**Files:**
- Create: `research/data-brokers/build/ids.js`, `research/data-brokers/build/csv.js`
- Test: `tests/broker-data/ids.test.js`, `tests/broker-data/csv.test.js`

**Interfaces:**
- Produces:
  - `normalizeName(name: string): string`: lowercase, strips punctuation and the trailing legal suffixes `inc, llc, l.l.c., corp, corporation, co, ltd, lp, holdings, company`, collapses whitespace.
  - `slugify(name: string): string`: `normalizeName` then spaces→`-`.
  - `parseCsv(text: string): string[][]`: RFC 4180 (quoted fields, `""` escapes, embedded newlines, CRLF), BOM stripped.

- [ ] **Step 1: Write failing tests**

```js
expect(normalizeName('Acxiom LLC')).toBe('acxiom');
expect(normalizeName('ACXIOM CORPORATION')).toBe('acxiom');
expect(normalizeName('Spokeo, Inc.')).toBe('spokeo');
expect(slugify('Thomson Reuters Holdings Inc')).toBe('thomson-reuters');
expect(parseCsv('﻿a,"b,c","d ""q"""\r\n1,"x\ny",3\n')).toEqual([['a','b,c','d "q"'],['1','x\ny','3']]);
```

- [ ] **Step 2: Run `npx vitest run tests/broker-data` and confirm the tests fail** (the modules are missing).
- [ ] **Step 3: Implement both modules.**
- [ ] **Step 4: Run `npx vitest run tests/broker-data` and confirm everything passes.**
- [ ] **Step 5: Commit**: `feat(data-brokers): name normalisation and CSV parser`

### Task 2: Schema and validator

**Files:**
- Create: `research/data-brokers/build/schema.js`, `research/data-brokers/build/validate.js`, `research/data-brokers/LICENSE`, `research/data-brokers/links.json` (`[]`), `research/data-brokers/sources.json` (`{}`)
- Modify: `package.json` scripts: add `"brokers:validate": "node research/data-brokers/build/validate.js"`
- Test: `tests/broker-data/schema.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `KINDS`, `OPT_OUT_METHODS`, `LINK_TYPES`, `TIERS` (frozen arrays with the exact values from Global Constraints).
  - `validateBroker(b, {sourceIds:Set}) → string[]`, `validateLink(l, {brokerIds:Set, sourceIds:Set}) → string[]`, `validateSource(id, s) → string[]`. Each returns error messages; empty means valid.
  - `validateDataset(dir: string) → Promise<{errors: string[], counts: {brokers, links, published, sources}}>`.
  - `validate.js` prints errors and counts, and exits 1 if `errors.length`.
- Broker shape: exactly the spec's record, plus `optOut` may be `null` (unknown) and `optOut.status` ∈ `verified | suspect | dead | unchecked`.

- [ ] **Step 1: Write failing tests**, one assertion each:
  - `valid broker passes`
  - `unknown kind fails`
  - `optOut null is allowed`
  - `optOut.method none needs no url`
  - `web-form needs url`
  - `size.known false must have empty signals`
  - `duplicate broker id fails` (via `validateDataset` on a tmp dir)
  - `link to unknown broker fails`
  - `link with no sources fails`
  - `source needs archived copy`
  - `only tier A may be published`: `{tier:'B', published:true}` gives an error
  - `broker.sources ids must exist in sources.json`
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement `schema.js` and `validate.js`.** `validateDataset` reads `brokers/*.json`, `links.json` and `sources.json`, and checks id = filename.
- [ ] **Step 4: Run the tests and `npm run brokers:validate`.** Expected: tests PASS, and the validator prints `brokers: 0 links: 0` and exits 0.
- [ ] **Step 5: Commit**: `feat(data-brokers): dataset schema and validator`

### Task 3: Registry import (the crowd)

**Files:**
- Create: `research/data-brokers/build/import-registry.js`, `research/data-brokers/sources/registries/SOURCES.md`, the four snapshot CSVs, and `brokers/*.json` (generated)
- Modify: `package.json` scripts: add `"brokers:import": "node research/data-brokers/build/import-registry.js"`
- Test: `tests/broker-data/import-registry.test.js` with small fixture CSVs in `tests/fixtures/registries/`

**Interfaces:**
- Consumes: `parseCsv`, `slugify`, `normalizeName`, `validateBroker`.
- Produces:
  - `COLUMN_MAPS: Record<'CA'|'VT'|'TX'|'OR', {name, dba?, website?, optOutUrl?, email?, category?}>`, mapping each registry's header names.
  - `importRows(state, rows: string[][], existing: Map<id, Broker>, sourceId: string) → Map<id, Broker>`: merges into existing records by `normalizeName` of the name **or** any alias/DBA. Sets `registries[state]` to the snapshot year, adds other spellings to `aliases`, sets `optOut` from the registry only when the field holds a URL (`method:'web-form', status:'unchecked'`) or an email (`method:'email'`), and maps the category to `kind`. Unknown category → `kind: []` (flagged for the research pass), not a guess.
  - CLI: `node import-registry.js <STATE> <csvPath> <snapshotDate>`. It writes or updates `brokers/*.json`, adds a `sources.json` entry `registry-<state>-<date>`, and runs the validator.

- [ ] **Step 1: Locate and snapshot the four official registries.** Find each state's official broker registry download: California CPPA, Vermont Secretary of State, Texas Secretary of State, and Oregon DCBS/DFR. Save each as `sources/registries/<state>-<YYYY-MM-DD>.csv`. Record in `SOURCES.md` the page URL, the download URL, the Wayback capture URL (save one with `https://web.archive.org/save/<url>` if none exists) and the date. If a state only offers HTML or PDF, convert it to CSV and note how in `SOURCES.md`. Copy each file's real header row into `COLUMN_MAPS`.
- [ ] **Step 2: Write failing tests** against the fixture CSVs, using each state's real headers with 3–4 rows:
  - `CA row becomes broker with registries.CA`
  - `dedupe merges case/suffix variants`: "Acxiom LLC" in CA and "ACXIOM CORPORATION" in VT give one record with both flags and an alias
  - `DBA matches existing record`
  - `blank opt-out stays unknown` (`optOut === null`)
  - `email opt-out sets method email`
  - `unknown category gives empty kind`
  - `re-import is idempotent` (running twice gives deep-equal output)
- [ ] **Step 3: Run the tests and confirm they fail.**
- [ ] **Step 4: Implement `import-registry.js`.**
- [ ] **Step 5: Run the tests and confirm they pass.**
- [ ] **Step 6: Run the import for all four states, then `npm run brokers:validate`.** Expected: the validator exits 0. The printed broker count is the deduped total; record it in the commit message.
- [ ] **Step 7: Commit**: `data(data-brokers): import CA/VT/TX/OR registries (<n> brokers)`

### Task 4: Opt-out URL checker

**Files:**
- Create: `research/data-brokers/build/check-urls.js`
- Modify: `package.json` scripts: add `"brokers:check-urls"`
- Test: `tests/broker-data/check-urls.test.js`

**Interfaces:**
- Produces:
  - `classifyResponse({requestedUrl, finalUrl, status}) → 'verified'|'suspect'|'dead'`. Rules:
    - status ≥ 400 or a network error → `dead`
    - a final URL whose path is `/` or empty when the requested path wasn't → `suspect`
    - a final URL on a different registrable domain → `suspect`
    - otherwise `verified`
  - CLI: GETs each `optOut.url` (concurrency 8, 15 s timeout, a real browser User-Agent, follows redirects). It writes `optOut.status` and `optOut.verifiedAt` (today) and prints a summary table of non-verified URLs. It never deletes a URL.

- [ ] **Step 1: Write failing tests**:
  - `404 is dead`
  - `redirect to root is suspect`
  - `cross-domain redirect is suspect`
  - `same-path 200 is verified`
  - `www vs apex is same domain`
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement `check-urls.js`.**
- [ ] **Step 4: Run the tests and confirm they pass. Then run the checker.** Expected: a summary prints. Add a short list of suspect and dead URLs to the commit body.
- [ ] **Step 5: Commit**: `data(data-brokers): first opt-out URL check`

### Task 5: Research families → staging → merge

This is the research phase. Five research agents run in parallel, one per family. Each writes **only** into `research/data-brokers/staging/<family>/` using the same shapes (`brokers/*.json` partials, `links.json`, `sources.json`). A merge script then folds the staging into the dataset, and the validator gates it.

**Files:**
- Create: `research/data-brokers/build/merge-staging.js`, `staging/<family>/…` (agent output)
- Test: `tests/broker-data/merge-staging.test.js`

**Interfaces:**
- Consumes: `validateDataset`, `normalizeName`.
- Produces: `mergeStaging(datasetDir, family) → {added, updated, rejected: [{item, reason}]}`.
  - Staged brokers match existing records by id, then by `normalizeName` of the name or alias.
  - New brokers are allowed only with `kind` set and ≥1 source.
  - Fields merge additively (arrays are unioned, and an existing non-null scalar is never overwritten; any conflict goes into `rejected`).
  - Links are deduped on `from|to|type`, with their sources unioned and the stronger tier kept.
  - Staged links are always written with `published: tier === 'A'`.

- [ ] **Step 1: Write failing tests**:
  - `staged alias merges into existing broker`
  - `conflicting scalar is rejected not overwritten`
  - `duplicate link unions sources and keeps stronger tier`
  - `tier B staged link lands unpublished`
  - `new broker without source is rejected`
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement `merge-staging.js`, then run the tests and confirm they pass.** Commit: `feat(data-brokers): staging merge`
- [ ] **Step 4: Dispatch the five research agents in parallel.** Each gets:
  - the spec's Phase 1 section
  - this task's shapes
  - the narrow-claim rule
  - the rule "every source needs a Wayback `archived` URL. Save one if none exists"
  - the instruction to write only to its staging folder

  The families and what each must cover:
  - **enforcement**: FTC and CFPB complaints, orders and settlements about data brokers. Must cover Kochava, X-Mode/Outlogic, InMarket, Gravy Analytics/Venntel, Mobilewalla, and GM/OnStar → Verisk and LexisNexis, plus any others found. Tier A.
  - **sec**: 10-K/20-F/annual reports for Experian, Equifax, TransUnion, RELX (LexisNexis), Thomson Reuters, LiveRamp, Omnicom (Acxiom), Publicis (Epsilon), Verisk, CoreLogic, Dun & Bradstreet, Nielsen if filing. Covers parents, acquisitions, named suppliers and customers, and revenue as a size signal. Tier A.
  - **procurement**: USAspending/SAM.gov awards from DHS, ICE, CBP, FBI, IRS and others to brokers (LexisNexis, Thomson Reuters, Babel Street, Venntel, Fog Data Science, etc.). Creates `buyer` nodes. Tier A.
  - **policies**: privacy policies and "sources/partners" pages for the hubs named in the spec, plus every broker the existing Reclamation missions link to (`src/data/missions-reclamation.js`). Tier B (unpublished).
  - **journalism**: links not supported by the families above, for the same hubs. Tier C (unpublished).
- [ ] **Step 4b: Fill in `missions` on broker records.** For every step `url` in `src/data/missions-reclamation.js`, match its registrable domain to a broker's `optOut.url` or website, and add that mission id to the broker's `missions`. Print any mission URL that matches no broker, then add the broker or note why it's a non-broker (e.g. `annualcreditreport.com`).
- [ ] **Step 5: For each family, run `node build/merge-staging.js <family>` and then `npm run brokers:validate`.** Expected: the validator exits 0. Review the rejected list by hand: fix and re-stage, or drop.
- [ ] **Step 6: Fact-check every published (tier A) link.** Open its source and confirm the `claim` sentence is supported as written. Narrow it or drop the link otherwise. Record the count checked in the commit body.
- [ ] **Step 7: Commit, one commit per family**: `data(data-brokers): <family> research (<n> links, <m> published)`

### Task 6: Reach, hubs and the game export

**Files:**
- Create: `research/data-brokers/build/reach.js`, `research/data-brokers/build/export.js`, `src/data/broker-map.json` (generated)
- Modify: `package.json` scripts: add `"brokers:export"`
- Test: `tests/broker-data/reach.test.js`, `tests/broker-data/export.test.js`

**Interfaces:**
- Consumes: the dataset files and `validateDataset`.
- Produces:
  - `computeReach(brokers, links) → Map<id, number>`. Reach = 1 + the number of distinct brokers reachable downstream along **published** `supplies`, `owns` and `matches-identity` edges (`buys` edges are followed in reverse: a buyer is downstream of its seller). Cycles are counted once. The function is deterministic. Size signals don't feed this number (Phase 2 may add them; the formula is documented in the README).
  - `pickHubs(reach, n = 12) → string[]`: top n by reach, ties broken by id ascending.
  - `export.js` writes `src/data/broker-map.json`:
    ```
    {asOf, brokers:[{id,name,parent,kind,registries,optOut,missions,reach,hub}],
     links:[{from,to,type,tier,claim,sources:[{url,archived}]}]}
    ```
    It includes **published links only**, and gives each source as `{url, archived}`, inlined so the game needs no lookup.

- [ ] **Step 1: Write failing tests**:
  - `isolated broker has reach 1`
  - `chain a→b→c gives a reach 3`
  - `cycle counted once`
  - `unpublished edge does not add reach`
  - `buys edge is reversed`
  - `pickHubs breaks ties by id`
  - `export drops unpublished links`
  - `export is byte-identical across two runs`
- [ ] **Step 2: Run the tests and confirm they fail.**
- [ ] **Step 3: Implement `reach.js` and `export.js`.**
- [ ] **Step 4: Run the tests, then `npm run brokers:export`.** Expected: tests PASS. The file is written, and its size is printed; it should be under 1 MB. If it's over, export `claim` text in a separate file and note that in the commit.
- [ ] **Step 5: Commit**: `feat(data-brokers): reach, hubs, game export`

### Task 7: README, publish, version

**Files:**
- Create: `research/data-brokers/README.md`
- Modify: `package.json` + `package-lock.json` version `5.2.0` → `5.3.0`
- Test: none new. Run the full suite.

- [ ] **Step 1: Write the README.** Cover:
  - what the dataset is
  - `asOf`
  - counts (brokers, links, published)
  - the evidence tiers and why only tier A is published
  - the record shapes
  - how to rebuild (`brokers:import`, `brokers:validate`, `brokers:check-urls`, `brokers:export`)
  - the reach formula
  - the 12 hubs as computed
  - how to cite
  - the license
  - how to report an error (a GitHub issue on this repo)
- [ ] **Step 2: Bump the version** with `npm version 5.3.0 --no-git-tag-version`.
- [ ] **Step 3: Run the full suite.** Run `npx vitest run` on the vast box (`~/.claude/bin/vast-test`) or locally if small. Expected: all tests pass, plus `npm run brokers:validate` exits 0.
- [ ] **Step 4: Commit and push, then open a PR** with the dataset counts, the hub list, and the suspect/dead URL summary in the body. Merge after the full suite is green.

---

## Next

Once this PR merges, write the Phase 2 plan (constellation screen, the debrief "which did you file?" checklist, "file again", the Big Check, Scout lines) against the real `broker-map.json`.
