import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInitialState } from '../src/state.js';
import { renderCityTogether, explainerSlides } from '../src/screens/city-together.js';
import { renderStats } from '../src/screens/stats.js';
import { COLLECTIVE_DIALOGUE } from '../src/data/dialogue.js';
import { POD_MIN_PLAYERS } from '../src/utils/collective.js';
import { setAnalyticsOff } from '../src/utils/analytics-pref.js';
import { countWords, splitWords } from '../src/components/deck.js';
import { screens, textNodes, DATA } from './fixtures/city-explainer-text-screens.mjs';

const BEFORE = JSON.parse(readFileSync(new URL('./fixtures/city-explainer-text-before.json', import.meta.url), 'utf8'));
const CSS = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const RUN_PY = readFileSync(new URL('../collective/job/run.py', import.meta.url), 'utf8');
const norm = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const deckOf = (html) => html.match(/<div class="deck[^"]*"[^>]*data-deck[\s\S]*?<\/div><div class="deck-controls/)?.[0] ?? '';
const slidesOf = (html) => deckOf(html).split(/<section class="slide[ "]/).slice(1).map((s) => s.slice(s.indexOf('>') + 1, s.lastIndexOf('</section>')));
// On a phone the list after a closed fold is hidden (style.css); the summary is a control.
const closedDetails = (html) => html.replace(/<details[\s\S]*?<\/details><span class="explainer-more-text">[\s\S]*?<\/span>/g, ' ');
const dropHidden = (html) => html.replace(/<span class="k-dots[^"]*" aria-hidden="true">[\s\S]*?<\/span><\/span>/g, ' ');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

const STATES = [['error', { status: 'error' }], ['loading', { status: 'loading' }], ['ready', { status: 'ready', data: DATA }]];

beforeEach(() => { globalThis.localStorage = memoryStorage(); setAnalyticsOff(false); });

describe('every string The Whole City and Your City drew before still reaches the page', () => {
  it('old text nodes, screen by screen, are all in the new page (a split one, sentence by sentence)', () => {
    const now = Object.fromEntries(screens());
    expect(Object.keys(now).sort()).toEqual(Object.keys(BEFORE).sort());
    for (const [key, old] of Object.entries(BEFORE)) {
      const page = textNodes(now[key]).join(' ');
      for (const t of old) {
        if (page.includes(t)) continue;
        let from = 0;
        for (const s of splitWords(t, 1)) {
          const at = page.indexOf(s.trim(), from);
          expect(at, `${key}: ${s.slice(0, 80)}`).toBeGreaterThanOrEqual(0);
          from = at + s.trim().length;
        }
      }
    }
  });
});

describe("Scout's explainer as four slides", () => {
  it('the four parts are the explainer, word for word, split at sentence ends', () => {
    const parts = explainerSlides().map((s) => norm(s.html.replace(/<span class="k-dots[\s\S]*?<\/span><\/span>/g, '').replace(/<summary>[\s\S]*?<\/summary>/g, '')));
    expect(parts).toHaveLength(4);
    expect(parts.join(' ')).toBe(COLLECTIVE_DIALOGUE.explainer);
    for (const p of parts) expect(p).toMatch(/[.?!]$/);
  });

  it('one fact each: what is sent, what never is, the 50-player rule, deletion', () => {
    const [sent, never, rule, deletion] = explainerSlides().map((s) => norm(s.html));
    expect(sent).toContain('the game tells our own server');
    expect(sent).toContain('the place your internet connection points to');
    expect(never).toBe("Never your passwords, never what's inside your accounts.");
    expect(rule).toContain(`at least ${POD_MIN_PLAYERS} players`);
    expect(deletion).toContain('Turn sharing off and that night we delete');
  });

  for (const [name, collective] of STATES) {
    it(`renders as a four-slide deck in Scout's bubble (${name})`, () => {
      const html = renderCityTogether(createInitialState(), { collective });
      expect(slidesOf(html)).toHaveLength(4);
      expect(html).toContain('aria-label="How we know any of this"');
      expect(html).toContain('WHAT WE KNOW ABOUT YOU');
      expect(html).toContain('scout/thinking-a.png');
    });
  }

  it('a slide shows at most 35 words with its fold closed; the long list is behind a fold open on desktop', () => {
    const slides = slidesOf(renderCityTogether(createInitialState(), { collective: { status: 'error' } }));
    for (const s of slides) expect(countWords(closedDetails(dropHidden(s)))).toBeLessThanOrEqual(35);
    expect(slides[0]).toMatch(/<details class="explainer-more" data-fold="explainer-sent" data-open-desktop><summary>[^<]+<\/summary><\/details><span class="explainer-more-text">That's things like/);
    expect(CSS).toMatch(/\.explainer-more:not\(\[open\]\) \+ \.explainer-more-text \{ display: none; \}/);
  });

  it(`the dots: exactly POD_MIN_PLAYERS of them, hidden from screen readers, phone only`, () => {
    const rule = explainerSlides()[2].html;
    const dots = rule.match(/<span class="k-dots[^"]*" aria-hidden="true">([\s\S]*?)<\/span><\/span>/);
    expect(dots).not.toBeNull();
    expect((dots[1].match(/<span class="k-dot"><\/span>|<span class="k-dot">/g) || []).length).toBe(POD_MIN_PLAYERS);
    // No number but the sentence's: the picture carries no text.
    expect(norm(dots[0])).toBe('');
    expect(CSS).toMatch(/@media \(min-width: 900px\)[^@]*\.k-dots\s*\{[^}]*display: none/);
  });

  it('the threshold is the nightly job\'s, and the sentence and footer say it', () => {
    expect(RUN_PY).toMatch(new RegExp(`^K = ${POD_MIN_PLAYERS}$`, 'm'));
    expect(COLLECTIVE_DIALOGUE.explainer).toContain(`at least ${POD_MIN_PLAYERS} players`);
    expect(renderCityTogether(createInitialState(), { collective: { status: 'ready', data: DATA } })).toContain(`fewer than ${POD_MIN_PLAYERS} players`);
  });

  it('on desktop the slides flow as one paragraph, as the bubble always did', () => {
    expect(CSS).toMatch(/@media \(min-width: 900px\)[^@]*\.explainer-deck \.slide\s*\{[^}]*display: inline/);
    expect(CSS).toMatch(/@media \(min-width: 900px\)[^@]*\.explainer-more \{ display: none; \}[^@]*\.explainer-more:not\(\[open\]\) \+ \.explainer-more-text \{ display: inline; \}/);
  });
});

describe('Your City: Play stats points to the explainer', () => {
  for (const off of [false, true]) {
    it(`links to The Whole City's explainer (sharing ${off ? 'off' : 'on'})`, () => {
      setAnalyticsOff(off);
      const html = renderStats(createInitialState(), {});
      const panel = html.slice(html.indexOf('PLAY STATS'));
      expect(panel).toMatch(/<a [^>]*href="#\/city-together"[^>]*>[^<]+<\/a>/);
    });
  }
});
