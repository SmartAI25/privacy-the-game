# Building Interiors — design

Tap a building and see inside it: a cutaway of its floors that shows the account's checkup, who could reach it and how, and which of those ways in the player has sealed.

Mockups from the brainstorm: `.superpowers/brainstorm/74250-1792519248/content/` (`agencies-v4.html` for the content model, `building-interior-v5.html` for the screen). They're local-only, so the essentials are restated below.

## Why

Reclaim City has grown from "secure your accounts" into "know where your data lives and who can get to it." Players finish missions but never see the result as one picture. Liz wants a **personal security command center**: a map the player controls, a **threat model they can reassure themselves with**. After securing Gmail they should feel *I have a handle on this*, not *I'm being watched*.

Two things make it reassuring rather than frightening:

1. **Every threat has a name.** Never an omni-"they," and never "the government" as one actor. The NSA is not the FBI is not the CIA. Each one has its own legal tools and limits, and naming them makes the threat bounded and knowable. (Liz: an omni-they is triggering for paranoid players.)
2. **Every claim has a source.** This is all public record: Snowden's disclosures, the Guardian's reporting, court opinions, company transparency reports. Linking everything shows the scope and points people to the independent journalism and documentation behind it.

The game also honors the people who made this visible. Scout names them as **saints**: Saint Aaron Swartz, Saint Edward Snowden, and others.

## Goals

- **Building interior screen.** Tap any building in a district (today buildings are display-only) to open a cutaway of its floors. It's one column, phone-first.
- **Checkup ("Roof").** The account's real security state from what the player already filed, plus how long ago it was checked.
- **Records desk ("Lobby").** What each named agency can make *the company* hand over, by legal tool. It's fixed and honest: the player can't change it.
- **Entries ("Ground floor").** Each way of breaking in, by named actor. Each one is sealed, open (with the fix), or outside the player's control.
- **Alcove ("Shrine").** The saint whose work made this building's map knowable, with Scout's tribute and links.
- **Sealing is the game.** Closing an entry plays a lock animation, ticks an "ENTRIES SEALED n/m" count, and feeds the building's glow.
- **Staleness without scolding.** Checkup antennas fade as the last check ages, and a re-check ("sweep") relights them.
- **Sources everywhere.** Every records-desk slip, entry and saint links to documentation or independent journalism.

## Non-goals

- New security missions. SEAL IT buttons route to existing missions. Where no mission exists for a fix, the entry shows the fix as text.
- Changing district progress, city lights tiers, the collective score or analytics.
- Interiors for non-account "buildings" (credit freeze, people-search, scam defense, car brokers, and so on) in this round. They model different things and get their own design later.
- Non-US legal regimes, beyond the US–UK CLOUD Act line and Five Eyes sharing.

## Anti-goals (failure even if it works)

- **An omni-"they."** Any copy where the actor is "they," "the government," "hackers" or "someone" without a specific identity. Each lane names one actor: *Local police department*, *FBI*, *NSA*, *ICE / HSI*, *CIA*, *Chinese state hackers (e.g. Aurora, 2010)*, *a SIM-swap crew*, *credential-stuffing bots*, *a phishing-kit operator*, *someone near you (partner, roommate, thief)*, *a spyware vendor's government customer (e.g. NSO Group's Pegasus)*.
- **Fear as the payoff.** The screen must end on what's sealed and what's knowable. Lanes outside the player's control are stated plainly and calmly, never dramatized.
- **Faked progress.** The records desk never unlocks, gets beaten or counts toward "sealed." Lanes the player can't close never count as sealed.
- **Unsourced or over-broad claims.** A wrong statement about what a real agency can get from a real company is a factual error. No claim without a source. Where sources disagree or the law is in flux (for example FISA 702's 2026 lapse versus its certifications), the copy says so or words it generally ("has let").
- **Fabricated state.** If the player never filed a 2FA mission, the checkup says *not checked*. It never shows a plausible guess.
- **Leaking personal detail.** Device lists, candle lighting and interior visits never reach `track()`.

## Constraints

- Reclaim City has **no points or currency**. Reward is light and motion (`src/utils/lights.js`, `components/city-lights.js`).
- v5.0 recon rules: every player-facing URL is live-checked and added to `tests/fixtures/verified-urls.json` (extend the test to cover interior links). Unverifiable claims are worded generally or left out. `dialogue.js` is in scope of any content sweep.
- Old saves never lose progress. New state fields are optional and migrations only add them.
- Phone-first: one column, 16px gutters, no horizontal scroll, readable at 375px, tap targets at least 44px, no hover-only affordances.
- Plain ES modules, no build step, no new runtime dependency (the repo serves `src/` statically).
- Every PR bumps the version (`package.json` + lock).

---

## The screen

**Route:** `#/building/<accountId>`. It's reached by tapping a building in a district's "DISTRICT BUILDINGS" strip (`renderBuilding` in `components/building.js`, used by `screens/district.js`). Buildings without an interior stay non-tappable. Back returns to the district.

**Header:** HUD, account name, district, and a meter line: `ENTRIES SEALED n/m · LAST SWEEP <age>`.

**Floors**, top to bottom. Each one is a collapsible section with its header always visible. My call: on first visit all floors are open; after that, remember open/closed per viewer in the saved state.

1. **Roof · Signal check.** One row per check with a 4-bar antenna:
   - *Password:* unique or reused, flagged or not. Comes from `pw_status`, the password-manager report flags, and the account's password mission.
   - *Leak:* from the breach or `service_breach` answers. Only for accounts where that check means something (see the `password-need.js` rules: HIBP only for the 8 email-address accounts).
   - *Two-factor:* the method recorded by the account's two-factor mission (`twoFactorMethod` → passkey / authenticator / sms / email / none), with that method's weak spot: SMS → SIM swap, email → whoever has the inbox, authenticator → phishing pages, passkey → none of those.
   - *Signed-in devices:* a short list the player types in (new; see State). It shows as "you listed N." If nothing is entered, it says *not listed* and offers to add devices.
   - *Staleness:* each row's bars dim with the age of the filing behind it (`completedAt` on mission records). Full at 0–30 days, dimmer to 90, dimmest after that (my call on the thresholds). A **SWEEP** button routes to that account's existing recon or login-check mission, so re-filing it refreshes the date.
   - Anything never filed shows *not checked* with that mission's START.
2. **Records desk · <Company>'s.** The label makes clear it's the company's counter, not the player's. One "paper slip" per agency, with a stamp naming the legal tool and one line on what it gets. Intro copy: the company holds this data, so the agency asks the company; nothing the player does changes this floor; it's here so they know. Each slip links to its sources. Empty or near-empty desks (Signal) are a deliberate visual punchline.
3. **Ground floor · Entries.** One entry per break-in route, each a physical metaphor with its actor:
   - front door: credential-stuffing bots
   - phone line: a SIM-swap crew
   - mail slot: a phishing-kit operator
   - back room: someone near you
   - vents: state hackers and spyware customers

   Each entry is **sealed** (lock, green), **open** (amber/magenta, with the fix and a **SEAL IT** button to the existing mission), or **beyond your control** (◌, calm grey, with what narrows it if anything: e.g. Advanced Protection). The ENTRIES SEALED count = sealed ÷ (sealed + open). Beyond-control entries are excluded.
4. **Alcove · Saint <name>.** Shown only where a saint's work bears on this building. Scout's tribute line, a candle the player can light (local only, purely ceremonial), and links to the saint's story and the reporting.

**Signal-style contrast:** an end-to-end-encrypted service's desk holds one slip ("any legal process: account creation date, last connection date"), drawn as a single sticky note.

## Sealing moments

- When a player comes back to an interior after completing the mission behind an open entry, that entry plays a one-time seal animation (lock slams, glow pulse) and the count ticks up. Track "seen sealed" per entry so it plays once.
- The building's glow on the district strip strengthens with its sealed share. This is purely visual and doesn't change `districtLights` tiers or district percent (my call: add a glow intensity alongside the existing liberated filter).
- Scout gives a short line on the screen, in his understated voice: on the first visit, on a new seal, and when the building is fully sealed. These lines go in `dialogue.js`.

## Content model

The lanes are written **per account type**, with per-account overrides, because Gmail, Signal, a bank and a phone carrier differ. The types are a builder decision, but the content must express:

- `recordsDesk[]`: `{ actor, tool, gets, sources[] }`. `actor` is a specific agency. `tool` is the legal instrument (subpoena, 2703(d) court order, search warrant, emergency disclosure request, National Security Letter, FISA 702 directive, administrative subpoena, CLOUD Act order).
- `entries[]`: `{ id, metaphor, actor, how, sealedWhen, fix, fixMission?, controllable, narrows?, sources[] }`. `sealedWhen` is evaluated from existing filings (e.g. 2FA method ∈ {passkey}). It is never assumed.
- `saint?`: `{ id, line, sources[] }`.
- `sources[]` entries: `{ label, url }`. Prefer primary documents and independent journalism (the Guardian's 2013 Snowden reporting, The Intercept, ProPublica, EFF, court opinions, company transparency reports, Citizen Lab, WikiLeaks' Vault 7 pages, Wikipedia as an entry point).

**Facts already gathered in the brainstorm** (all must be re-verified and sourced before shipping):
- Local and state police: SCA subpoena gets subscriber records. A 2703(d) court order gets non-content records (who/when). A warrant gets content. Emergency requests: no judge, and the provider decides.
- FBI: the same, plus National Security Letters (subscriber records, no judge, usually gagged). Queries of 702-collected data.
- NSA: FISA 702 directives (PRISM; Google, Apple, Microsoft, Facebook, Yahoo and others were named in the 2013 documents). Aimed at non-US persons abroad; Americans' communications with them are collected incidentally. Five Eyes sharing with GCHQ, CSE, ASD, GCSB. 702's 2026 status is unsettled (lapse reported June 2026; certifications reportedly through March 2027), so word it as "has let."
- ICE / HSI: administrative subpoenas (signed by an agency official, no judge).
- UK agencies: direct orders to US providers under the US–UK CLOUD Act agreement.
- CIA: foreign intelligence, no domestic legal process. Its hacking tools were exposed in Vault 7 (2017). It belongs under entries, not the records desk.
- Chinese state hackers: Operation Aurora (2010) targeted Gmail accounts of human rights activists.
- NSO Group's Pegasus: sold to governments. Citizen Lab-documented cases target journalists, activists and officials.
- Signal: published subpoena responses disclose only account creation and last connection dates.

## Saints

Scout names them **Saint** in his own voice. Each appears in the alcove of buildings their work bears on, and all of them are gathered somewhere players can browse (builder decides where: a lore list, the Stats screen, or similar). Each has a tribute line and links.

The list as drafted in the brainstorm (Liz replied "this is great" and didn't change it):
- **Aaron Swartz:** public access to research and court records (PACER, JSTOR); co-author of RSS; died 2013 while being prosecuted
- **Edward Snowden:** the 2013 NSA disclosures (PRISM and more)
- **Mark Klein:** AT&T Room 641A, the room that copied internet traffic for the NSA
- **Phil Zimmermann:** PGP, encryption for everyone
- **Daniel Ellsberg:** the Pentagon Papers
- **Chelsea Manning:** the Iraq and Afghanistan war logs
- **Thomas Drake** and **William Binney:** NSA whistleblowers before Snowden
- **Laura Poitras:** the journalist and filmmaker who carried the Snowden documents out to the public

Spelling: **Swartz**.

## State (saved game, local only)

Optional additions to `reclaim-city-state`; nothing goes to analytics:
- `devices[accountId]`: list of short labels the player typed ("MacBook," "iPhone 15").
- `interior[accountId]`: `{ floorsOpen, sealedSeen[], candleLit }`.

## Rollout

- **First:** the screen and engine, plus every Master Keys building (gmail, outlook, icloud, yahoo, protonmail, apple_id, google, microsoft, facebook) and Signal (from The Square) as the end-to-end-encrypted contrast.
- **Then** district by district for account districts (Vault, Square, Archives, Marketplace, Capitol, Foundry, Clinic), each a content sweep with sources.
- Non-account districts are a separate design.

## Decisions from the builder check (my calls)

- **SWEEP is a re-check mode, not a reopen.** A completed mission's debrief is read-only, `updateMission` clears `completedAt` on any non-completed status, and refiling fires `mission-completed` through `track()`. So SWEEP opens the mission's debrief in a re-check mode. It updates that mission's answers and writes `rechecked: <ISO date>` on the record. It never changes `status` or `completedAt`, and it never calls `track()`. Staleness reads `rechecked ?? completedAt`. Restore and analytics are untouched.
- **The interior's pageview doesn't name the building.** The router sends `trackPageview` with `#/building`, without the account id, and screen `building`. `captureError` gets `{ screen: 'building' }` only, never the account id or state.
- **A fourth entry state: not checked.** If the filing behind an entry's `sealedWhen` was never made, the entry shows *not checked* with that mission's START. It's left out of ENTRIES SEALED n/m, it never counts as open exposure, and it doesn't block "fully sealed." Fully sealed means every *checked* controllable entry is sealed and at least one exists.
- **The back room is sealed by a filing.** The "someone near you" entry is sealed by the account's existing login-check / devices mission answered "all mine" (`finding: no-breaches`). The self-typed device list only displays in the checkup and never seals anything.
- **Conservative seal rules.** Phone line (SIM swap): sealed by passkey or authenticator, with a standing note: "Sealed once text-message backup is off. Check under recovery options." It's never sealed by SMS or email codes. Mail slot (phishing): sealed only by passkey. Front door (credential stuffing): sealed by a unique, unflagged password. When in doubt, the rule doesn't seal.

## Content review

Liz (2026-10-20): no sign-off gate. *"I trust you to be sensitive, review it, be kind, we're on team privacy."* Each rollout step still gets a content-review pass before it ships:
- every claim checked against its source, and every link live-checked;
- seal rules checked against how the attack actually works (when in doubt, don't seal);
- saint tributes checked for kindness and accuracy.

Tributes honor the work and tell the hard parts plainly and gently: Swartz's death, Manning's imprisonment, Snowden's exile. No sensationalism, no speculation about motives or private lives, current names and pronouns (Chelsea Manning, she/her). Scout's voice is warm and understated, on team privacy.

## Left to the builder

The content data structure and file layout, account-type taxonomy, animation details, collapsible implementation, where the saints gallery lives, test design, and how SWEEP picks its mission when an account has several recon missions. These are marked as my calls above where I made one: floor open/closed memory, staleness thresholds, and glow intensity separate from light tiers.
