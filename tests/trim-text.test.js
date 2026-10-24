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

describe('surveys: one question and a grid of chips on a phone', async () => {
  const { renderDistrict, surveyAsk } = await import('../src/screens/district.js');
  const { ACCOUNTS } = await import('../src/data/accounts.js');
  const { haveAccount } = await import('../src/data/districts.js');
  const surveyed = DISTRICTS.filter((d) => d.type !== 'facility' && !d.hasGarage);

  it('the one question says what each row asked', () => {
    expect(surveyAsk(haveAccount)).toBe('Which of these accounts do you have?');
    expect(surveyAsk((n) => `Do you use ${n}?`)).toBe('Do you use any of these?');
    expect(surveyAsk((n) => `Have you registered for ${n}?`)).toBe('Have you registered for any of these?');
  });

  it('every account is a chip: a button, pressed when on, its full question as its name', () => {
    for (const d of surveyed) {
      const s = createInitialState();
      const html = renderDistrict(s, d.id, 'survey');
      const grid = html.match(/<div class="phone-only survey-chips">([\s\S]*?)<\/div><!-- \/survey-chips -->/)?.[1] ?? '';
      expect(grid, d.id).not.toBe('');
      expect(norm(grid)).toContain(surveyAsk(d.surveyQuestion || haveAccount));
      const ids = Object.entries(ACCOUNTS).filter(([, a]) => a.district === d.id).map(([id]) => id);
      for (const id of ids) {
        const name = ACCOUNTS[id].name;
        if (!s.accounts[id]) {
          expect(grid, `${d.id}/${id}`).toMatch(new RegExp(`<span class="survey-chip survey-chip--soon"[^>]*>[^<]*${name.replace(/[()]/g, '\\$&')}`));
          continue;
        }
        const chip = grid.match(new RegExp(`<button type="button" class="survey-chip[^"]*" data-action="toggle-account" data-account="${id}" aria-pressed="(true|false)" aria-label="([^"]*)">`));
        expect(chip, `${d.id}/${id}`).toBeTruthy();
        expect(chip[1]).toBe(String(!!s.accounts[id].enabled));
        expect(decode(chip[2])).toBe((d.surveyQuestion || haveAccount)(name));
      }
      // Desktop keeps its rows.
      expect(html).toContain('<div class="desktop-only survey-rows">');
    }
  });

  it("Scout's welcome: on a phone only the first sentence shows before MORE; desktop keeps its lead", () => {
    const html = renderDistrict(createInitialState(), 'vault', 'survey');
    const summary = html.match(/<details class="intro-more">\s*<summary[^>]*>([\s\S]*?)<\/summary>/)[1];
    expect(norm(summary.replace(/<span class="intro-lead-more">[\s\S]*?<\/span>/, ''))).toBe('Welcome to The Vault.');
    expect(summary).toMatch(/<span class="intro-lead-more"> This is where it gets real/);
    expect(html).toMatch(/<div class="intro-lead-phone"[^>]*>This is where it gets real/);
    expect(CSS).toMatch(/@media \(max-width: 899px\)[^@]*\.intro-lead-more \{ display: none; \}/);
    expect(CSS).toMatch(/@media \(min-width: 900px\)[^@]*\.intro-lead-phone \{ display: none; \}/);
  });

  it("a facility's title is not said twice on a phone: its building's own label hides there", () => {
    const html = renderDistrict(createInitialState(), 'reclamation');
    expect(html).toContain('<span class="facility-icon">');
    expect(TRIM_CSS).toMatch(/@media \(max-width: 899px\) \{ \.facility-icon > div > div:last-child \{ display: none; \} \}/);
  });
});

describe("the Big Check: Scout's first-visit line as two slides", async () => {
  const { renderBigCheck } = await import('../src/screens/big-check.js');
  const { BROKER_MAP_DIALOGUE } = await import('../src/data/dialogue.js');
  const mini = JSON.parse(readFileSync(new URL('./fixtures/broker-map-mini.json', import.meta.url), 'utf8'));
  const layout = JSON.parse(readFileSync(new URL('../src/data/broker-layout.json', import.meta.url), 'utf8'));
  const html = renderBigCheck(createInitialState(), { status: 'ready', data: { map: mini, layout }, today: '2026-10-23', scoutLine: BROKER_MAP_DIALOGUE.bigCheck });
  const slides = slidesOf(deckOf(html, 'The long tail'));

  it('split at sentence ends, word for word, at most 20 words a slide', () => {
    expect(slides.length).toBeGreaterThanOrEqual(2);
    expect(decode(slides.map(norm).join(' '))).toBe(BROKER_MAP_DIALOGUE.bigCheck);
    for (const s of slides) expect(countWords(s)).toBeLessThanOrEqual(20);
    expect(html).toContain('class="deck deck--flow"');
  });
});
