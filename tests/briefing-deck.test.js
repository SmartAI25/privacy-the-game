import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderBriefing } from '../src/screens/briefing.js';
import { createInitialState } from '../src/state.js';
import { MISSIONS } from '../src/data/missions.js';
import { countWords, splitWords } from '../src/components/deck.js';
import { missionSteps } from '../src/utils/debrief.js';
import { PM_BURST_ID, pmBurstBriefingLine } from '../src/utils/bursts.js';

const state = createInitialState();
// The page as read in order, without the "More intel" summary.
const read = (html) => norm(html.replace(/<summary>[^<]*<\/summary>/g, ' '));
const norm = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const deckOf = (html) => html.match(/<div class="deck[^"]*"[^>]*data-deck[\s\S]*?<\/div><div class="deck-controls"/)?.[0] ?? '';
const slidesOf = (html) => deckOf(html).split('<section class="slide"').slice(1).map((s) => s.slice(s.indexOf('>') + 1, s.lastIndexOf('</section>')));

// A slide's body: its words minus labels, step numbers and text behind a closed <details>.
const body = (slide) => slide
  .replace(/<details[\s\S]*?<\/details>/g, ' ')
  .replace(/<div class="section-label[^"]*"[^>]*>[^<]*<\/div>/g, ' ')
  .replace(/<div data-step-num[^>]*>[^<]*<\/div>/g, ' ');

describe('briefings are slides on phones', () => {
  it("every briefing's intel and Scout line are still in the page", () => {
    for (const m of MISSIONS) {
      const page = read(renderBriefing(state, m.id));
      expect(page, m.id).toContain(norm(m.briefing));
      const scout = m.id === PM_BURST_ID ? pmBurstBriefingLine(state) : m.scoutDialog.briefing;
      expect(page, m.id).toContain(norm(scout));
      for (const s of missionSteps(m, state)) expect(page, m.id).toContain(norm(s.text));
    }
  });

  it('no slide body over 35 words unless a single sentence is', () => {
    let decks = 0;
    for (const m of MISSIONS) {
      const slides = slidesOf(renderBriefing(state, m.id));
      if (slides.length) decks++;
      for (const s of slides) {
        const n = countWords(body(s));
        if (n <= 35) continue;
        // Over budget only for one step (its notes are reasons the player needs together)
        // or one sentence of intel / Scout.
        const steps = (s.match(/data-brief-step/g) || []).length;
        const chunk = s.match(/data-chunk>([\s\S]*?)<\/div>/)?.[1];
        const ok = steps === 1 || (chunk != null && splitWords(chunk, 1).length === 1);
        expect(ok, `${m.id}: ${n} words: ${norm(body(s)).slice(0, 120)}`).toBe(true);
      }
    }
    expect(decks).toBeGreaterThan(250);
  });

  it('the action row is outside the deck', () => {
    for (const id of ['browser_fingerprint-reclaim-dns', 'gmail-recon-breach', 'temu-recon-activity']) {
      const html = renderBriefing(state, id);
      const d = deckOf(html);
      expect(d, id).not.toBe('');
      expect(d).not.toContain('data-action="go-do-it"');
      expect(d).not.toContain('NOT NOW');
      expect(html).toContain('data-action="go-do-it"');
      // The row comes after the deck's controls, before the sidebar.
      expect(html.indexOf('data-action="go-do-it"')).toBeGreaterThan(html.indexOf('data-deck-controls'));
    }
  });

  it('the Scout slide is hidden at 900px and up, and the sidebar bubble under 900px', () => {
    const html = renderBriefing(state, 'browser_fingerprint-reclaim-dns');
    expect(deckOf(html)).toContain('class="brief-scout"');
    expect(deckOf(html)).toContain('data-scout="briefing"');
    expect(html).toMatch(/class="brief-side"[\s\S]*data-scout="briefing"/);
    expect(html).toContain('class="brief brief--deck');
    const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
    const block = css.slice(css.indexOf('/* briefing deck: start */'), css.indexOf('/* briefing deck: end */'));
    // Under 900px the sidebar (Scout, THIS LIBERATES, lore) is hidden: the slides show it.
    expect(block).toMatch(/@media \(max-width: 899px\)[^@]*\.brief--deck \.brief-side[^{-]*\{[^}]*display: none/);
    expect(block).toMatch(/@media \(min-width: 900px\)[^@]*\.brief-scout[^{]*\{[^}]*display: none/);
    // The last slide's THIS LIBERATES and lore: phone only; the sidebar keeps them on desktop.
    expect(block).toMatch(/@media \(min-width: 900px\)[^@]*\.brief-last[^{]*\{[^}]*display: none/);
    expect(block).not.toMatch(/white-space:\s*nowrap/);
  });

  it('the steps are packed in order, and a step with notes has a slide of its own', () => {
    const m = MISSIONS.find((x) => x.id === 'gmail-recon-breach');
    const slides = slidesOf(renderBriefing(state, m.id));
    const withNotes = m.steps.findIndex((s) => s.note?.length);
    expect(withNotes).toBeGreaterThan(-1);
    const own = slides.find((s) => s.includes(m.steps[withNotes].note[0].label));
    expect((own.match(/data-brief-step/g) || []).length).toBe(1);
    const order = m.steps.map((s) => norm(slides.join('')).indexOf(norm(s.text)));
    expect(order.every((x, i) => x > -1 && (i === 0 || x > order[i - 1]))).toBe(true);
  });

  it('long intel: two more slides, then More intel behind a details', () => {
    const m = MISSIONS.find((x) => splitWords(x.briefing, 35).length > 4);
    const html = renderBriefing(state, m.id);
    expect(deckOf(html)).toMatch(/<details class="brief-more"><summary>More intel<\/summary>/);
  });

  it('a short mission renders no deck', () => {
    const short = MISSIONS.find((m) => m.id === 'outlook-recon-login');
    const html = renderBriefing(state, short.id);
    expect(html).not.toContain('data-deck');
    expect(html).not.toContain('brief--deck');
    expect(norm(html)).toContain(norm(short.briefing));
  });
});
