# The sky ladder and the government satellites: design

Builds on the Broker Constellation (`2026-10-18-broker-constellation-design.md`), live since v6.5.0. Everything in that design still holds unless this one changes it.

## Why

Liz, 2026-10-29: "the constellation is like... huge." Opening the sky shows 970 stars at once with no first step. She wants it broken into many smaller tasks, **biggest group opt-outs first**, with the effect of each one shown before the player does it. She also wants the government buyers to be "more obvious," up in the air, satellite-like.

## Goals

1. **The sky stays whole.** The player still opens onto every star. Nothing is hidden or locked (Liz: "still show the sky").
2. **A ladder of tasks beside the sky**, ordered from the opt-out that covers the most stars to the least. Each task previews its effect: selecting it highlights the stars it covers.
3. **A location quiz** decides which rungs the player sees and how they're labelled. It starts from the IP-based guess the game already has, and the player confirms or corrects it.
4. **Government satellites**: the 12 US government buyers drawn as satellites above the broker field, with lines down to the brokers they're documented buying from. Lighting those brokers cuts the lines.

## Non-goals

- New opt-out research beyond the two new rungs below. The company-by-company rungs come from the existing checklists.
- Changing district progress, city lights, the collective score or the Big Check. The ladder is a new way into what already exists.
- Any change to how existing missions, debriefs or checklists record filings.

## Anti-goals (failure even if it "works")

- **Lighting a star for an opt-out that didn't or couldn't happen.** DROP requires verified California residency through AccessCA (privacy.ca.gov/drop/how-drop-works), so DROP never lights anything for a non-Californian. This was raised with Liz and agreed: DROP shows for everyone as a preview.
- **Over-claiming GPC or the DAA.** Both are browser-only and delete nothing.
- **Using real agency seals or logos.** Some are restricted by federal law (for example the FBI's and the Secret Service's names and seals). Satellites carry initials only.
- **Leaking where the player lives.** The location answer and the IP guess never go into a URL, `track()`, an error report or the bug reporter.
- **A ladder that reads as a to-do list you must finish** before you're allowed the sky. It's a guide, not a gate.

## Constraints

- Every rule in "Privacy" of the 2026-10-18 design: one fixed hash for the map, selection in memory, no broker ids or residency in URLs or analytics.
- Every factual line a player reads (rung text, satellite cards) is sourced or worded generally. Every link is in `tests/fixtures/verified-urls.json`.
- The dataset's tier-A-only rule (Liz 10/19) applies to any new record or link.
- Phone first: the map's existing pinch/pan, ≥44px targets and bottom-sheet patterns.

---

## Part 1: the location quiz

### What it asks

The first time the sky opens, before the ladder shows, a short prompt over the sky: **"Where do you live?"**

- If `/whoami` returned a US region: "Looks like you're in **Texas**. Is that right?" with **Yes**, a state picker ("No, I'm in…") and **Outside the US**.
- If it returned a non-US country: "Looks like you're outside the US. Is that right?" with **Yes** and **No, I'm in…** (state picker).
- If it returned nothing: the state picker plus **Outside the US**.
- Always a quiet "Rather not say," which behaves like "Outside the US" for labels and like today's "Rather not say" for DROP (lights nothing).

The guess is a starting point only. Copy says why it can be wrong ("VPNs and phone networks can put you in the wrong place").

### What it stores

- One saved-game field holding the answer: a US state code, `outside-us` or `rather-not-say`. It replaces the yes/no California question: `CA` means a California resident.
- **Old saves:** an existing residency "yes" migrates to `CA`. "No" migrates to "unanswered," so the player is asked once for their state (they've said only that they're not in California). "Rather not say" carries over. Nothing already lit changes. *(My call.)*
- Changeable from the sky ("Not in Texas? Change"), replacing today's CHANGE button.
- The IP guess is used only to pre-fill the question. It is never saved. *(My call.)*

### Privacy

The state answer is as sensitive as residency is today: saved game only, never in a URL, `track()`, `missionEventData`, GlitchTip context or a bug report. If the builder adds a "quiz answered" event, it carries no payload.

---

## Part 2: the ladder

### Rungs, biggest first

| # | Rung | Stars it previews | What it does to the sky | Shown to |
|---|---|---|---|---|
| 1 | **California DROP** | the 603 CA-registered, reachable brokers | `CA`: real lights, as today. Everyone else: preview only, never lights | everyone |
| 2 | **Global Privacy Control (GPC)** (new) | no specific stars (see below) | a sky-wide "this browser only" shimmer | everyone |
| 3 | **DAA WebChoices** | its 99 published members | the existing "this browser only" halo | everyone |
| 4 | **OptOutPrescreen.com** (new) | the bureaus' prescreen records (see below) | real lights on those records | everyone |
| 5… | **Company opt-outs** | each checklist line's `brokers` | real lights, as today | everyone |

Company rungs are ordered by how many records the line covers (CLEAR 3; LexisNexis, TransUnion TLO, BeenVerified 2; then the 1-record lines), ties broken by the existing star reach, then alphabetically. A line that lights nothing (`USPhonebook`, `ThatsThem`, `PeopleFinder`, `SmartBackgroundChecks`, `SearchPeopleFree` and the NAI line) goes at the bottom with "0 stars mapped yet." It stays on the ladder because it's still a real opt-out. *(My call.)*

### How each rung reads, by location

- **DROP for `CA`:** "One request, 603 brokers. California law makes them delete you and keep checking."
- **DROP for anyone else:** "California residents can erase these 603 with one request. [Your state] doesn't offer this yet." No Go button and no tick. A "Why not me?" line says DROP checks California residency. It never suggests the player try anyway.
- **GPC where it's the law:** marked "Companies must honor this in [state]." Which states count is a sourced list in the checklist data, from each state's attorney general or regulator, not from a blog. The builder verifies the list; the brainstorm found about 12 states in secondary sources, which disagree.
- **GPC elsewhere:** "Companies don't have to honor this where you live, but many do."

### GPC and the sky

GPC is a browser signal sent to every site you visit. It isn't an opt-out filed with particular brokers, so it can't honestly light or halo particular stars. Selecting the rung shows a faint whole-sky shimmer, and the rung reads "every website you visit, in this browser" rather than a star count. Doing it gives the sky a permanent faint shimmer layer, like the DAA halo. It never lights a star and never counts toward FIELD COVERED. *(My call.)*

The rung links to the GPC instructions the NAI line already uses. The existing "NAI: GPC extension or member links" line stays where it is in its mission.

### OptOutPrescreen

The four nationwide consumer reporting companies run it: Equifax, Experian, TransUnion and Innovis. It stops them supplying your file for prescreened credit and insurance offers, for 5 years online or permanently by mail.

- It lights **only** the records that do that prescreen selling. Which of the 20 bureau records that is gets established at tier A (optoutprescreen.com and the bureaus' own disclosures). Until a record is sourced it isn't lit. It never lights the parent companies wholesale (the 10/19 "never lights the parent" rule).
- It's recorded like a mission checklist line: a dated filing with a 5-year expiry (the online opt-out's term), after which the star goes amber.
- The existing credit-freeze ring stays separate. A freeze is not this opt-out.

### Selecting and doing a rung

- **Select** (tap or hover) a rung: its stars brighten and pulse in the sky. Others dim, and the camera fits to them where that's useful. The count is shown ("603 stars"). Selection is in memory, like star selection today.
- **Go:**
  - For a rung that belongs to a mission (DROP, DAA, company lines), Go opens that mission's existing briefing. Filing still happens through the existing debrief checklist, so there's no second way to record a filing.
  - The two new rungs (GPC and OptOutPrescreen) have no mission. Their card has the steps (sourced links) and an "I did this" button that records a dated filing. *(My call: these could later move into a mission.)*
- **Done rungs** show done (lime, with the date). Their stars stay lit. The list's "next" marker moves to the biggest undone rung.
- **Re-check due** rungs (amber, as today) say so and offer "File again."

### Layout

- **Desktop:** the ladder is a narrow column beside the sky, collapsible.
- **Phone:** a bottom sheet over the sky, collapsed to the next rung ("Next: DAA WebChoices · 99 stars") and pulled up for the full list. It must coexist with the star card's bottom sheet: only one is open at a time. *(My call.)*
- The existing header (FIELD COVERED, HUBS LIT) stays.

### Scout

New lines, written and swept like the rest of `dialogue.js`:
- the quiz ("Before we start: where do you live? It changes which tools you've got.")
- the first rung selected
- DROP for a non-Californian (honest, not pitying)
- the first satellite line cut

---

## Part 3: the government satellites

### Who

The 12 records with `kind: buyer` whose ids start `us-`: Air Force, Army, CBP, DCSA, DEA, FBI, ICE, IRS, Navy, SOCOM, USMS, USSS. The six non-government buyers (AELIUS, Ideal Financial, Meta, Recrue Media, Sierra Nevada, STR) stay as they're drawn today.

### How they look

- Satellites in their own band above the broker field, small and slowly drifting or orbiting. They don't move once the player is interacting with the map, and they respect `prefers-reduced-motion`.
- Each satellite is labelled with initials: FBI, ICE, CBP, IRS, DEA, USSS, USMS, ARMY, NAVY, USAF, SOCOM, DCSA. No seals, logos or agency colours.
- From each satellite, a thin line runs down to every broker it's documented buying from. These are the 43 existing tier-A `buys` links where the buyer is one of these 12 (ICE 7, FBI 6, USMS 5, Army 4, CBP 4, IRS 4, DEA 3, Navy 3, Air Force 2, DCSA 2, USSS 2, SOCOM 1). The lines are styled apart from constellation figure lines and ownership links (for example, a downward-dashed beam).

### Lines go dark

When the broker at the bottom of a line is lit, that line goes dark. The satellite shows "3 of 7 lines cut." A satellite with every line cut dims. A haloed (browser-only) or preview-only star doesn't cut a line. *(My call.)*

### Tapping a satellite

A card in the star-card style:
- "**The FBI is a buyer.** You can't opt out of a buyer. You can opt out of the brokers it buys from."
- The brokers it buys from, each with the claim and the source link already in the link record, and whether that line is cut.
- For an uncut line whose broker has an opt-out: a link to that broker's star (and so its mission or Big Check line).

### Scout

"They're up there buying. You can't stop them buying, but you can stop the brokers selling them you." The tone stays in line with [[no-omni-they]]: name the agency.

---

## Tests

- **Location:** whoami region → pre-filled guess; non-US → "outside" guess; no guess → picker; each migration from the old residency values; the answer never appears in a URL, a `track()` payload, `missionEventData`, an error context or a bug-report body.
- **Ladder order:** deterministic for a given dataset and answer; rung counts match the lighting function; DROP previews but never lights for non-`CA`; GPC lights and counts nothing; OptOutPrescreen lights only its sourced records and expires at 5 years.
- **Satellites:** exactly the 12 `us-` buyers; 43 lines from the dataset; a line is cut only by a lit (lime or amber) broker, never by a halo or a preview.
- **Copy:** every new string goes through the existing content tests (verified URLs, no unsourced claims, the "every string on the page" phone tests).
- **Real browser:** Playwright at 1280 and 390, with screenshots of the quiz, the ladder (closed and open), a selected rung with its stars highlighted, and a satellite card.

## Left to the builder

- Satellite art (SVG drawn in the game's palette), orbit motion and the line style.
- The ladder's exact visuals and animation, including how selection highlights stars.
- The state picker's form (select, searchable list or grid), as long as it works one-handed on a phone.
- Whether the ladder's data is a new module or an extension of `broker-checklists.js`.
- The sourced GPC state list and the OptOutPrescreen record mapping (research tasks with tier-A sources).

## Calls I made (not discussed with Liz)

- Old "No" residency answers are asked again for their state; the IP guess is never stored.
- Zero-star lines sit at the bottom of the ladder, not off it.
- GPC shows a whole-sky shimmer, never lights or counts.
- GPC and OptOutPrescreen get an "I did this" button, not a new mission.
- OptOutPrescreen expires at 5 years.
- The ladder sheet and the star card are never open together on phones.
- Halos and previews don't cut satellite lines.
