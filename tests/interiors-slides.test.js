import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInitialState, toggleAccount } from '../src/state.js';
import { renderSaints, SAINT_ORDER } from '../src/screens/saints.js';
import { renderBuildingInterior, judgeCell } from '../src/screens/building.js';
import { SAINTS } from '../src/data/interiors/saints.js';
import { INTERIORS, getInterior } from '../src/data/interiors/index.js';
import { countWords } from '../src/components/deck.js';
import { screens, textNodes } from './fixtures/interiors-text-screens.mjs';

const BEFORE = JSON.parse(readFileSync(new URL('./fixtures/interiors-text-before.json', import.meta.url), 'utf8'));
const norm = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const deckOf = (html) => html.match(/<div class="deck[^"]*"[^>]*data-deck[\s\S]*?<\/div><div class="deck-controls/)?.[0] ?? '';
const slidesOf = (html) => deckOf(html).split(/<section class="slide[ "]/).slice(1).map((s) => s.slice(s.indexOf('>') + 1, s.lastIndexOf('</section>')));
const closedDetails = (html) => html.replace(/<details[\s\S]*?<\/details>/g, ' ');
const NOW = new Date('2026-10-20T00:00:00Z');
const building = (id) => renderBuildingInterior(toggleAccount(createInitialState(), id, true), id, { now: NOW });
const CSS = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

describe('every string the saints and buildings drew before still reaches the page', () => {
  it('old text nodes, screen by screen, are all in the new page', () => {
    const now = Object.fromEntries(screens());
    expect(Object.keys(now).sort()).toEqual(Object.keys(BEFORE).sort());
    for (const [key, old] of Object.entries(BEFORE)) {
      const page = textNodes(now[key]).join(' ');
      for (const t of old) expect(page, `${key}: ${t.slice(0, 80)}`).toContain(t);
    }
  });
});

describe('saints: one saint per slide on phones', () => {
  const html = renderSaints(createInitialState());
  const slides = slidesOf(html);

  it('nine slides in order, each with the name, the quote, and the story behind "Their story"', () => {
    expect(deckOf(html)).toContain('aria-label="Saints"');
    expect(slides).toHaveLength(9);
    SAINT_ORDER.forEach((id, i) => {
      const s = SAINTS[id];
      const slide = slides[i];
      expect(slide).toContain(`data-saint-card="${id}"`);
      expect(norm(slide)).toContain(norm(s.name));
      expect(norm(slide)).toContain(norm(s.tribute));
      const story = slide.match(/<details class="saint-story" data-fold="saint-story-[a-z]+" data-open-desktop><summary>Their story<\/summary>([\s\S]*)<\/details>/)?.[1] ?? '';
      expect(norm(story), id).toContain(norm(s.story.replace(/&/g, '&amp;')));
      expect(story).toContain(s.sources[0].url);
      // The candle stays on the slide, outside the story.
      expect(closedDetails(slide)).toContain('data-action="light-candle"');
    });
  });

  it('a slide shows at most 35 words of body with the story folded (the candle is a control)', () => {
    for (const s of slides) expect(countWords(closedDetails(s).replace(/<button[\s\S]*?<\/button>/g, ' ')), norm(s).slice(0, 60)).toBeLessThanOrEqual(35);
  });

  it("the dots are the saints' names", () => {
    const names = [...html.matchAll(/data-deck-to="\d" aria-label="([^"]*)"/g)].map((m) => m[1]);
    expect(names).toEqual(SAINT_ORDER.map((id) => SAINTS[id].name));
  });

  it('desktop: the story shows in full, the summary hidden (as the briefing does)', () => {
    const block = CSS.slice(CSS.indexOf('/* interiors slides: start */'), CSS.indexOf('/* interiors slides: end */'));
    // Open from 900px by script (data-open-desktop, tests/open-desktop.test.js); the summary is hidden there.
    expect(block).toMatch(/@media \(min-width: 900px\)[\s\S]*\.saint-story > summary[^{]*\{[^}]*display: none/);
    expect(block).not.toContain('::details-content');
  });
});

describe('the records desk is a table on phones', () => {
  it('gmail: who asks, with what, judge needed, one row per lane, full slip behind a details', () => {
    const html = building('gmail');
    const table = html.match(/<table class="desk-table"[\s\S]*?<\/table>/)?.[0] ?? '';
    expect(table).not.toBe('');
    expect(table).toMatch(/<th scope="col">Who asks<\/th><th scope="col">With what<\/th><th scope="col">Judge needed\?<\/th>/);
    const lanes = getInterior('gmail').desk;
    const rows = table.split('<tbody').slice(1);
    expect(rows).toHaveLength(lanes.length);
    lanes.forEach((lane, i) => {
      const r = rows[i];
      const cells = [...r.matchAll(/<t[hd][^>]*class="desk-cell[^"]*"[^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => norm(m[1]));
      expect(cells.slice(0, 3), lane.id).toEqual([norm(lane.actor), norm(lane.tool.replace(/&/g, '&amp;')), judgeCell(lane)]);
      const more = r.match(/<details class="desk-more" data-fold="desk-gmail-[a-z0-9-]+"><summary>The full slip<\/summary>([\s\S]*)<\/details>/)?.[1] ?? '';
      expect(norm(more)).toContain(norm(lane.gets));
      if (lane.actorNote) expect(norm(more)).toContain(norm(lane.actorNote));
      for (const s of lane.sources) expect(more).toContain(s.url.replace(/&/g, '&amp;'));
    });
  });

  it("the judge column quotes the slip: each part a verbatim piece of the lane's own text, hedges and all", () => {
    const gmail = Object.fromEntries(getInterior('gmail').desk.map((l) => [l.id, judgeCell(l)]));
    expect(gmail).toEqual({
      'local-police': 'A 2703(d) court order · police need a search warrant signed by a judge · An emergency request needs no judge at all',
      fbi: 'Everything on the police slip · National Security Letters: subscriber records with no judge involved',
      'nsa-702': 'No warrant is needed for each one · the court-approved certifications',
      'ice-hsi': 'A subpoena signed by an agency official, not a judge',
      'uk-cloud-act': 'may answer without a US court being involved',
    });
    const proton = Object.fromEntries(getInterior('protonmail').desk.map((l) => [l.id, judgeCell(l)]));
    expect(proton).toEqual({ 'swiss-order': 'Subject lines aren’t end-to-end encrypted, and Proton says reaching them takes an order approved by a Swiss judge', 'foreign-via-swiss': '—' });
    // The attributions stay: Yahoo lists it, Meta requires it.
    expect(getInterior('yahoo').desk.map(judgeCell).join(' · ')).toContain('Yahoo lists a search warrant, signed by a judge');
    // Every desk in the game: a cell is a dash, or every part of it is in the slip word for word.
    let parts = 0;
    for (const i of Object.values(INTERIORS)) {
      for (const lane of i.desk) {
        const cell = judgeCell(lane);
        if (cell === '—') continue;
        for (const part of cell.split(' · ')) {
          expect(lane.gets, `${i.accountId}/${lane.id}: ${part}`).toContain(part);
          parts += 1;
        }
        expect(cell, `${i.accountId}/${lane.id}`).not.toMatch(/(^|· )(yes|no)($| ·)/i);
      }
    }
    expect(parts).toBeGreaterThan(20);
  });

  it("Signal's single lane stays a sticky note; no table", () => {
    const html = building('signal');
    expect(html).toContain('desk--note');
    expect(html).not.toContain('desk-table');
  });

  it('phones see the table, desktop the slips', () => {
    const block = CSS.slice(CSS.indexOf('/* interiors slides: start */'), CSS.indexOf('/* interiors slides: end */'));
    expect(block).toMatch(/@media \(max-width: 899px\)[^@]*\.desk--tabled[^{]*\{[^}]*display: none/);
    expect(block).toMatch(/@media \(min-width: 900px\)[^@]*\.desk-table[^{]*\{[^}]*display: none/);
    expect(building('gmail')).toContain('class="desk desk--tabled"');
  });
});

describe('the ground floor: one line per entry, opening on tap', () => {
  it('each entry is a details whose summary is its title; the paragraph, advice and sources are inside', () => {
    for (const i of Object.values(INTERIORS)) {
      const html = building(i.accountId);
      for (const e of i.entries) {
        const block = html.match(new RegExp(`<div class="entry[^"]*" data-entry="${e.id}"[\\s\\S]*?<!-- /entry -->`))?.[0] ?? '';
        const m = block.match(/<details class="entry-fold" data-fold="entry-[a-z_]+-[a-z-]+" data-open-desktop><summary class="entry-line">([\s\S]*?)<\/summary>([\s\S]*)<\/details>/);
        expect(m, `${i.accountId}/${e.id}`).toBeTruthy();
        const [, line, inside] = m;
        expect(countWords(line), `${i.accountId}/${e.id}: ${norm(line)}`).toBeLessThanOrEqual(8);
        expect(line).toMatch(/role="img" aria-label="(Sealed|Open|Beyond your control|Not checked yet)"/);
        expect(norm(inside)).toContain(norm(e.how));
        for (const s of e.sources) expect(inside).toContain(s.url.replace(/&/g, '&amp;'));
        for (const a of e.actor.split(' · ')) expect(norm(inside)).toContain(norm(a));
      }
    }
  });

  it('desktop: the entry shows as before, its one-line summary hidden', () => {
    const block = CSS.slice(CSS.indexOf('/* interiors slides: start */'), CSS.indexOf('/* interiors slides: end */'));
    expect(block).toMatch(/@media \(min-width: 900px\)[\s\S]*\.entry-fold > summary[^{]*\{[^}]*display: none/);
    expect(block).not.toContain('::details-content');
    expect(block).not.toMatch(/white-space:\s*nowrap/);
    for (const w of block.match(/(?<![-\w])width:\s*(\d+)px/g) || []) expect(parseInt(w.split(':')[1], 10)).toBeLessThanOrEqual(360);
  });
});
