# Building Interiors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tap a building to open a cutaway of its floors: the account's checkup, the records desk where each named agency gets something, the break-in entries the player seals, and a saint's alcove. Ships for the nine Master Keys buildings plus Signal.

**Architecture:** Content is plain data in `src/data/interiors/`: lanes, entries, saints and sources. A pure evaluator (`src/utils/interior.js`) turns save state plus content into floor view-models. A new screen (`src/screens/building.js`) renders them. Seal states come only from existing mission records. A new re-check debrief mode refreshes dates without touching `status`, `completedAt` or analytics.

**Tech Stack:** Plain ES modules served from `src/` (no build step), vitest 5, template-string HTML screens, `localStorage` save (`reclaim-city-state`).

**Spec:** `docs/superpowers/specs/2026-10-20-building-interiors-design.md`. Read it before starting any task.

## Global Constraints

- No omni-"they": no interior copy or Scout interior line may contain the word "they," and no actor may be "the government," "hackers," "someone," or another unnamed group. Each lane names one specific actor (spec, "Anti-goals").
- No claim without a source. Every records-desk lane, entry and saint has `sources[]` with at least one entry. Every `sources[].url` and step URL is live-checked and listed in `tests/fixtures/verified-urls.json`.
- No points or currency. Reward is light and motion only. Don't change `districtLights` tiers, district percent, `calcIntegrity`, the collective score, or any `track()` payload.
- Nothing interior-related reaches analytics or error reports: device lists, candles, floors, seals, rechecks and which building was opened.
- Old saves never lose progress. New state fields (`devices`, `interior`, `rechecked`) are optional, and code reads them with defaults.
- Phone-first: one column, 16px gutters, no horizontal scroll at 375px, tap targets ≥44px, no hover-only affordance, no `white-space: nowrap` on text blocks, no fixed pixel width >360.
- Spelling: **Swartz**. Chelsea Manning, she/her. Tributes are warm and plain about hard facts (Swartz's death, Manning's imprisonment, Snowden's exile), with no speculation about motives or private lives.
- Seal rules lean strict: when in doubt, don't seal (spec, "Decisions from the builder check").
- Every PR bumps the version in `package.json` + `package-lock.json` (minor: 5.4.0).

## Review Focus

- **Old records without dates.** A completed mission from an old save may lack `completedAt`. Freshness must return `'unknown'` (bars at "date unknown"), never treat it as fresh, and never throw. Test in Task 2.
- **Hostile device labels.** A label like `<img src=x onerror=alert(1)>`, an 80-character label, or emoji must render escaped, be trimmed to 40 characters, and stay inside 375px. Test in Task 5.
- **A building with no interior, or a disabled account.** `#/building/netflix`, `#/building/nope` and a disabled `gmail` must render a calm "No floor plan yet" page with a back link, never the error screen. Those buildings stay non-tappable in the district. Test in Task 4.
- **Legacy and replaced records.** Facebook's `facebook-recon-breach` was replaced by `facebook-recon-password`. A 2FA record filed with the legacy question shape has `method` missing. The evaluator must use `isMissionDoneIn` and `twoFactorMethod`, and must not report *open* for data it can't read. Test in Task 2.
- **Re-check on a non-completed mission.** `#/mission/<id>/recheck` for a skipped, not-needed or never-filed mission redirects to the normal briefing. Submitting a re-check never changes `status` or `completedAt` and never calls `track`. Test in Task 3.

---

### Task 1: Interior content model, shared lanes, and the Gmail interior

**Files:**
- Create: `src/data/interiors/index.js`, `src/data/interiors/lanes.js`, `src/data/interiors/saints.js`, `src/data/interiors/master-keys.js`
- Modify: `tests/fixtures/verified-urls.json` (add every new source URL, live-checked, with how it answered)
- Test: `tests/interiors-content.test.js`

**Interfaces:**
- Produces:
  - `INTERIORS: Record<accountId, Interior>`
  - `hasInterior(accountId): boolean`
  - `getInterior(accountId): Interior | null`
  - `SAINTS: Record<saintId, Saint>`, `saintsForAccount(accountId): Saint[]`
  - Types (JSDoc):
    - `Source = { label: string, url: string }`
    - `DeskLane = { id, actor, actorNote?, tool, gets, sources: Source[] }`
    - `Entry = { id, metaphor: 'front-door'|'phone-line'|'mail-slot'|'back-room'|'vents'|'number', actor, actorNote?, how, rule: RuleId, fix?, fixMission?: missionId, narrows?, sources: Source[] }`
    - `RuleId = 'password-unique'|'sim-swap'|'phishing'|'devices'|'reglock'|'beyond'`
    - `Interior = { accountId, company, deskIntro, desk: DeskLane[], entries: Entry[], saints: saintId[] }`
    - `Saint = { id, name, title, years, tribute, story, sources: Source[], accounts: accountId[] }`
- `lanes.js` exports reusable lane builders for US platforms: `localPolice(company)`, `fbi(company)`, `nsa702(company, { prismNamed })`, `iceHsi(company)`, `ukCloudAct(company)`. Each returns a `DeskLane` with sources. The Gmail interior uses all five. Entries for Gmail are front-door/password-unique, phone-line/sim-swap, mail-slot/phishing, back-room/devices, and vents/beyond (vents actors: CIA (Vault 7), Chinese state hackers (Aurora, 2010), and a spyware vendor's government customer (NSO Group's Pegasus), each with sources).

- [ ] **Step 1: Write the failing test** `tests/interiors-content.test.js`:

```js
it('every interior has a desk, entries, and only known rules', ...)     // RuleId set above
it('every lane, entry and saint has at least one source', ...)
it('every source url is in verified-urls.json', ...)                    // read fixture like recon-phase3-urls.test.js
it('no interior or saint copy says "they"', ...)                        // /\bthey\b/i over every string field, deep
it('no actor is an unnamed group', ...)                                 // actor not matching /^(the )?(government|hackers?|someone|attackers?|criminals?)$/i
it('fixMission ids exist in MISSIONS and belong to the same account', ...)
it('saint ids referenced by interiors exist, and Swartz is spelled Swartz', ...) // no /Schwartz/ anywhere
it('gmail interior has the five named desk lanes and five entries', () => {
  expect(getInterior('gmail').desk.map((l) => l.id)).toEqual(['local-police', 'fbi', 'nsa-702', 'ice-hsi', 'uk-cloud-act']);
  expect(getInterior('gmail').entries.map((e) => e.metaphor)).toEqual(['front-door', 'phone-line', 'mail-slot', 'back-room', 'vents']);
});
```

- [ ] **Step 2: Run** `npx vitest run tests/interiors-content.test.js`. Expected: FAIL (module not found).

- [ ] **Step 3: Write the content.** Use the facts in the spec's "Content model" section, verify each against a primary document or independent journalism, and put the link in `sources`. Desk `gets` lines (Gmail):
  - local police: subpoena → name, phone, sign-in IPs; 2703(d) court order → who/when; warrant → content; emergency request → no judge, the provider decides
  - FBI: the above plus National Security Letters (subscriber records, no judge, usually gagged), and searches of 702-collected data
  - NSA: 702 directive, PRISM (Google named in the 2013 documents). Aimed at non-US persons abroad; Americans' messages with them are collected too. Five Eyes sharing (GCHQ, CSE, ASD, GCSB). Word it "has let" for the 2026 status.
  - ICE/HSI: administrative subpoena signed by an agency official, no judge
  - UK: direct orders under the US–UK CLOUD Act agreement

  `saints.js` holds all nine saints from the spec. Each has `tribute` (one Scout line), `story` (2–4 sentences) and sources. `accounts`: Snowden → the PRISM-named Master Keys accounts (gmail, google, outlook, microsoft, yahoo, icloud, apple_id, facebook); Zimmermann → protonmail, signal; every other saint `[]` (gallery only, Task 6).

- [ ] **Step 4: Live-check every new URL** (`curl -sL -o /dev/null -w "%{http_code} %{url_effective}"` with a browser UA; fall back to opening it in the browser for bot-walled sites) and add each to `tests/fixtures/verified-urls.json` `urls` with how it answered and the date.

- [ ] **Step 5: Run** `npx vitest run tests/interiors-content.test.js tests/recon-phase3-urls.test.js`. Expected: PASS.

- [ ] **Step 6: Commit and push** `feat(interiors): content model, shared desk lanes, saints, Gmail interior`.

### Task 2: The interior evaluator

**Files:**
- Create: `src/utils/interior.js`
- Modify: `src/utils/password-need.js` (export the existing `evidence` as `passwordEvidence(state, accountId) → { pw, activity, ... }`; keep `evidence` as the internal name)
- Test: `tests/interior-eval.test.js`

**Interfaces:**
- Consumes: `getInterior` (Task 1); `isMissionDoneIn`, `twoFactorMethod`, `STRONG_METHODS`, `passwordResetNeed`, `passwordEvidence`, `emailBreachRecord`, `EMAIL_ACCOUNT_IDS`, `MISSIONS`.
- Produces:
  - `freshness(iso: string|undefined, now: Date): 'fresh'|'aging'|'stale'|'unknown'`: ≤30 days fresh, ≤90 aging, >90 stale, missing or invalid → `'unknown'`
  - `recordDate(record) → string|undefined`: returns `record.rechecked ?? record.completedAt`
  - `currentTwoFactor(state, accountId) → { method: string|null, missionId: string|null, date }`: the latest-dated completed record among `<id>-fortify-2fa` and `<id>-fortify-2fa-upgrade`, via `twoFactorMethod`. `null` when none is filed or the method is unreadable.
  - `entryState(state, accountId, entry) → { state: 'sealed'|'open'|'beyond'|'not-checked', missionId: string|null, date, note?: string }`
  - `checkupRows(state, accountId) → Array<{ id: 'password'|'leak'|'two-factor'|'devices', status: 'ok'|'warn'|'crit'|'not-checked', label: string, missionId: string|null, freshness }>`. Include the leak row only for `EMAIL_ACCOUNT_IDS`.
  - `sealedCount(state, accountId) → { sealed: number, total: number }`: total = sealed + open. Beyond and not-checked are excluded.
  - `isFullySealed(state, accountId) → boolean`: `total > 0 && sealed === total`

Rules (`entry.rule`):
- `password-unique`: **sealed** if `<id>-fortify-password` is done with `action` ∈ {`reset-password`, `already-strong`}, or `passwordEvidence(...).pw === 'pw-clean'`. **open** if `passwordResetNeed === 'needed'` and not sealed. Otherwise **not-checked**.
- `sim-swap`: **sealed** if `currentTwoFactor.method` ∈ `STRONG_METHODS`, with `note: 'Sealed once text-message backup is off. Check under recovery options.'`. **open** if the method is `sms`, `email` or `none`. **not-checked** if `null`.
- `phishing`: **sealed** only if the method is `passkey`. **open** for any other filed method. **not-checked** if `null`.
- `devices`: uses the login/devices mission (`<id>-recon-login`, or `signal-recon-devices`). `finding === 'no-breaches'` → **sealed**. `1-2-breaches`/`3plus-breaches` → **open**. Not filed → **not-checked**.
- `reglock`: `signal-fortify-reglock` `action` ∈ {`enabled-2fa`, `already-enabled`} → **sealed**. `later` → **open**. Not filed → **not-checked**.
- `beyond`: always **beyond**.

- [ ] **Step 1: Write the failing tests:**

```js
it('freshness: 10d fresh, 45d aging, 120d stale, missing/invalid unknown', ...)
it('recordDate prefers rechecked over completedAt', ...)
it('a fresh save: every controllable gmail entry is not-checked, count 0/0, not fully sealed', ...)
it('sms 2FA: phone line and mail slot open; authenticator: phone line sealed with the note, mail slot open; passkey: both sealed', ...)
it('2FA upgrade filed later wins over the original 2FA filing', ...)
it('legacy 2FA record with no method → not-checked, never open', ...)
it('unique password via already-strong seals the front door; pm flag without reset opens it', ...)
it('facebook replaced recon record (facebook-recon-breach only) still reads, no throw', ...)
it('a completed record without completedAt has freshness unknown', ...)
it('leak row only for email-address accounts (gmail yes, facebook no)', ...)
it('isFullySealed: all checked controllable entries sealed, ignoring not-checked and beyond', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/interior-eval.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/utils/interior.js` with the signatures and rules above, and the `passwordEvidence` export.
- [ ] **Step 4: Run** `npx vitest run tests/interior-eval.test.js tests/password-need.test.js`. Expected: PASS.
- [ ] **Step 5: Commit and push** `feat(interiors): evaluator for checkup, seals and freshness`.

### Task 3: Re-check mode ("sweep")

**Files:**
- Modify: `src/router.js` (route `^#\/mission\/([^/]+)\/recheck$` → screen `recheck`, params `{ id }`), `src/screens/debrief.js` (`renderDebrief(state, missionId, { recheck })`), `src/utils/debrief.js` (add `applyRecheck`), `src/app.js` (screen entry + `submit-recheck` action)
- Test: `tests/recheck.test.js`, `tests/router.test.js` (add a case)

**Interfaces:**
- Produces:
  - `applyRecheck(state, mission, answers, now = new Date().toISOString()) → state | null`: `null` unless the stored record's `status === 'completed'` and `debriefRecord(mission, answers)` is valid. Otherwise it returns state where the record keeps `status` and `completedAt`, has the new answer keys merged in, and has `rechecked: now`. Write the record directly; never call `updateMission`.
  - Route `#/mission/<id>/recheck` (screen `recheck`).
  - `renderDebrief(..., { recheck: true })`: questions shown editable and prefilled with the stored answers, heading "RE-CHECK", button `data-action="submit-recheck"`. On submit, `app.js` sets state and navigates to `#/building/<accountId>` (or the district if the account has no interior). It sends no event.

- [ ] **Step 1: Write the failing tests:**

```js
it('applyRecheck keeps status and completedAt, merges answers, sets rechecked', ...)
it('applyRecheck returns null for skipped, not-needed, and unfiled missions', ...)
it('applyRecheck never imports or calls track (spy on analytics.track: zero calls through the app action)', ...)
it('the recheck route parses', () => expect(parseRoute('#/mission/gmail-recon-login/recheck')).toEqual({ screen: 'recheck', params: { id: 'gmail-recon-login' } }))
it('recheck screen for a non-completed mission renders the normal briefing link, not a form', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/recheck.test.js tests/router.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the route, `applyRecheck`, the recheck render mode, and the `submit-recheck` action in `app.js`. The action uses the existing `readAnswers(app, mission)`.
- [ ] **Step 4: Run** `npx vitest run tests/recheck.test.js tests/router.test.js tests/restore.test.js`. Expected: PASS.
- [ ] **Step 5: Commit and push** `feat(interiors): re-check mode refreshes dates without reopening or tracking`.

### Task 4: The building screen, its route, privacy-safe pageview, tappable buildings

**Files:**
- Create: `src/screens/building.js`
- Modify: `src/router.js` (`^#\/building\/([^/]+)$` → screen `building`, `{ id }`), `src/app.js` (screen entry; pageview and error context sanitizing), `src/components/building.js` (optional `href` and `glow` params), `src/screens/district.js` (pass `href` when `hasInterior(id) && state.accounts[id]?.enabled`), `src/style.css` (interior styles)
- Create: `src/utils/pageview-url.js`
- Test: `tests/building-screen.test.js`, `tests/pageview.test.js` (add cases)

**Interfaces:**
- Consumes: Task 1 content, Task 2 evaluator.
- Produces:
  - `renderBuildingInterior(state, accountId, { now = new Date() } = {}) → string`
  - `pageviewUrl(route, href) → string`: for `route.screen === 'building'`, returns `href` with its hash replaced by `#/building`. Everything else is unchanged. `app.js` calls `trackPageview(pageviewUrl(route, location.href), route.screen)` and, for the building screen, `captureError(error, { screen: 'building' })` with no params.
  - `renderBuilding(accountId, buildingState, size = 64, { href, glow = 0 } = {})`. With `href`, the building is wrapped in `<a class="building-link" href=...>` (min 44px tap area). `glow` 0..1 scales the drop-shadow alpha.

Screen layout, top to bottom, matching the spec's "The screen":
- HUD, account name, district, and the meter `ENTRIES SEALED n/m · LAST SWEEP <age>`. With `total === 0`, it shows `NO ENTRIES CHECKED YET`.
- Four `<details>` floors, each `open` by default:
  - Roof · Signal check: `checkupRows`, 4-bar antenna. Bars: ok 4, warn 2, crit 1. Opacity by freshness: fresh 1, aging .6, stale .35, unknown .35 with the text "date unknown". Each row has a SWEEP link to `#/mission/<missionId>/recheck`, or START to its briefing when not checked.
  - Records desk · `<company>`'s: `deskIntro`, then one slip per lane with its stamp `tool`, actor, `gets`, and source links.
  - Ground floor · Entries: icon by state (sealed 🔒, open ◇, beyond ◌, not-checked ?), actor, how, and `fix`. Open entries with `fixMission` show SEAL IT → `#/mission/<fixMission>/briefing`. `note` shows under sealed entries.
  - Alcove · Saint `<name>` (only if `saints.length`): tribute, candle (Task 6) and sources.
- An unknown id, an id with no interior, or a disabled account renders "No floor plan for this building yet" with a back link to its district (or the city).

- [ ] **Step 1: Write the failing tests:**

```js
it('renders four floors for gmail with the five desk actors named', ...)
it('meter reads NO ENTRIES CHECKED YET on a fresh save and ENTRIES SEALED 1/3 after sms 2FA + unique password (front door sealed; phone line, mail slot open; back room not-checked)', ...)
it('open entry links SEAL IT to its fixMission briefing; not-checked shows START', ...)
it('a stale filing shows date unknown / dim bars, never fresh', ...)
it('#/building/netflix, #/building/nope, and disabled gmail render the calm no-floor-plan page', ...)
it('no rendered interior contains white-space: nowrap or a fixed width over 360px', ...)
it('pageviewUrl strips the account from building routes only', () => {
  expect(pageviewUrl({ screen: 'building' }, 'https://x/reclaim-city/#/building/gmail')).toBe('https://x/reclaim-city/#/building');
  expect(pageviewUrl({ screen: 'district' }, 'https://x/#/district/vault')).toBe('https://x/#/district/vault');
})
it('district strip links enabled buildings with interiors, and only those', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/building-screen.test.js tests/pageview.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Escape all interpolated text with the existing `esc` helper (as `district.js` does). Source links use `target="_blank" rel="noopener"`.
- [ ] **Step 4: Run** the full suite, `npx vitest run`. Expected: everything passes except the known pre-existing `P6 phone width` failure, which also fails on `main`. Don't add a new failure to it. If its scan covers the new screen, the new screen must pass it.
- [ ] **Step 5: Commit and push** `feat(interiors): building screen, route, tappable buildings, private pageview`.

### Task 5: Sealing moments, glow, Scout lines, devices

**Files:**
- Modify: `src/screens/building.js`, `src/app.js` (actions `add-device`, `remove-device`, `toggle-floor`), `src/data/dialogue.js` (export `INTERIOR_LINES`), `src/screens/district.js` (pass `glow = sealed/total` or 0), `src/style.css` (seal animation, honoring `prefers-reduced-motion`)
- Create: `src/utils/interior-state.js`
- Test: `tests/interior-state.test.js`, `tests/building-screen.test.js` (add cases)

**Interfaces:**
- Produces (pure, in `interior-state.js`; every function returns new state):
  - `addDevice(state, accountId, label)`: trim; collapse whitespace; cut to 40 characters; ignore empty labels; max 12 per account; ignore exact duplicates
  - `removeDevice(state, accountId, index)`
  - `newlySealed(state, accountId, now) → entryId[]`: entries sealed now but not in `state.interior[accountId].sealedSeen`
  - `markSealedSeen(state, accountId, entryIds)`
  - `setFloorOpen(state, accountId, floorId, open)`
  - `INTERIOR_LINES = { firstVisit: string[], newSeal: string[], fullySealed: string[] }` in `dialogue.js`. Scout's voice; no "they"; may use `{name}` for the account name.
- Behavior:
  - On render, `newlySealed` entries get class `entry--sealing` (a one-time lock animation). `app.js` then calls `markSealedSeen` after rendering.
  - Scout's line priority: fullySealed (first time only, tracked as `interior[id].fullySealedSeen`) > newSeal > firstVisit (first time only).
  - The devices row in the roof lists `state.devices[id]`, with an inline input + ADD and a × per device. Shows `not listed` when empty.
  - Floors persist open/closed through `toggle-floor` (the `<details>` toggle event writes `setFloorOpen`).

- [ ] **Step 1: Write the failing tests:**

```js
it('addDevice trims, caps 40 chars, caps 12, skips empty and duplicates', ...)
it('a device label with markup renders escaped', () => expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;'))
it('newlySealed reports an entry once; after markSealedSeen it is empty', ...)
it('Scout shows fullySealed once, then newSeal on a later seal, else nothing on repeat visits', ...)
it('no INTERIOR_LINES string says "they"', ...)
it('district glow is sealed/total and 0 with nothing checked; districtLights output unchanged', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/interior-state.test.js tests/building-screen.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS, apart from the known P6 failure.
- [ ] **Step 5: Commit and push** `feat(interiors): seal animation, glow, Scout lines, device list`.

### Task 6: Saints gallery and candles

**Files:**
- Create: `src/screens/saints.js`
- Modify: `src/router.js` (`^#\/saints$` → `saints`), `src/app.js` (screen + action `light-candle`), `src/screens/building.js` (alcove candle + "All saints →" link), `src/utils/interior-state.js` (`lightCandle(state, saintId)` → `state.candles[saintId] = true`)
- Test: `tests/saints.test.js`

**Interfaces:**
- Consumes: `SAINTS` (Task 1).
- Produces: `renderSaints(state) → string`, which lists all nine saints in the order the spec gives, each with title, years, story, sources, and their candle (lit or unlit). `lightCandle` is local-only, never tracked, and idempotent.

- [ ] **Step 1: Write the failing tests:**

```js
it('gallery lists all nine saints in spec order, each with sources', ...)
it('lightCandle is idempotent and sends no event', ...)
it('gmail alcove shows Saint Edward Snowden; netflix has no alcove', ...)
it('no saint copy contains "Schwartz" or "they"', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/saints.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run tests/saints.test.js`. Expected: PASS.
- [ ] **Step 5: Commit and push** `feat(interiors): saints gallery and candles`.

### Task 7: The other Master Keys interiors and Signal

**Files:**
- Modify: `src/data/interiors/master-keys.js`, `tests/fixtures/verified-urls.json`
- Create: `src/data/interiors/square.js` (Signal only)
- Test: `tests/interiors-content.test.js` (extend)

**Interfaces:**
- Consumes: the Task 1 lane builders.
- Produces interiors for outlook, icloud, yahoo, protonmail, apple_id, google, microsoft, facebook and signal. Required differences, each sourced:
  - **protonmail:** a Swiss company. US agencies go through Swiss authorities (mutual legal assistance), so it gets no FBI/NSA/ICE/UK lanes as direct desk slips. It gets a Swiss-authority lane: Swiss court orders have compelled IP logging (the 2021 French activist case). Mailbox content is end-to-end encrypted at rest, so the desk can't hand it over.
  - **icloud / apple_id:** note what Advanced Data Protection moves off the desk, and that iCloud Mail isn't covered.
  - **facebook:** company Meta; PRISM-named. No leak row (already handled by Task 2).
  - **signal:** the desk is a single "sticky note" lane, `actor: 'Any agency, any legal process'`, `gets`: account creation date and last connection date, sourced to Signal's published subpoena responses. Its `deskIntro` explains the messages are on your devices, not Signal's servers. Entries: number/reglock (SIM-swap crew re-registering your number), back-room/devices (`signal-recon-devices`), vents/beyond (spyware), and an unlocked-phone entry with rule `beyond` and `narrows: 'Disappearing messages limit what is there.'`.
- The screen renders a desk with one lane as the sticky-note style (class `desk--note`).

- [ ] **Step 1: Write the failing tests:**

```js
it('all nine Master Keys accounts and signal have interiors', ...)
it('protonmail desk has no FBI/NSA/ICE/UK lanes and has a Swiss lane', ...)
it('signal desk is a single lane and renders as a note', ...)
```

- [ ] **Step 2: Run** `npx vitest run tests/interiors-content.test.js`. Expected: FAIL.
- [ ] **Step 3: Write the content and live-check every URL** into the fixture, as in Task 1 Step 4.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS, apart from the known P6 failure.
- [ ] **Step 5: Commit and push** `feat(interiors): Master Keys and Signal interiors`.

### Task 8: Content review, browser check, version, ship

**Files:**
- Modify: `package.json`, `package-lock.json` (5.4.0), content files as review requires

- [ ] **Step 1: Adversarial fact review.** Dispatch a fresh reviewer subagent (not Haiku). It checks every desk lane, entry, rule note, saint tribute and story against its own `sources` for over-claims, outdated law (702's 2026 status), wrong actors, unkind or sensational wording about the saints, and any omni-"they." Fix what it confirms.
- [ ] **Step 2: Browser check at 390×844** with a seeded save (sms 2FA on gmail, unique password, a login check filed):
  - the district strip taps through to the interior
  - every floor opens and closes
  - SWEEP → re-check → back to the interior, with the bars bright
  - adding a passkey upgrade plays the seal animation once
  - the Signal note desk renders
  - `#/saints` works and candles light
  - no horizontal scroll
  - no console errors besides localhost analytics CORS
- [ ] **Step 3: Bump the version** with `npm version minor --no-git-tag-version` (5.4.0). Run `npx vitest run`. Expected: PASS, apart from the known P6 failure.
- [ ] **Step 4: Commit, push, open a PR** with sources and a test plan. Merge after the full suite. Deploy per `DEPLOY.md` (rsync `src/` → `games:/opt/play-portal/reclaim-city/`, rebuild play-portal). Verify `https://play.multiversestudios.xyz/reclaim-city/` returns 200 and `#/building/gmail` renders live.
