// Task 7a, the phone trim pass: fewer words on a phone's first screen, nothing lost.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInitialState } from '../src/state.js';
import { renderQuickQuest } from '../src/screens/quick-quest.js';
import { QUICK_QUESTS } from '../src/data/quests.js';
import { DISTRICTS } from '../src/data/districts.js';
import { countWords, splitWords } from '../src/components/deck.js';
import { screens, textNodes } from './fixtures/trim-text-screens.mjs';

const BEFORE = JSON.parse(readFileSync(new URL('./fixtures/trim-text-before.json', import.meta.url), 'utf8'));
const CSS = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const TRIM_CSS = CSS.slice(CSS.indexOf('/* trim pass: start */'), CSS.indexOf('/* trim pass: end */'));
const norm = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const deckOf = (html, label) => html.match(new RegExp(`<div class="deck[^"]*" data-deck aria-roledescription="carousel" aria-label="${label}">[\\s\\S]*?</div><div class="deck-controls`))?.[0] ?? '';
const slidesOf = (deckHtml) => deckHtml.split(/<section class="slide[ "]/).slice(1).map((s) => s.slice(s.indexOf('>') + 1, s.lastIndexOf('</section>')));
const closedDetails = (html) => html.replace(/<details[\s\S]*?<\/details>/g, ' ');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
beforeEach(() => { globalThis.localStorage = memoryStorage(); });

describe('every string these screens drew before still reaches the page', () => {
  it('old text nodes, screen by screen, are all in the new page (a split one, sentence by sentence, in order)', () => {
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

describe('the trim CSS', () => {
  it('no nowrap and no fixed width over 360px', () => {
    expect(TRIM_CSS.length).toBeGreaterThan(0);
    expect(TRIM_CSS).not.toMatch(/white-space:\s*nowrap/);
    for (const w of TRIM_CSS.match(/(?<![-\w])width:\s*(\d+)px/g) || []) expect(parseInt(w.split(':')[1], 10)).toBeLessThanOrEqual(360);
  });
  it('phone-only and desktop-only split at 900px; folds open on desktop by script, not ::details-content', () => {
    expect(TRIM_CSS).toMatch(/@media \(max-width: 899px\) \{ \.desktop-only \{ display: none !important; \} \}/);
    expect(TRIM_CSS).toMatch(/@media \(min-width: 900px\) \{ \.phone-only \{ display: none !important; \} \}/);
    expect(TRIM_CSS).toMatch(/@media \(min-width: 900px\)[\s\S]*\.phone-fold > summary, \.more-fold \{ display: none; \}/);
    expect(TRIM_CSS).not.toContain('::details-content');
  });
});

describe('Quick Quest: two slides of four tiles on a phone', () => {
  const html = renderQuickQuest(createInitialState());
  const d = deckOf(html, 'Quick Quest');
  const slides = slidesOf(d);

  it('the desktop list is as it was, marked desktop-only; the deck is phone-only', () => {
    expect(html).toMatch(/<div class="desktop-only qq-list"/);
    expect(html).toMatch(/<div class="phone-only qq-deck">/);
    for (const q of QUICK_QUESTS) expect(html.split(`href="#/district/${q.targetDistrict}"`).length - 1).toBeGreaterThanOrEqual(2);
  });

  it('every problem is a tile, in order, four to a slide; each tile is a link to its district', () => {
    expect(slides).toHaveLength(Math.ceil(QUICK_QUESTS.length / 4));
    const tiles = slides.flatMap((s) => [...s.matchAll(/<li class="qq-tile">([\s\S]*?)<\/li>/g)].map((m) => m[1]));
    expect(tiles).toHaveLength(QUICK_QUESTS.length);
    QUICK_QUESTS.forEach((q, i) => {
      const t = tiles[i];
      expect(t).toMatch(new RegExp(`<a class="qq-go" href="#/district/${q.targetDistrict}">`));
      expect(decode(norm(t.match(/<a class="qq-go"[^>]*>([\s\S]*?)<\/a>/)[1]))).toBe(q.title);
      // What it looks like, and where it goes, behind a tap.
      const fold = t.match(/<details class="qq-signs" data-fold="qq-[a-z0-9-]+"><summary aria-label="What it looks like: [^"]+">\?<\/summary>([\s\S]*)<\/details>/)?.[1] ?? '';
      expect(decode(norm(fold))).toContain(q.description);
      const district = DISTRICTS.find((x) => x.id === q.targetDistrict);
      expect(norm(fold)).toContain(district.name.toUpperCase());
    });
  });

  it('a slide shows only the titles: at most 35 words with the folds closed', () => {
    for (const s of slides) expect(countWords(closedDetails(s))).toBeLessThanOrEqual(35);
  });

  it('the tile grid is two columns and fits a 320px phone', () => {
    expect(TRIM_CSS).toMatch(/\.qq-grid \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(TRIM_CSS).toMatch(/\.qq-signs > summary \{[^}]*min-height: 44px/);
    expect(TRIM_CSS).toMatch(/\.qq-go \{[^}]*min-height: 44px/);
  });
});
