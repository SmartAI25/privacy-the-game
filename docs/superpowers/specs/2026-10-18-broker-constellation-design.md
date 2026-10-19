# The Broker Constellation — design

A map of the whole data broker industry inside The Reclamation, built on an open, sourced dataset of who buys and sells consumer data.

## Why

The Reclamation already sends players through about 50 broker opt-outs: credit freezes, people-search, enterprise aggregators, ad networks and location brokers. Scout tells them the shape of the industry in words: *"public records flow into brokers, brokers sell to aggregators, aggregators sell to banks, insurers, landlords, and law enforcement. You have to cut the chain at every level."* Nobody ever *sees* that shape. The missions are grouped by how you file (web form, removal link, privacy portal), not by who feeds whom, and there are 500+ registered brokers in California alone.

Liz wants two feelings from this:

1. **"I understand the size and shape of the players."** A few giants, a huge crowd, and how they connect.
2. **"I covered the field."** I filed opt-outs that reach the companies that actually hold my data.

## Goals

- An **open dataset** of data brokers and the documented links between them, with a source on every claim. It's published in this (public) repo for journalists, researchers and privacy folks, not only for the game.
- A **constellation map** screen in The Reclamation showing the whole crowd. It lights up from the player's existing mission progress and shows how much of the field they've covered.
- A **Big Check**: a long-tail checklist of every remaining registered broker, for completionists.

## Non-goals

- Filing opt-outs for the player (DeleteMe-style). Players file themselves; the game shows where and keeps track.
- New missions. Phase 2 may *re-point* existing mission steps at broker records, but the main path stays the existing Reclamation missions.
- Changing the collective score. `brokerOptOuts` stays mission-level, exactly as now.
- Changing district progress or city lights. The new debrief checklist feeds only the map.

## Anti-goals (failure even if it "works")

- **Drawing a link we can't source.** A wrong "X sells to Y" edge about a real company is a factual error with legal exposure. No edge without a document.
- **Over-claiming coverage.** Lighting stars a sweep doesn't actually reach (DROP for a non-Californian, NAI for a non-member) breaks "I covered the field" — it's a lie told to the player.
- **Filling gaps with plausible defaults.** An unknown size is "unknown", not an estimate dressed as data.
- **Leaking per-broker progress.** What a player ticked is about *them*. It never reaches analytics.
- **A map that's only pretty.** If a player can't answer "what's left that matters?" by looking at it, it's failed.

## Constraints

- Reclaim City has **no points or currency**. Progress shows up as light (see `src/utils/lights.js`, `components/city-lights.js`). The map follows that.
- The v5.0 recon rules apply: every URL shown to a player is live-checked and lives in `tests/fixtures/verified-urls.json`. Claims we can't verify are worded generally or left out. `dialogue.js` is in scope of any content sweep.
- Old saves never lose progress; migrations only clean values.
- Nothing per-broker goes through `track()`. Map state lives in the saved game in `localStorage` (`reclaim-city-state`), like the password-manager counts.
- It must work on a phone: 16px gutters, no horizontal scroll, readable at 375px.
- No runtime dependency added for layout (see Phase 2).

---

## Phase 1 — The broker dataset

### Where

`research/data-brokers/` in this repo:

```
research/data-brokers/
  README.md            what this is, methods, evidence tiers, how to cite, license, asOf
  LICENSE              CC BY 4.0 (data) — my call
  brokers/<slug>.json  one file per broker
  links.json           every edge, each with sources
  sources/             registry snapshots (CSV as downloaded, dated) + notes
  build/               scripts that turn sources into brokers/ and validate the whole set
```

### Broker record

```json
{
  "id": "liveramp",
  "name": "LiveRamp",
  "aliases": ["Acxiom Digital (former)"],
  "parent": "liveramp-holdings",
  "kind": ["identity-resolution", "data-marketplace"],
  "registries": { "CA": "2024", "VT": "2025", "TX": null, "OR": "2025" },
  "sells": ["identity graph", "audience segments"],
  "optOut": { "method": "web-form", "url": "https://...", "verifiedAt": "2026-10-..", "notes": "" },
  "size": { "signals": [{ "kind": "sec-revenue", "value": "...", "source": "s12" }], "known": true },
  "missions": ["ad_trackers-reclaim-individual"],
  "sources": [{ "id": "s12", "url": "...", "archived": "https://web.archive.org/...", "kind": "sec-10k", "accessed": "2026-10-.." }]
}
```

- `optOut.method` is one of `web-form | email | mail | portal | sweep-only | none`. `none` is a real, displayed value (the magenta ✕), not a missing one.
- If size is unknown, set `size.known: false` with no signals. Don't estimate.
- `kind` comes from a small fixed vocabulary seeded from the registry categories: people-search, marketing, risk/identity, location, financial, health, automotive, identity-resolution, data-marketplace.

### Link record (`links.json`)

```json
{ "from": "acxiom", "to": "liveramp", "type": "supplies", "tier": "A",
  "claim": "one sentence, as narrow as the source supports",
  "sources": ["s40"] }
```

- `type` is one of `owns | supplies | buys | matches-identity`. "Gov't buyers" (ICE, DHS, local police) are nodes too, with `kind: buyer`.
- **Evidence tiers.**
  - **A:** a regulator, court, SEC or procurement document.
  - **B:** the company's own statement (privacy policy, registry filing, press release).
  - **C:** reputable journalism.
- A link needs at least one source. A and B links are drawn solid, C links dashed, and anything weaker isn't recorded.
- `claim` is written as narrowly as the source allows. Prefer "Kochava sold precise location data (FTC v. Kochava, 2022 complaint)" over "Kochava sells your location."

### Sources, in order of value

1. **State broker registries** (CA CPPA, Vermont, Texas, Oregon). These give the crowd: names, categories, contact and opt-out info. Snapshot the CSVs into `sources/` with dates.
2. **FTC and CFPB enforcement** (complaints, orders, settlements). These are the hardest evidence of who sold what to whom: Kochava, X-Mode/Outlogic, InMarket, Gravy/Venntel, Mobilewalla, and the GM/OnStar → Verisk/LexisNexis driving-data case.
3. **SEC filings** (10-K customer/supplier/acquisition disclosures) for public companies and their parents (Experian, Equifax, TransUnion, RELX, Thomson Reuters, LiveRamp, Omnicom/Acxiom, Publicis/Epsilon, Verisk, CoreLogic and others).
4. **Federal procurement** (USAspending, SAM.gov) for government buyers of broker data.
5. **Brokers' own privacy policies**, which list their "sources" and "partners." This is tier B, and the main source for the long tail.
6. **Journalism**, tier C, only where it adds a link nothing above supports.

### How the research runs

- Parallel research agents each take one source family, and each writes records into a staging area. I merge, dedupe aliases and parent companies, and fact-check the merge. Any edge without a resolvable source is dropped, not softened.
- A `build/validate` script fails if:
  - a link points to an unknown id
  - a link has no source
  - a source has no URL or archived copy
  - an opt-out URL hasn't been live-checked
  - an id is duplicated
- InfraNodus is optional. Once the source corpus is collected, running it through InfraNodus can surface clusters or under-researched gaps. It informs the research; it isn't a source.
- The README carries a dataset `asOf` date. Registries re-publish yearly, and the dataset is refreshed against them.

### URL checking at this scale

Several hundred opt-out URLs are too many for `tests/fixtures/verified-urls.json`. The dataset gets its own checker (`build/check-urls`), which records `verifiedAt` on each record. The game test asserts that every URL shown has a `verifiedAt` from the dataset's last check. *(My call.)*

### Phase 2 can start before Phase 1 finishes

The registries give the whole crowd quickly, as names, categories and opt-out links. Researching links is the slow part. Phase 2 starts once:
- every registry broker has a record
- the hubs' links are researched

The rest of the links fill in over later dataset releases, each with a new `asOf`. *(My call.)*

### What ships in the first release (Liz, 2026-10-18)

Only **tier A links** (regulator, court, SEC or procurement documents) are published, in the dataset and on the map. Tier B and C links are researched and kept in `links.json` with `"published": false`. They ship only after a later review pass that Liz decides on. Broker records themselves (names, registry data, opt-out routes) ship in full.

### Done when

Every broker on the four registries has a record. Every hub (the companies that the existing missions name, plus any broker the research shows feeding 5+ others) has its links researched against all five source families. Validation passes, and the README explains the methods well enough that an outside journalist can cite it.

---

## Phase 2 — The constellation in The Reclamation

### Where it lives

A new screen reached from The Reclamation district (`#/reclamation/map` or similar; the builder fits it to `router.js`). The district screen gets an entry point: "See the whole field."

### What it shows

- **Every broker in the dataset is a star.** Star size comes from *reach*: how many brokers it feeds directly or downstream, plus size signals where they're known. A broker of unknown size is drawn at the base size.
- **Hubs** are big and labelled. **Downstream brokers** cluster as nebula around the hub they're documented to buy from. **Unlinked brokers** drift at the outer edge, which honestly shows "we found no documented links."
- **Links:** tier A/B solid, tier C dashed, opacity by evidence count.
- **Buyers** (insurers, landlords, employers, police/ICE, advertisers) sit on the rim as a distinct shape and colour. They're who the data flows to.
- **Colours** follow the game's palette:
  - lime: you filed
  - amber: re-check due
  - magenta ✕: no opt-out exists
  - dim: not yet
- **Header line:** `FIELD COVERED: 31% · HUBS LIT 3/7`. Coverage is **reach-weighted** and labelled as an estimate ("estimated share of the field your opt-outs reach").

The approved mockup is option A, "Constellation", in `assets/2026-10-18-broker-constellation-mockups.html`. It's a fragment written for the brainstorm viewer, so its styles are minimal. Its look is what the builder aims at, not exact positions.

**Hubs** are the top 12 brokers by reach (the header reads `HUBS LIT n/12`). They get permanent labels; other stars are labelled on hover or tap. Being named in a mission doesn't make a broker a hub. *(My call.)*

### Layout

Positions are computed **at build time** (a force layout run in a build script over `links.json`) and shipped as fixed coordinates. Phones don't run a simulation, and the map looks the same for everyone. Rendering approach (SVG vs canvas) is the builder's call. 500+ nodes on a mid-range phone is the test.

### How stars light up

All lighting is computed from state the game already has. It's a pure function, like `lights.js`.

| Source | Lights |
|---|---|
| A broker mission's "which did you file?" checklist | exactly the brokers ticked there |
| A legacy completed mission answered "all submitted" | every broker that mission's steps cover (`missions` field on broker records) |
| A legacy "some submitted" answer | nothing, until the player fills in the new checklist |
| **Sweeps** (DROP, NAI/DAA bulk, LiveRamp/Acxiom-style hub opt-outs) | only the brokers the sweep actually reaches: DROP lights CA-registered brokers **only if the player says they're a California resident**; NAI/DAA light their published member lists |
| A Big Check tick | that one broker |

- **Residency:** the map asks once, "Do you live in California?" (Yes / No / Rather not say). The answer is stored in the saved game and changeable from the map. "No" or "Rather not say" means DROP lights nothing, and the DROP card explains why.
- **Re-check:** people-search brokers turn amber 90 days after they were lit, matching Scout's existing "check back every 3–6 months." Stars lit by DROP don't go amber, because the law makes brokers keep re-checking DROP themselves. *(My call.)* How a player relights an amber star is covered under "Recording what was filed" below.
- **Credit freezes don't light anything.** A freeze stops new credit but doesn't stop a bureau selling data, so lighting Equifax, Experian or TransUnion from a freeze would over-claim. Freezes show as a separate "frozen" ring on the bureau stars. The bureaus' marketing arms are their own stars, lit only by their own opt-outs. *(My call.)*
- **NAI/DAA don't light stars.** They set opt-out cookies for one browser on one device and delete nothing. Their member ad networks are recorded as stars (`kind: ad-network`), and the bulk tools give those stars a faint "this browser only" halo, never lime. *(My call.)*

### Recording what was filed (Liz, 2026-10-18)

Today a debrief records only all / some / skip, and a completed mission can't be re-filed. Liz approved changing both for broker missions:

- **"Which of these did you file?"** Broker missions (`people_search-*`, `enterprise_data-*`, `ad_trackers-*`, `location_brokers-*`, and the DROP steps in `people_search-reclaim-stragglers` and `location_brokers-reclaim-legal`) get a multi-select in the debrief, one line per broker or sweep. DROP is its own line. The answers are stored per mission in the saved game and drive the lighting table. They never go into `missionEventData` or `track()`.
- **"File again."** Completed broker missions get a way back in from the district screen and the debrief, so amber re-check stars can be relit. Re-filing updates the per-broker dates and keeps the mission completed.
- **Old saves.** A mission completed before this change keeps its status. "All submitted" lights everything the mission covers. "Some submitted" lights nothing until the player answers the new checklist; the map nudges them to ("Tell Scout which ones you filed"). Nothing already earned (district %, city lights, collective counts) changes.
- How `debriefRecord` treats "some" stays the same for district progress.

### Clicking a star

A card shows:
- name and parent company
- what it sells and who it's documented to sell to and buy from, each with a source link
- how to opt out (or "No opt-out exists," and what to do instead, e.g. a CPPA complaint)
- **the mission that covers it**, which opens the normal briefing with Scout

Long-tail brokers with no mission show a Big Check tick box instead.

### The Big Check

- A checklist of every broker not covered by a mission or sweep the player has done, grouped by `kind`, with the live-checked opt-out link and a tick box.
- It's framed as optional, completionist territory. It never blocks district completion, city lights or anything else, and it never counts toward the collective score.
- Ticks live in the saved game only.

### Scout

A few lines for the map, written by the same rules as `dialogue.js`:
- the first time the map opens
- first hub lit
- a big sweep lighting a cluster
- the first magenta ✕ ("Some of them don't let you leave.")
- opening the Big Check

These go through the usual content sweep.

### Privacy

- `app.js` sends `location.href`, hash included, as the pageview on every screen. So **broker ids, the selected star, residency and ticks never go in the URL.** The map's route is one fixed hash, and star selection is in-memory state.
- No new `track()` calls carry broker ids, residency, or Big Check ticks. If the builder wants a map-opened event for the funnel, it carries no payload beyond the screen name, and it's added to the analytics docs.
- The dataset ships with the game as a static asset. Looking up a star makes no network request.

### Tests

- Pure lighting function: each row of the lighting table, residency yes/no/unset, partial debriefs, the 90-day re-check, old saves without the new fields.
- Coverage maths: reach-weighting is deterministic, and the result is 0 with no progress and 100 only when every reachable star is lit.
- Every opt-out URL shown on a card or in the Big Check is in `verified-urls.json`.
- Phone-width render check in a real browser (Playwright), with screenshots, before the release goes out.

---

## Left to the builder

- Rendering tech (SVG vs canvas), animation, and how the lighting moment looks. It should feel like the city lights, "really spectacular with more motion."
- Exact route name and entry-point placement in the district screen.
- The reach formula's exact weights, as long as it's deterministic, documented in the dataset README, and labelled an estimate in-game.
- Whether to add `missions` to existing mission steps as broker ids, or keep the mapping only on broker records.
- Dataset file format details beyond the fields above.

## Calls I made (not discussed with Liz)

- CC BY 4.0 for the dataset.
- Evidence tiers A/B/C; tier C dashed; no weaker links recorded. (First release ships tier A only, per Liz.)
- Residency asked once, with "Rather not say" treated as not reached.
- 90-day re-check for people-search brokers.
- Layout precomputed at build time.
- Dataset lives in this public repo under `research/data-brokers/`.
- Big Check ticks and residency stay local-only; the collective score is unchanged.
- Hubs = top 12 by reach.
- Credit freezes show as a "frozen" ring and don't light bureau stars.
- NAI/DAA give a "this browser only" halo, never lime.
- DROP-lit stars don't go amber.
- The dataset has its own URL checker instead of `verified-urls.json`.
- Phase 2 starts once registry records and hub links are done.
