# Broker Constellation, Phase 2, Plan 1: Recording what was filed

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broker mission debriefs ask "Which of these did you file?", completed broker missions can be re-checked with the same checklist (main's re-check mode), and a pure lighting function turns the saved game into the star states the map will draw.

**Architecture:** The checklist lines live in a new data file keyed by mission id. What the player ticks is stored in new optional top-level fields of the saved game, never in `missions[id]` answers, `missionEventData` or `track()`. `brokerLighting(map, state, today)` is a pure function over `src/data/broker-map.json` and the saved game, like `lights.js`. Nothing on the map screen exists yet; Plan 2 consumes this.

**Tech Stack:** Vanilla JS ESM (no build step; `src/` is deployed as is), vitest 5. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-18-broker-constellation-design.md`, Phase 2: "How stars light up", "Recording what was filed (Liz, 2026-10-18)", "Privacy", "Tests". Data contract: `research/data-brokers/README.md`, "The game's export".

**Plan order:** This is Plan 1 of 3. Plan 2 (`2026-10-19-broker-constellation-game-2-map.md`, the constellation screen) needs this merged. Plan 3 (`2026-10-19-broker-constellation-game-3-big-check.md`: Big Check, Scout lines, NAI/DAA halo data) needs Plans 1 and 2.

## Global Constraints

- No new npm dependencies, runtime or dev.
- `STATE_VERSION` stays `1`. `loadState` replaces any save whose version differs, so a bump would wipe every player's city.
- Old saves never lose progress. Migrations only clean values. Nothing already earned (district %, city lights, collective counts) changes.
- Nothing per-broker goes through `track()`, `missionEventData`, `restoreEvents` or the URL. That covers broker ids, ticked lines, residency and Big Check ticks.
- How `debriefRecord` treats "some" stays the same for district progress. The checklist feeds only the map.
- Lighting table (spec, verbatim):
  - a broker mission's "which did you file?" checklist lights exactly the brokers ticked there;
  - a legacy completed mission answered "all submitted" lights every broker that mission's steps cover (`missions` field on broker records);
  - a legacy "some submitted" answer lights nothing until the player fills in the new checklist;
  - DROP lights CA-registered brokers only if the player says they're a California resident;
  - NAI/DAA light nothing and give their members a "this browser only" halo, never lime;
  - a Big Check tick lights that one broker.
- Re-check: people-search brokers turn amber 90 days after they were lit. Stars lit by DROP never go amber.
- Credit freezes light nothing. They show as a "frozen" ring on the bureau stars.
- Residency answers: Yes / No / Rather not say. "No" and "Rather not say" mean DROP lights nothing.
- Every PR bumps the version (`package.json` + `package-lock.json`) **and** sets the stylesheet link in `src/index.html` to `style.css?v=<new version>`. `tests/css-cache-bust.test.js` holds the two equal.
- Copy follows the v5.0 recon rules: no claim we can't verify, and no numbers we can't source.
- **A line lights only its own site's star (Liz, 2026-10-19).** Ticking one site never lights its parent or operating company's star. A company's star lights only from its own opt-out, a sweep, or a mission line that files with that company itself. A site with no record of its own is a *site-only* line: its date is kept and shown, and it lights nothing.
- **Re-check-due stars still count toward FIELD COVERED (Liz, 2026-10-19).** Plan 2 draws them dimmer than freshly filed stars.
- **A `none` opt-out star is always the magenta ✕.** Nothing lights it, not a line, not DROP, not a Big Check tick, and it is outside the coverage denominator. Since PR #145, Radaris is one: its step is a note with no link, and its record has no missions.
- Dataset as of this plan: `asOf` 2026-10-19, 903 brokers (Vermont included), 106 published links, 12 hubs.
- **Decisions (controller, 2026-10-23)**, made after the drift check against main v6.3.2:
  1. Broker missions are filed again through main's existing **re-check mode**: `#/mission/<id>/recheck`, `renderDebrief(state, id, { recheck: true })`, `applyRecheck`, and `data-action="submit-recheck"`. They keep its RE-CHECK label. The "which did you file?" checklist lives in re-check mode. There is no "FILE AGAIN" link and no `refile-brokers` action.
  2. The map's first visit animates the lit stars, within `prefers-reduced-motion` (Plan 2).
  3. Only ticked checklist lines refresh a star's date. A re-check with no ticks changes no star's state or date, even when it rewrites the mission's stored answer.
- Facts from main (v6.3.2) that this plan builds on:
  - Re-check mode: `applyRecheck` (`src/utils/debrief.js`) keeps `status` and `completedAt`, may rewrite the stored answers, writes `rechecked`, and calls no `track()`. `canRecheck` is true for every broker mission. `submitRecheck` (`src/app.js`) goes to `#/district/<district>` for missions without an interior, which covers every Reclamation mission. `pageviewUrl` (`src/utils/pageview-url.js`) and Umami's `__rcBeforeSend` (`src/index.html`) both send the route as `#/mission/recheck`.
  - The Reclamation is a facility district (`type: 'facility'`). Its missions render in `renderFacilitySection` (`src/screens/district.js`), done rows show a `DONE` badge, and `renderMissionRow` never draws them.
  - `debriefForm(state, mission, given, recheck)` is shared by the open debrief and the re-check form.
  - `src/utils/errorNoise.js` `PRIVATE_UI` drops UI breadcrumbs whose selector matches it, before an error report is built.
  - `broker-state.js` must not import `src/state.js`, because `state.js` imports it for `loadState`. It carries its own `dayOf(iso)`.

## Review Focus

1. **An old save answered "Submitted all of them", then re-checked with only some lines ticked.** Expected: the lines not re-ticked stay lit at the mission's `completedAt` day. A re-check never unlights anything. Pinned by Task 3's `legacy all, then a partial re-check, keeps the rest lit`.
2. **A save with malformed broker fields** (`brokerFiled: "x"`, a line dated `"soon"`, `caResident: "maybe"`, `bigCheck: [1]`). Expected: it loads, every mission and district % is kept, and only the bad values are dropped. Pinned by Task 2's `cleanBrokerState drops bad values and keeps missions`.
3. **The player ticks lines, then answers "I'll come back to this".** Expected: nothing is recorded and nothing lights. Pinned by Task 4's `a skipped filing records no lines`.
4. **The device clock is set back, so a line's date is after today.** Expected: the star is lit, not amber, and nothing throws. Pinned by Task 3's `a date after today is lit, not amber`.
5. **A line id in the save that no longer exists in the checklist** (a later release renames a line). Expected: it is ignored and never lights a broker by accident. Pinned by Task 3's `unknown line ids are ignored`.
6. **A re-check of a legacy "all" filing changes the answer to "some" and ticks nothing.** Expected: every star keeps its state and date (decision 3). Pinned by Task 5's `a re-check that changes the answer and ticks nothing leaves every star as it was`.

---

## File Structure

```
src/data/broker-checklists.js     BROKER_CHECKLISTS (lines per mission), LEGACY_ALL_ANSWERS, FREEZE_RINGS
src/utils/broker-state.js         saved-game fields: cleanBrokerState, recordChecklist, materializeLegacy, applyChecklistFiling, setResidency, setBigCheck
src/utils/broker-lighting.js      brokerLighting, lineDates, fieldCoverage, fieldHeader, isBuyer, RECHECK_DAYS
src/components/broker-checklist.js  renderBrokerChecklist(mission, state, mode)
src/state.js                      loadState calls cleanBrokerState
src/screens/debrief.js            checklist: file mode in the open form, recheck mode in the re-check form; RE-CHECK link on the completed view
src/screens/district.js           RE-CHECK link on done checklist missions (renderFacilitySection)
src/app.js                        reads ticks on SUBMIT REPORT and on SAVE RE-CHECK; ticks all on "Submitted all"
src/index.html                    style.css?v= follows package.json (Task 0, Task 6)
src/utils/errorNoise.js           PRIVATE_UI drops checklist breadcrumbs
tests/fixtures/broker-map-mini.json  small map for lighting tests
tests/broker-game/*.test.js
```

Saved-game fields (all optional; an old save has none):

```
brokerFiled: { [missionId]: { lines: { [lineId]: 'YYYY-MM-DD' }, since?: 'YYYY-MM-DD' } }
  // since: the day this mission was first filed with the checklist. Absent = the mission was filed
  // before the checklist existed (a legacy filing), so its legacy answer still counts.
caResident: 'yes' | 'no' | 'unsaid'      // absent = not asked yet
bigCheck: { [brokerId]: 'YYYY-MM-DD' }   // Plan 3 writes it; lighting reads it here
```

---

### Task 0: Fix main's red stylesheet test

Main (v6.3.2) links `style.css?v=6.3.1`, so `tests/css-cache-bust.test.js` already fails before any work starts.

**Files:**
- Modify: `src/index.html` (the `<link rel="stylesheet">` line only)
- Test: `tests/css-cache-bust.test.js` (exists, unchanged)

- [ ] **Step 1: Run `npx vitest run tests/css-cache-bust.test.js` and confirm it fails**, expecting `style.css?v=6.3.2` and getting `style.css?v=6.3.1`.
- [ ] **Step 2: Change the link to `href="style.css?v=6.3.2"`.** Leave the comment above it alone.
- [ ] **Step 3: Run the test again.** Expected: PASS.
- [ ] **Step 4: Commit**: `fix: stylesheet link matches v6.3.2`

### Task 1: Checklist lines per mission

**Files:**
- Create: `src/data/broker-checklists.js`
- Test: `tests/broker-game/checklists.test.js`

**Interfaces:**
- Produces:
  - `type Line = { id: string, label: string, brokers?: string[], notLit?: string[], sweep?: 'drop' | 'nai' | 'daa', hint?: string }`. `brokers` are the records the line files with directly. `notLit` names the company the dataset ties a site-only line to, which the line deliberately doesn't light.
  - `BROKER_CHECKLISTS: Record<missionId, Line[]>`, frozen.
  - `checklistFor(missionId: string): Line[] | null`
  - `LEGACY_ALL_ANSWERS = { optout_result: ['all-submitted'], defense_done: ['done', 'already-done'] }`. A legacy filing counts as "all" when its record holds one of these.
  - `FREEZE_RINGS: Array<{ mission: string, question: string, values: string[], brokers: string[] }>`:
    - `credit_freeze-fortify-equifax`, `freeze_status`, `['already-frozen', 'now-frozen']`, `['equifax-information-services']`
    - `credit_freeze-fortify-experian`, same answers, `['experian-information-solutions']`
    - `credit_freeze-fortify-transunion`, same answers, `['trans-union']`
    - `credit_freeze-fortify-extras`, `freeze_extras`, `['both-frozen']`, `['innovis-data-solutions', 'chex-systems']`. Since the Vermont import (#236), Innovis's record id is `innovis-data-solutions`; there is no `innovis`.

The lines, one per step that reaches a broker record or a sweep (step-to-broker matching is `research/data-brokers/build/map-missions.js`; `--dry-run` prints it). A line lights a record only when the step files with that record itself:
- the step URL is the record's own `optOut.url` (or is on the site the record's own opt-out lives on);
- a `map-missions.js` override names the company's own consumer portal;
- a named step names the company.

A step on another site that the dataset ties to a company only by domain is site-only (`brokers: []`, `notLit: [company]`). Anywho is the exception that isn't one: its opt-out link is Spokeo's own form, so filing it is filing with Spokeo.

Steps that reach no record get no line: Radaris (a note since PR #145), Privateeye, FindPeopleSearch, Google Results About You, the complaint forms, Oracle and X-Mode.

| Mission | Line id: label → brokers |
|---|---|
| `people_search-fortify-web-forms` | `spokeo`: Spokeo → spokeo · `whitepages`: Whitepages → whitepages · `beenverified`: BeenVerified → beenverified, beenverified-llc-and-its-subsidiaries-and-affiliates |
| `people_search-fortify-removal-links` | `intelius`: Intelius → intelius · `truepeoplesearch`: TruePeopleSearch → free-data-services · `fastpeoplesearch`: FastPeopleSearch → mississippi-tornado-alley |
| `people_search-fortify-privacy-portals` | `usphonebook`: USPhonebook, site-only (notLit mississippi-tornado-alley) · `thatsthem`: ThatsThem, site-only (notLit spokeo) · `peoplefinder`: PeopleFinder, site-only (notLit intelius) |
| `people_search-reclaim-stragglers` | `mylife`: MyLife → mylife · `nuwber`: Nuwber → nuwber · `drop`: California DROP (sweep `drop`) |
| `people_search-fortify-extended-sweep-1` | `smartbackgroundchecks`: SmartBackgroundChecks, site-only (notLit mississippi-tornado-alley) · `searchpeoplefree`: SearchPeopleFree, site-only (notLit mississippi-tornado-alley) |
| `people_search-fortify-extended-sweep-2` | `peoplewhiz`: PeopleWhiz → peoplewhiz · `spydialer`: SpyDialer → spy-labs-adco · `anywho`: Anywho (Spokeo's form) → spokeo · `quickpeopletrace`: QuickPeopleTrace → quickpeopletrace · `usatrace`: Usatrace → usatrace |
| `people_search-fortify-extended-sweep-3` | `rocketreach`: RocketReach → rocketreach |
| `enterprise_data-fortify-lexisnexis` | `lexisnexis`: LexisNexis consumer opt-out → lexisnexis-risk-solutions, lexisnexis-risk-solutions-fl |
| `enterprise_data-fortify-thomson` | `thomson-clear`: Thomson Reuters CLEAR request → thomson-reuters, west-publishing, west-publising |
| `enterprise_data-fortify-property` | `corelogic`: CoreLogic (Cotality) → corelogic · `transunion-tlo`: TransUnion consumer privacy request (TLO) → trans-union, tloxp |
| `enterprise_data-reclaim-deep-layer` | `verisk-iso`: Verisk / ISO ClaimSearch → insurance-services-office · `work-number`: The Work Number → equifax-workforce-solutions · `data-axle`: Data Axle → data-axle · `sift`: Sift → sift |
| `ad_trackers-fortify-bulk` | `nai`: NAI opt-out tool (sweep `nai`) · `daa`: DAA WebChoices (sweep `daa`) |
| `ad_trackers-reclaim-individual` | `liveramp`: LiveRamp → liveramp · `acxiom`: Acxiom → acxiom · `lotame`: Lotame → lotame-solutions · `epsilon`: Epsilon → epsilon-data-management |
| `location_brokers-fortify-optout` | `safegraph`: SafeGraph → safegraph · `placer-ai`: Placer.ai → placer-ai · `gravy-analytics`: Gravy Analytics → gravy-analytics |
| `location_brokers-reclaim-legal` | `drop`: California DROP (sweep `drop`) |

Hints (exact copy):
- `drop`: `California residents only. It lights the map only if you tell the map you live in California.`
- `nai`, `daa`: `Sets an opt-out cookie in this browser on this device. It deletes nothing.`

- [ ] **Step 1: Write the failing tests**

```js
const map = JSON.parse(readFileSync('src/data/broker-map.json', 'utf8'));
const ids = new Set(map.brokers.map((b) => b.id));
const RECON = /-recon-/;

it('every line broker exists in broker-map.json', () => {
  for (const lines of Object.values(BROKER_CHECKLISTS)) for (const l of lines) for (const b of l.brokers ?? []) expect(ids.has(b), b).toBe(true);
});
it('lines account for the dataset mapping exactly, mission by mission', () => {
  // union of a mission's line brokers and notLit === brokers whose `missions` lists it (recon missions excluded)
  const want = {};
  for (const b of map.brokers) for (const m of b.missions) if (!RECON.test(m)) (want[m] ??= new Set()).add(b.id);
  for (const [m, set] of Object.entries(want)) expect(new Set(checklistFor(m).flatMap((l) => [...(l.brokers ?? []), ...(l.notLit ?? [])]))).toEqual(set);
});
it('a site-only line lights nothing', () => {
  const portals = checklistFor('people_search-fortify-privacy-portals');
  expect(portals.map((l) => l.id)).toEqual(['usphonebook', 'thatsthem', 'peoplefinder']);
  for (const l of portals) expect(l.brokers ?? []).toEqual([]);
  expect(checklistFor('people_search-fortify-extended-sweep-1').flatMap((l) => l.brokers ?? [])).toEqual([]);
});
it('a line never names a broker in both brokers and notLit', ...);
it('Radaris has no line', () => { for (const lines of Object.values(BROKER_CHECKLISTS)) expect(lines.some((l) => l.brokers?.includes('radaris'))).toBe(false); });
it('a line is exactly one of: a broker line, a site-only line (notLit set), a sweep', ...);
it('line ids are unique within a mission', ...);
it('every checklist mission exists in MISSIONS and is not recon', ...);
it('DROP is its own line in both DROP missions', () => {
  expect(checklistFor('people_search-reclaim-stragglers').find((l) => l.id === 'drop').sweep).toBe('drop');
  expect(checklistFor('location_brokers-reclaim-legal').map((l) => l.id)).toEqual(['drop']);
});
it('freeze missions have no checklist', () => expect(checklistFor('credit_freeze-fortify-equifax')).toBe(null));
it('every FREEZE_RINGS broker exists', ...);
```

- [ ] **Step 2: Run `npx vitest run tests/broker-game/checklists.test.js` and confirm it fails** (module missing).
- [ ] **Step 3: Write `src/data/broker-checklists.js`** with the table above.
- [ ] **Step 4: Run the test again.** Expected: PASS. If `lines account for the dataset mapping` fails, the table or the dataset is wrong. Fix the table to follow `map-missions.js`, never the dataset by hand.
- [ ] **Step 5: Commit**: `feat(broker-map): checklist lines for each broker mission`

### Task 2: Saved-game fields and their clean-up

**Files:**
- Create: `src/utils/broker-state.js`
- Modify: `src/state.js` (`loadState`: `return cleanBrokerState(migrateBrokenAnswers(parsed));`)
- Test: `tests/broker-game/broker-state.test.js`

**Interfaces:**
- Consumes: `checklistFor`, `LEGACY_ALL_ANSWERS` (Task 1).
- Produces:
  - `RESIDENCY = ['yes', 'no', 'unsaid']`
  - `dayOf(iso: string) → 'YYYY-MM-DD' | null`: the local calendar day of an ISO time, by the same rule as `localDay` in `state.js`. A value that doesn't parse gives `null`.
  - `cleanBrokerState(state) → state`. It keeps only well-formed values: `brokerFiled` entries that are objects with a `lines` object, line values that are real `YYYY-MM-DD` days, `since` only when it's a real day, `caResident` only from `RESIDENCY`, and `bigCheck` only as an object of real days. It returns the same object when nothing changed. It never touches `missions`.
  - `recordChecklist(state, missionId, lineIds: string[], day: string, { first = false } = {}) → state`. It sets `lines[id] = day` for each id that is a line of that mission (other ids are dropped), and sets `since = day` when `first` and `since` is absent. It returns `state` unchanged when the mission has no checklist or `lineIds` is empty and `first` is false.
  - `setResidency(state, value) → state`. A value outside `RESIDENCY` deletes the field (back to "not asked").
  - `setBigCheck(state, brokerId, ticked: boolean, day) → state`. Ticked sets the day, unticked deletes the key.
  - `materializeLegacy(state, missionId) → state`. It applies only to a legacy "all" filing: `missions[missionId].status === 'completed'`, the record's `optout_result` or `defense_done` answer is in `LEGACY_ALL_ANSWERS`, the mission has a checklist, `brokerFiled[missionId]?.since` is absent, and `dayOf(record.completedAt)` is a day. In that case it writes every line not already recorded at that day and sets `since` to that day. Otherwise it returns `state` unchanged (the same object). The stars it lights, and their dates, are exactly the ones Task 3's legacy rule already gives, so calling it never changes the map. Task 5 calls it before a re-check can rewrite the answer.

- [ ] **Step 1: Write the failing tests**

```js
it('STATE_VERSION stays 1', () => expect(STATE_VERSION).toBe(1));
it('cleanBrokerState drops bad values and keeps missions', () => {
  const s = { missions: { a: { status: 'completed' } }, brokerFiled: 'x', caResident: 'maybe', bigCheck: [1] };
  expect(cleanBrokerState(s)).toEqual({ missions: { a: { status: 'completed' } } });
  const t = { missions: {}, brokerFiled: { m: { lines: { spokeo: '2026-07-01', whitepages: 'soon' }, since: 'x' }, n: null } };
  expect(cleanBrokerState(t).brokerFiled).toEqual({ m: { lines: { spokeo: '2026-07-01' } } });
});
it('an old save without the fields is returned as is', () => { const s = { missions: {} }; expect(cleanBrokerState(s)).toBe(s); });
it('loadState of a corrupted broker field keeps the city', ...); // via mock storage, as in tests/state.test.js
it('recordChecklist first filing sets lines and since', () => {
  const s = recordChecklist({}, 'people_search-fortify-web-forms', ['spokeo', 'bogus'], '2026-10-19', { first: true });
  expect(s.brokerFiled['people_search-fortify-web-forms']).toEqual({ lines: { spokeo: '2026-10-19' }, since: '2026-10-19' });
});
it('re-filing updates dates and never sets since', ...);
it('a first filing with no ticks still records since', ...); // so legacy "all" no longer applies to it
it('recordChecklist on a mission with no checklist is a no-op', ...);
it('setResidency accepts yes/no/unsaid and clears anything else', ...);
it('setBigCheck ticks and unticks', ...);
it('materializeLegacy writes a legacy all filing into lines at its completedAt day', () => {
  const s = { missions: { 'people_search-fortify-web-forms': { status: 'completed', optout_result: 'all-submitted', completedAt: '2026-03-01T12:00:00.000Z' } } };
  expect(materializeLegacy(s, 'people_search-fortify-web-forms').brokerFiled['people_search-fortify-web-forms'])
    .toEqual({ lines: { spokeo: '2026-03-01', whitepages: '2026-03-01', beenverified: '2026-03-01' }, since: '2026-03-01' });
});
it('materializeLegacy keeps lines already recorded', ...);  // lines {spokeo: '2026-10-19'} stays '2026-10-19'; the other two get '2026-03-01'
it('materializeLegacy leaves some-submitted, skipped, no-checklist and checklist filings alone', ...); // each returns the same object
it('broker-state.js never imports state.js', () => expect(readFileSync('src/utils/broker-state.js', 'utf8')).not.toMatch(/from ['"]\.\.\/state\.js['"]/));
```

- [ ] **Step 2: Run `npx vitest run tests/broker-game/broker-state.test.js` and confirm it fails.**
- [ ] **Step 3: Implement `broker-state.js` and wire `cleanBrokerState` into `loadState`.** Use a `YYYY-MM-DD` round-trip check like `dayValue` in `state.js`.
- [ ] **Step 4: Run the new test plus `npx vitest run tests/state.test.js tests/breaker-phase1`.** Expected: all PASS.
- [ ] **Step 5: Commit**: `feat(broker-map): saved-game fields for filed lines, residency and ticks`

### Task 3: The lighting function and coverage

**Files:**
- Create: `src/utils/broker-lighting.js`, `tests/fixtures/broker-map-mini.json`
- Test: `tests/broker-game/lighting.test.js`

**Interfaces:**
- Consumes: `BROKER_CHECKLISTS`, `LEGACY_ALL_ANSWERS`, `FREEZE_RINGS` (Task 1); `dayOf` (Task 2) for `completedAt` days. Tests also use `materializeLegacy` and `recordChecklist` (Task 2).
- Produces:
  - `RECHECK_DAYS = 90`
  - `isBuyer(broker) → boolean`: `kind` includes `buyer`.
  - `lineDates(state, missionId, checklists = BROKER_CHECKLISTS) → Record<lineId, day>`. The mission's recorded lines, plus, for a legacy "all" filing (completed, a `LEGACY_ALL_ANSWERS` answer, no `since`), every line not recorded dated `dayOf(record.completedAt)`.
  - `isChecklistPending(state, missionId, checklists = BROKER_CHECKLISTS) → boolean`: the mission is completed, has a checklist, and `lineDates` is empty.
  - `brokerLighting(map, state, today: string, checklists = BROKER_CHECKLISTS) → Lighting`:
    ```
    Lighting = {
      stars: { [id]: { state: 'lit' | 'amber' | 'no-opt-out' | 'dim', litOn: string | null, via: Array<'checklist' | 'legacy' | 'drop' | 'big-check'> } },
      frozen: string[],     // sorted ids with a "frozen" ring
      halo: string[],       // sorted ids with the "this browser only" halo (members of a filed NAI/DAA sweep, from map.sweeps?.[s]?.members ?? [])
      pending: string[],    // sorted mission ids where isChecklistPending (Scout's "Tell Scout which ones you filed")
      drop: 'off' | 'ask' | 'not-resident' | 'lit',   // off: DROP not filed; ask: filed, residency unanswered
    }
    ```
    The rules, in order:
    - A broker line dated in `lineDates` lights its brokers (`checklist`, or `legacy` when the date came from `completedAt`).
    - A filed `drop` line with `caResident === 'yes'` lights every broker with a truthy `registries.CA` (`drop`).
    - A Big Check day lights that broker (`big-check`).
    - `litOn` is the latest of the dates.
    - Buyers are never lit.
    - A lit star is `amber` when its `kind` includes `people-search`, `drop` is not in `via`, and `today - litOn >= 90` days.
    - A broker with `optOut?.method === 'none'` is always `no-opt-out`, whatever lines, sweeps or ticks would otherwise light it.
    - Unknown missions, unknown line ids and bad dates are ignored.
  - `fieldCoverage(map, lighting) → { percent: number, hubsLit: number, hubsTotal: number }`:
    - `reachable(b) = !isBuyer(b) && b.optOut?.method !== 'none'`
    - `percent = Math.floor(100 * Σ reach of lit-or-amber reachable stars / Σ reach of reachable stars)` (0 when the denominator is 0). Amber counts in full (Liz, 2026-10-19).
    - `hubsLit` counts hubs that are lit or amber; `hubsTotal` counts `hub: true`
  - `fieldHeader({ percent, hubsLit, hubsTotal }) → string`: `` `FIELD COVERED: ${percent}% · HUBS LIT ${hubsLit}/${hubsTotal}` ``

`broker-map-mini.json` is `formatVersion: 1`, `links: []`. Brokers, each `{ reach: 1, hub: false, optOut: { method: 'web-form', url: 'https://example.test/x', status: 'verified' } }` unless noted:

| id | kind | CA | missions | notes |
|---|---|---|---|---|
| spokeo | people-search | yes | web-forms, privacy-portals | |
| whitepages | people-search | no | web-forms | |
| beenverified | people-search | no | web-forms | |
| acxiom | marketing | yes | ad_trackers-reclaim-individual | |
| lexisnexis-risk-solutions | risk-identity | no | enterprise_data-fortify-lexisnexis | |
| equifax-information-services | financial | yes | — | |
| hub-a | risk-identity | yes | — | reach 6, hub true |
| tail-1 | — | yes | — | |
| tail-2 | — | no | — | optOut null |
| nope | marketing | yes | — | optOut method none |
| us-ice | buyer | no | — | optOut null |
| criteo | ad-network | no | — | |

Plus `sweeps: { nai: { members: ['criteo'] }, daa: { members: ['criteo'] } }`. The test passes a `checklists` built from the real one, restricted to these ids. Reachable reach in this fixture totals 15.

- [ ] **Step 1: Write the failing tests** (`today = '2026-10-19'` unless noted)

```js
it('nothing filed: every star dim, nope is no-opt-out, 0%', () => {
  const l = brokerLighting(mini, {}, '2026-10-19', cl);
  expect(l.stars.spokeo.state).toBe('dim'); expect(l.stars.nope.state).toBe('no-opt-out');
  expect(fieldCoverage(mini, l)).toEqual({ percent: 0, hubsLit: 0, hubsTotal: 1 });
});
it('checklist lights exactly the ticked brokers', ...);           // spokeo line only → spokeo lit, whitepages dim
it('legacy all submitted lights every broker the mission covers', ...); // web-forms {completed, all-submitted, completedAt '2026-03-01T12:00:00.000Z'} → spokeo, whitepages, beenverified lit, litOn '2026-03-01', via ['legacy']
it('legacy defense done counts as all', ...);                      // enterprise_data-fortify-lexisnexis defense_done 'done'
it('legacy some submitted lights nothing and is pending', ...);    // pending: ['people_search-fortify-web-forms']
it('filling in the checklist clears pending', ...);
it('a new filing ignores its all-submitted answer', ...);          // since set, lines {spokeo} → whitepages dim
it('legacy all, then a partial re-check, keeps the rest lit', ...); // materializeLegacy, then recordChecklist spokeo '2026-10-19': spokeo litOn '2026-10-19'; whitepages still lit at '2026-03-01'
it('a materialized legacy filing lights the same stars on the same days', ...); // brokerLighting before and after materializeLegacy: deep-equal stars
it('DROP with residency yes lights CA-registered brokers only', () => {
  // drop ticked in stragglers, caResident 'yes' → spokeo, acxiom, equifax-information-services, hub-a, tail-1 lit via drop; nope stays no-opt-out; whitepages dim; us-ice dim
});
it.each([['no'], ['unsaid']])('DROP with residency %s lights nothing', ...);  // drop: 'not-resident'
it('DROP with residency unanswered lights nothing and asks', ...);           // drop: 'ask'
it('a site-only line is dated but lights nothing', ...);       // privacy-portals usphonebook ticked → lineDates has it; spokeo, intelius and every other star dim
it('people-search turns amber at 90 days, not 89', () => {
  // spokeo line dated '2026-07-01': today '2026-09-28' → lit, today '2026-09-29' → amber
});
it('non-people-search never goes amber', ...);                     // acxiom dated '2026-01-01' → lit
it('a DROP-lit star never goes amber', ...);                       // spokeo dated '2026-01-01' and DROP-lit → lit
it('a date after today is lit, not amber', ...);
it('a freeze lights nothing and rings the bureau', ...);           // credit_freeze-fortify-equifax freeze_status 'now-frozen' → frozen ['equifax-information-services'], its state 'dim'
it('NAI gives a halo, never a light', ...);                        // halo ['criteo'], criteo 'dim'
it('a Big Check tick lights that broker', ...);                    // bigCheck {tail-2: '2026-10-01'} → tail-2 lit via ['big-check']
it('buyers are never lit', ...);
it('unknown line ids are ignored', ...);                           // lines {gone: '2026-10-01'} → nothing lit
it('coverage is reach-weighted, floored, deterministic', () => {
  // spokeo alone → 6 (1/15); hub-a alone → 40 (6/15); every reachable star but tail-2 → 93 (14/15); all reachable → 100
});
it('an amber star still counts toward coverage', ...);          // spokeo amber → 6, the same as spokeo lit
it('a no-opt-out star is never lit, even by DROP or a tick', ...); // nope is CA-registered; DROP + bigCheck {nope} → still 'no-opt-out', coverage unchanged
it('fieldHeader', () => expect(fieldHeader({ percent: 31, hubsLit: 3, hubsTotal: 12 })).toBe('FIELD COVERED: 31% · HUBS LIT 3/12'));
it('the real map has 12 hubs', () => expect(fieldCoverage(realMap, brokerLighting(realMap, {}, '2026-10-19')).hubsTotal).toBe(12));
it('an old save with no broker fields never throws', ...);         // {missions: {...}} and {} and null-ish brokerFiled entries
```

- [ ] **Step 2: Run `npx vitest run tests/broker-game/lighting.test.js` and confirm it fails.**
- [ ] **Step 3: Implement `broker-lighting.js`.** Day differences go through UTC-midnight values, as `dayValue` does in `state.js`.
- [ ] **Step 4: Run the test again.** Expected: PASS.
- [ ] **Step 5: Commit**: `feat(broker-map): pure lighting function and reach-weighted coverage`

### Task 4: "Which of these did you file?" in the debrief

**Files:**
- Create: `src/components/broker-checklist.js`
- Modify: `src/screens/debrief.js` (`debriefForm(state, mission, given, recheck)` appends the checklist in file mode only when `recheck` is false; Task 5 adds recheck mode), `src/utils/broker-state.js` (`applyChecklistFiling`), `src/app.js` (`submitDebrief`, `refreshDebriefForm`)
- Test: `tests/broker-game/debrief-checklist.test.js`

**Interfaces:**
- Consumes: `checklistFor`, `LEGACY_ALL_ANSWERS` (Task 1); `recordChecklist` (Task 2); `lineDates`, `isChecklistPending` (Task 3); `localDay`.
- Produces:
  - `renderBrokerChecklist(mission, state, mode: 'file' | 'recheck') → string` (`''` when the mission has no checklist). File mode renders `<div class="broker-checklist" data-broker-checklist="<missionId>">` with the label `WHICH OF THESE DID YOU FILE?`, the sub-line `Only this browser keeps this. It lights your field map and is never sent anywhere.`, and one `<input type="checkbox" name="filed" value="<lineId>">` per line, unticked, plus the line's `hint`. The `broker-checklist` class is what Task 6's `PRIVATE_UI` matches. Recheck mode is Task 5's.
  - `checklistTicksFor(questionId: string, value: string) → 'all' | 'none' | null`, exported from `broker-checklist.js`. It returns `'all'` for a `LEGACY_ALL_ANSWERS` value, `'none'` for `skip`, and `null` otherwise.
  - `applyChecklistFiling(state, missionId, status, lineIds, day) → state` in `broker-state.js`. It is `recordChecklist(..., { first: true })` when `status === 'completed'`, else `state`.
- `app.js`:
  - `submitDebrief` reads `[data-broker-checklist] input[name="filed"]:checked` and, after `fileDebrief`, applies `applyChecklistFiling(filed.state, missionId, filed.event?.status, ticks, localDay())` to `filed.state` before the existing `noteFirstTwoFactor` → `streakAfterFiling` → `ensureBurst` → `setState` chain.
  - `refreshDebriefForm` applies `checklistTicksFor` when the mission's first question *changes*, ticking or unticking every `filed` box once (the player can still change them). It never acts on a prefilled answer, so a re-check form that opens on "all submitted" starts with every box unticked (decision 3). `readAnswers` reads only `q_*` names, so the `filed` boxes never reach the answers.
  - Neither touches `track()`.

- [ ] **Step 1: Write the failing tests**

```js
it('an open broker debrief lists one tick box per line', () => {
  const html = renderDebrief(createInitialState(), 'people_search-fortify-web-forms');
  expect([...html.matchAll(/name="filed" value="([^"]+)"/g)].map((m) => m[1])).toEqual(['spokeo', 'whitepages', 'beenverified']);
});
it('DROP is its own line with its hint', ...);
it('a mission with no checklist renders none', ...);   // credit_freeze-fortify-equifax, ad_trackers-fortify-platforms
it('the re-check form carries no file-mode checklist', ...); // completed web-forms: renderDebrief(s, id, { recheck: true }) has no data-broker-checklist without data-mode="recheck" (that panel is Task 5's)
it('checklistTicksFor', () => {
  expect(checklistTicksFor('optout_result', 'all-submitted')).toBe('all');
  expect(checklistTicksFor('optout_result', 'some-submitted')).toBe(null);
  expect(checklistTicksFor('optout_result', 'skip')).toBe('none');
  expect(checklistTicksFor('defense_done', 'already-done')).toBe('all');
});
it('a completed filing records the ticked lines with since', ...);
it('a skipped filing records no lines', ...);  // applyChecklistFiling(state, id, 'skipped', ['spokeo'], day) === state
it('the checklist never reaches the mission record or its event', () => {
  // fileDebrief + applyChecklistFiling; missions[id] has no 'filed'/'lines' key; missionEventData(...) has no line ids
});
it('district progress is the same with and without brokerFiled', ...); // calcDistrictProgress(state, 'reclamation')
```

- [ ] **Step 2: Run `npx vitest run tests/broker-game/debrief-checklist.test.js` and confirm it fails.**
- [ ] **Step 3: Implement the component, `checklistTicksFor` and `applyChecklistFiling`, and wire `debrief.js` and `app.js`.** The checkbox rows reuse the debrief's `debrief-opt` row style.
- [ ] **Step 4: Run the test plus `npx vitest run tests/recon-phase2-review.test.js tests/passwords-2fa-ui.test.js tests/recheck.test.js`.** Expected: PASS.
- [ ] **Step 5: Commit**: `feat(broker-map): debrief asks which brokers you filed`

### Task 5: Re-check a broker mission

A completed broker mission is filed again through main's re-check mode (decision 1). The re-check form keeps its RE-CHECK heading and SAVE RE-CHECK button, and gains the checklist with each line's last date.

**Files:**
- Modify: `src/components/broker-checklist.js` (recheck mode), `src/screens/debrief.js` (re-check form and completed view), `src/screens/district.js` (`renderFacilitySection`), `src/app.js` (`submitRecheck`)
- Test: `tests/broker-game/recheck-brokers.test.js`. `tests/recheck.test.js` already exists and must stay green.

**Interfaces:**
- Consumes: Tasks 1–4; `applyRecheck`, `canRecheck` (`src/utils/debrief.js`); `pageviewUrl` (`src/utils/pageview-url.js`).
- Produces:
  - Recheck mode renders `<div class="broker-checklist" data-broker-checklist="<missionId>" data-mode="recheck">`:
    - The label is `FILED AGAIN?`, or `TELL SCOUT WHICH ONES YOU FILED` when `isChecklistPending(state, id)`. The sub-line is the same as file mode's.
    - Each line shows `Last filed YYYY-MM-DD` (from `lineDates`) or `Not recorded yet`, then an unticked `<input type="checkbox" name="filed" value="<lineId>">`, then its `hint`.
    - It has no button. The form's existing SAVE RE-CHECK (`data-action="submit-recheck"`) submits it.
  - `debriefForm(state, mission, given, recheck)` appends recheck mode when `recheck` is true and the mission has a checklist.
  - The completed debrief of a checklist mission (`renderDebrief` without `recheck`) adds `<a href="#/mission/<id>/recheck" class="btn-secondary" style="text-decoration: none;">RE-CHECK</a>` beside SECURED. When `isChecklistPending`, the line above the footer reads `Tell Scout which ones you filed.`.
  - In `renderFacilitySection`, a done row of a checklist mission (`record.status === 'completed'`) adds `<a href="#/mission/<id>/recheck">RE-CHECK</a>` beside its `DONE` badge, styled like the row's RETRY link. Other rows are unchanged.
  - `submitRecheck(missionId)` in `app.js`. A mission with no checklist keeps today's path exactly. A checklist mission does this:
    ```js
    const base = materializeLegacy(state, missionId);            // before applyRecheck can rewrite the answer
    const next = applyRecheck(base, mission, readAnswers(app, mission));
    if (!next) { /* the existing [data-recheck-msg] path; nothing is saved, base included */ return; }
    const ticks = [...app.querySelectorAll('[data-broker-checklist] input[name="filed"]:checked')].map((el) => el.value);
    setState(recordChecklist(next, missionId, ticks, localDay()));
    ```
    Then it takes its existing navigation (`#/district/reclamation`). No `track()`, no `afterMissionRecorded`, no event.
  - `brokerLighting` is unchanged. Once `materializeLegacy` has set `since`, the stored answer no longer matters, so a re-check that changes `all-submitted` to `some-submitted` unlights nothing. Only ticked lines get a new date (decision 3).
  - Nothing in `src/` says "FILE AGAIN", and there is no `refile-brokers` action.

- [ ] **Step 1: Write the failing tests**

```js
it('a re-check of a legacy all filing shows each line\'s date', () => {
  // web-forms {completed, all-submitted, completedAt '2026-03-01T12:00:00.000Z'}: renderDebrief(s, id, { recheck: true }) has
  // data-mode="recheck", 'FILED AGAIN?', 'Last filed 2026-03-01' three times, data-action="submit-recheck", and no checked filed box
});
it('a re-check of a legacy some-submitted filing asks Scout\'s question', ...);   // 'TELL SCOUT WHICH ONES YOU FILED', 'Not recorded yet' three times
it('the open debrief has no recheck panel', ...);                                 // renderDebrief(createInitialState(), id) has no data-mode="recheck"
it('a re-check with ticks dates only the ticked lines', () => {
  // materializeLegacy → applyRecheck(optout_result 'all-submitted') → recordChecklist(['spokeo'], '2026-10-19'):
  // brokerLighting(mini, …, '2026-10-19'): spokeo litOn '2026-10-19'; whitepages and beenverified litOn '2026-03-01'
});
it('a re-check that changes the answer and ticks nothing leaves every star as it was', () => {
  // legacy all; materializeLegacy → applyRecheck(optout_result 'some-submitted') → recordChecklist([], day):
  // brokerLighting(...).stars deep-equals the stars before the re-check; pending stays []
});
it('a re-check keeps the mission completed with its completedAt and sends nothing', ...); // status 'completed', completedAt unchanged, rechecked set; missionEventData unchanged
it('the completed debrief links RE-CHECK', () => {
  // renderDebrief(completed web-forms) contains href="#/mission/people_search-fortify-web-forms/recheck" and '>RE-CHECK<'
});
it('nothing says FILE AGAIN and there is no refile-brokers action', ...); // every src/**/*.js file: no 'FILE AGAIN', no 'refile-brokers'
it('the district offers RE-CHECK only on done checklist missions', () => {
  // renderDistrict(state, 'reclamation'): a completed web-forms row has href="#/mission/people_search-fortify-web-forms/recheck";
  // an open web-forms row and a completed credit_freeze-fortify-equifax row don't
});
it('the re-check route stays private', () => {
  const href = 'https://x.test/reclaim-city/#/mission/people_search-fortify-web-forms/recheck';
  expect(pageviewUrl(parseRoute('#/mission/people_search-fortify-web-forms/recheck'), href)).toBe('https://x.test/reclaim-city/#/mission/recheck');
});
```

- [ ] **Step 2: Run `npx vitest run tests/broker-game/recheck-brokers.test.js` and confirm it fails.**
- [ ] **Step 3: Implement recheck mode, the completed-view link, the district link and the `submitRecheck` branch.**
- [ ] **Step 4: Run the test again plus `npx vitest run tests/recheck.test.js tests/district-phase-gating.test.js tests/pageview.test.js tests/analytics-hook.test.js`.** Expected: PASS.
- [ ] **Step 5: Commit**: `feat(broker-map): re-check a broker mission with its checklist`

### Task 6: Privacy guard, version, PR

**Files:**
- Test: `tests/broker-game/privacy.test.js`
- Modify: `src/utils/errorNoise.js` (`PRIVATE_UI` gains `broker-checklist`), `package.json`, `package-lock.json`, `src/index.html` (stylesheet link)

- [ ] **Step 1: Write the tests**

```js
it('restoreEvents is identical with and without the broker fields', ...);
it('the new modules never import analytics', () => {
  for (const f of ['src/utils/broker-state.js', 'src/utils/broker-lighting.js', 'src/components/broker-checklist.js', 'src/data/broker-checklists.js'])
    expect(readFileSync(f, 'utf8')).not.toMatch(/analytics|track\(/);
});
it('checklist breadcrumbs never leave the device', () => {
  expect(isPrivateBreadcrumb({ category: 'ui.click', message: 'div.broker-checklist > label.debrief-opt > input[type="checkbox"][name="filed"]' })).toBe(true);
  expect(isPrivateBreadcrumb({ category: 'ui.click', message: 'button.btn-primary' })).toBe(false);
});
```

- [ ] **Step 2: Add `broker-checklist` to the `PRIVATE_UI` alternation in `src/utils/errorNoise.js`, then run `npx vitest run tests/broker-game tests/errorNoise.test.js`.** Expected: PASS.
- [ ] **Step 3: Bump the version** with `npm version minor --no-git-tag-version` (6.3.2 → 6.4.0), and set `src/index.html`'s link to `style.css?v=6.4.0`. Run `npx vitest run tests/css-cache-bust.test.js`. Expected: PASS.
- [ ] **Step 4: Run the full suite** with `npx vitest run` (or `~/.claude/bin/vast-test`). Expected: every test passes.
- [ ] **Step 5: Check it in a browser at 375px** (Playwright). File `people_search-fortify-web-forms` with two of three ticked. Open RE-CHECK from the district, tick the third line, and SAVE RE-CHECK. Confirm the hash reads `#/mission/<id>/recheck` while there (its pageview goes out as `#/mission/recheck`), and that there's no horizontal scroll. Save the screenshots under `docs/screenshots/broker-constellation/`.
- [ ] **Step 6: Commit, push, and open a PR.** Commit by explicit paths. Merge once the full suite is green.
