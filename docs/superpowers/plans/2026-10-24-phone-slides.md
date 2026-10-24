# Phone slides: fewer words per screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On a phone, every screen shows few words at once. Long screens become decks of short slides, repeats are said once, and numbers are drawn rather than written. Nothing true is removed.

**Architecture:** A reusable deck component renders plain `<section>` slides into the existing HTML. Under 900px, CSS turns the deck into a horizontal scroll-snap row with BACK / NEXT, dots and a "2 of 5" count. At 900px and up the slides are ordinary stacked blocks and the deck's controls are hidden, so desktop keeps today's layout. Text that won't fit a slide goes behind a native `<details>`. Screens opt in one at a time.

**Tech Stack:** vanilla JS ESM, CSS scroll-snap, vitest 5. No new dependencies.

**Spec:** Liz, 2026-10-24: "reduce wordiness on the iphone, get fewer words on each screen and increase the number of 'slides' or screens used to show the same information or improve density of the data visualizations where you can." The survey, measured at 390×844, is in the PR description and the controller's ledger. Its findings:
- First-screen word counts: DNS briefing 182, The Whole City 174, Saints 158, DNS debrief 152, Temu briefing 151.
- The Gmail building is 963 words across 5.2 screens.
- In 68 missions the Scout line repeats the briefing.

## Global Constraints

- No new dependencies. `STATE_VERSION` unchanged. No change to mission data files except Task 4's survey-grammar bug.
- Every string that reaches the page today still reaches it, either on a slide or inside `<details>`. The only text removed is an exact repeat, and one copy always stays.
- Budgets at 390×844, excluding the top bar:
  - a slide's body text is at most 35 words;
  - a phone's first screen is at most 60 words;
  - a Scout line or briefing paragraph longer than the budget is split at sentence ends, never mid-sentence.
- Desktop (≥ 900px wide) looks as it does today, apart from Task 4's changes.
- Accessibility:
  - every slide is reachable by keyboard and screen reader in document order;
  - BACK and NEXT are real `<button>`s at least 44px tall;
  - the count lives in an `aria-live="polite"` region;
  - Left and Right arrows move between slides when focus is inside the deck;
  - moving to a slide focuses its heading without scrolling the page;
  - with `prefers-reduced-motion: reduce`, scrolling is instant;
  - no slide clips its text — a tall slide scrolls vertically.
- The phone-width rule (`tests/breaker-phase3/phase3-breaker.test.js`): no fixed width over 360px and no `white-space: nowrap` on text.
- Privacy: nothing new goes to `track()` or the URL. The deck changes no hash.
- The top bar is NOT changed by this plan; it waits for Liz's sign-off (the Patreon wording).
- Every PR bumps the version (`package.json` + lock) and `src/index.html`'s `style.css?v=`.

## Review Focus

1. **Briefing HTML inside the text.** Briefings and Scout lines contain `<a>`, `<strong>` and `&mdash;`, and splitting must never cut a tag or an entity. Expected: a sentence that contains a tag stays whole. Pinned by Task 1's `splitWords never cuts inside a tag or entity`.
2. **Keyboard and screen readers.** Expected: Tab reaches every slide's content in order, and NEXT on the last slide is disabled, not hidden. Pinned by Task 1's tests and Task 7's check.
3. **Desktop regressions.** Expected: a ≥900px screenshot of each converted screen matches today's apart from the controls being hidden. Pinned by Task 7's screenshot pairs.
4. **A mission with one short step and a short briefing.** Expected: no deck at all (one slide doesn't need controls). Pinned by Task 1's `one slide renders no controls`.
5. **Existing tests that look for strings.** Expected: they keep passing because the text is still present. Pinned by the full suite at every task.

---

### Task 1: The deck component

**Files:** Create `src/components/deck.js`; modify `src/style.css` and `src/app.js` (wire after render); add `tests/deck.test.js`.

**Interfaces (produces):**
- `splitWords(html: string, max = 35) → string[]`: groups whole sentences into chunks of at most `max` words. A single longer sentence becomes its own chunk. Never splits inside `<…>` or `&…;`. `join('') ===` input, after whitespace normalisation.
- `deck(slides: Array<{ html: string, heading?: string }>, { label: string, className?: string }) → string`:
  - Wraps the slides in `<div class="deck" data-deck aria-roledescription="carousel" aria-label="<label>">`, each slide a `<section class="slide" aria-roledescription="slide" aria-label="N of M">`, followed by the controls: BACK, the dots, the `aria-live` count, NEXT.
  - With one slide it returns just that slide's html, with no deck and no controls.
- `initDecks(root: Element) → void`: idempotent. It wires every `[data-deck]` under `root`:
  - BACK and NEXT scroll one slide;
  - the dots and count follow the scroll position (IntersectionObserver or scroll math);
  - Left and Right arrow keys move between slides;
  - focus moves to the new slide's first heading with `{ preventScroll: true }`;
  - BACK is disabled on the first slide and NEXT on the last.
- `app.js` calls `initDecks(app)` after every render.

**CSS:**
- Under 900px:
  - `.deck` is `display:flex; overflow-x:auto; scroll-snap-type:x mandatory; overscroll-behavior-x:contain`;
  - `.slide` is `flex:0 0 100%; scroll-snap-align:start; max-height:` the visible area, with `overflow-y:auto`;
  - the controls are a row under the deck.
- At 900px and up: `.deck` is `display:block`, the slides are normal blocks, and the controls are `display:none`.
- With reduced motion: `scroll-behavior:auto`.

- [ ] Write the failing tests:
  - `splitWords keeps every word in order`
  - `splitWords never exceeds max unless one sentence does`
  - `splitWords never cuts inside a tag or entity`
  - `deck renders sections, labels and controls`
  - `one slide renders no controls`
  - `controls are buttons with 44px min height`
  - `no nowrap and no fixed width over 360 in the deck CSS`
  - `initDecks is idempotent` (jsdom-free: test the pure helpers, and that `app.js` calls `initDecks` after render via the source-text style used in tests/broker-game/app-wiring.test.js)
- [ ] Implement. Run `npx vitest run tests/deck.test.js`, then the full suite.
- [ ] Commit: `feat(ui): a slide deck for phones`

### Task 2: Briefings as slides

**Files:** Modify `src/screens/briefing.js`; test in `tests/briefing-deck.test.js`.

On phones the briefing's main column becomes a deck, in this order:
1. Title, badges, and the first chunk of THREAT INTEL.
2. Up to two more intel chunks. Anything after that goes in `<details><summary>More intel</summary>`.
3. Scout's line: sprite and text. The Scout sidebar is hidden under 900px so the line isn't shown twice. On desktop the sidebar shows as today and the Scout slide is hidden.
4. The steps, packed in order onto slides of at most 35 words. A step with notes gets its own slide, and its notes stay visible, because they are reasons the player needs before typing a password.
5. THIS LIBERATES and the lore, on the last slide.

The action row (GO DO IT / I DID IT / NOT NOW) stays outside the deck, so it is always one tap away. Password-progress, recon notes, the flag and the no-reset panel keep their current places inside slide 1 or the steps.

- [ ] Write failing tests:
  - `every briefing's intel and Scout line are still in the page`, across all 326 missions;
  - `no slide body over 35 words unless a single sentence is`, across all missions;
  - `the action row is outside the deck`;
  - `the Scout slide is hidden at 900px and up, and the sidebar bubble under 900px` (check the CSS classes);
  - `a short mission renders no deck`.
- [ ] Implement, then run the full suite. Commit: `feat(briefing): one idea per slide on phones`

### Task 3: Debrief and re-check say Scout's briefing line once

**Files:** Modify `src/screens/debrief.js` (and the re-check screen it renders); test in `tests/debrief-scout-once.test.js`.

When the debrief or re-check Scout bubble would show text identical to the briefing's Scout line, show only its first sentence plus `<details><summary>Remind me</summary>…rest…</details>`. Any other Scout text is unchanged.

- [ ] Tests: `the repeated briefing line collapses after its first sentence` and `a different debrief line is untouched`.
- [ ] Implement, then run the full suite. Commit: `fix(debrief): Scout's briefing line isn't read three times`

### Task 4: Quick wins

**Files:** `src/screens/broker-map.js`, `src/screens/big-check.js`, `src/screens/timeline.js`, the district survey (find "account account"), `src/screens/stats.js`; tests next to each.

- Broker map:
  - the legend goes behind `<details><summary>KEY</summary>`, closed on phones and open at 900px and up;
  - the sentence repeated on every "What's left" row appears once, above the list.
- Big Check: when the Scout bubble shows, the header's "Optional. It never counts…" line is dropped, so it is said once.
- Timeline: the sentence repeated five times appears once, above the list.
- Vault survey: fix "a Investment Account account". Use the right article, and don't repeat "account".
- Stats: three dials in one row and the four findings in a 2×2 grid on phones, with the same words.
- Tests: one per item. Commit: `fix(ui): say it once, draw it tighter`

### Task 5: Saints and buildings

**Files:** `src/screens/saints.js`, `src/screens/building.js`; tests.

- Saints: on phones, a deck with one saint per slide. Each slide shows the name, the quote and `<details><summary>Their story</summary>`. The dots show the saints' names, accessibly.
- Building:
  - The Records Desk's five legal-process cards become one table: who asks, what they use, whether a judge is needed. Each row's full text sits in a `<details>`. Every word stays.
  - The Ground Floor entries become one line each (the title), opening on tap to show the paragraph, advice and sources.
- Commit: `feat(ui): saints and buildings as slides and tables on phones`

### Task 6: The Whole City explainer

**Files:** `src/screens/city-together.js` (and `stats.js` if it repeats the text); tests.

On phones, Scout's 140-word bubble becomes four slides, one fact each:
- what is sent;
- what never is;
- the 50-player rule, with a drawn row of 50 dots (aria-hidden, plus a text equivalent);
- deletion when sharing is off.

Stats' "Play stats" paragraph links to this explainer instead of repeating it.

- Commit: `feat(ui): The Whole City explained in four slides`

### Task 7: Measure, screenshot, ship

- [ ] Re-measure the survey's screens at 390×844 and 375×667:
  - every first screen is at most 60 words, excluding the top bar;
  - no screen is taller than 2 phone screens, except mission lists and the Big Check.
- [ ] Desktop screenshots at 1280×800 of each converted screen, compared with main.
- [ ] Keyboard pass: Tab, the arrow keys and BACK/NEXT on the briefing, Saints and The Whole City.
- [ ] Bump the version to a minor release and set `style.css?v=`, then open a PR with before/after screenshots. Merge once the full suite is green.
