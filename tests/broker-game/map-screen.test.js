import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderBrokerMap } from '../../src/screens/broker-map.js';
import { renderDistrict } from '../../src/screens/district.js';
import { RECHECK_OPACITY } from '../../src/components/constellation.js';
import { brokerLighting } from '../../src/utils/broker-lighting.js';
import { whatsLeft, litIds, initialView, withRatio, zoomViewBox } from '../../src/utils/broker-view.js';
import { markMapSeen, newlyLitIds, cleanBrokerState, setResidency } from '../../src/utils/broker-state.js';
import { BROKER_MAP_DIALOGUE } from '../../src/data/dialogue.js';
import { isPrivateBreadcrumb } from '../../src/utils/errorNoise.js';
import { DISTRICTS } from '../../src/data/districts.js';
import { createInitialState } from '../../src/state.js';

const map = JSON.parse(readFileSync('src/data/broker-map.json', 'utf8'));
const layout = JSON.parse(readFileSync('src/data/broker-layout.json', 'utf8'));
const data = { map, layout };
const T = '2026-10-19';
const WF = 'people_search-fortify-web-forms';
const STRAG = 'people_search-reclaim-stragglers';

beforeEach(() => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
});

const fresh = () => createInitialState();
const draw = (state, opts = {}) => renderBrokerMap(state, { status: 'ready', data, today: T, ...opts });
const withLines = (state, missionId, lines) => ({ ...state, brokerFiled: { ...(state.brokerFiled ?? {}), [missionId]: { lines, since: '2026-10-01' } } });
const filedState = () => withLines(fresh(), WF, { spokeo: '2026-10-01', whitepages: '2026-10-01' });
const countNew = (html) => (html.match(/class="star star--lit star--new"/g) ?? []).length;

describe('the map screen', () => {
  const html = draw(fresh());

  it('a new player sees 0% and 0/12', () => expect(html).toContain('FIELD COVERED: 0% · HUBS LIT 0/12'));
  it('labels the number as an estimate', () => expect(html).toContain('estimated share of the field your opt-outs reach'));
  it('has the back link and the SVG', () => {
    expect(html).toContain('href="#/district/reclamation"');
    expect(html).toContain('← THE RECLAMATION');
    expect(html).toContain('<svg class="constellation"');
  });

  it('the legend shows every mark, re-check due as dimmed amber', () => {
    for (const t of ['You filed', 'Re-check due', 'No opt-out exists', 'Not yet', 'Credit frozen (still sells data)', 'Opted out in this browser only', 'Buyers']) expect(html).toContain(t);
    const legend = html.slice(html.indexOf('class="map-legend"'));
    expect(legend).toMatch(new RegExp(`fill="#FF9F00" fill-opacity="${RECHECK_OPACITY}"`));
  });

  it('zoom buttons are real buttons, with a reset', () => {
    expect(html).toContain('data-action="map-zoom" data-dir="in"');
    expect(html).toContain('data-action="map-zoom" data-dir="out"');
    expect(html).toContain('data-action="map-zoom" data-dir="reset"');
    expect(html).toMatch(/\.constellation-zoom\{[^}]*min-width:44px[^}]*min-height:44px/);
  });

  it('draws at the stage size it is given, with that many px per unit', () => {
    const view = { x: 100, y: 100, w: 300, h: 600 };
    const h = draw(fresh(), { view, stage: { w: 343, h: 686 } });
    expect(h).toContain('viewBox="100 100 300 600"');
    expect(h).toContain('height:686px');
    // A hub label is 12 CSS px: 12 / (343 / 300) map units.
    expect(h).toMatch(/class="hub-label"[^>]*font-size="10\.5"/);
  });

  it('asks residency once, with three answers', () => {
    const res = html.slice(html.indexOf('<div class="residency"'));
    expect(res).toContain('Do you live in California?');
    for (const [v, label] of [['yes', 'Yes'], ['no', 'No'], ['unsaid', 'Rather not say']]) {
      expect(res).toMatch(new RegExp(`data-action="set-residency" data-value="${v}"[^>]*>${label}<`));
    }
    expect(res).not.toContain('change-residency');
  });

  it('an answered residency shows the answer and CHANGE', () => {
    for (const [v, label] of [['yes', 'Yes'], ['no', 'No'], ['unsaid', 'Rather not say']]) {
      const h = draw(setResidency(fresh(), v));
      expect(h).toContain(`California resident: ${label}`);
      expect(h).toContain('data-action="change-residency"');
      expect(h).toContain('CHANGE');
      expect(h).not.toContain('Do you live in California?');
    }
    const editing = draw(setResidency(fresh(), 'no'), { editingResidency: true });
    expect(editing).toContain('data-action="set-residency" data-value="yes"');
  });

  it.each([['no'], ['unsaid']])('DROP explains why it lights nothing for %s', (v) => {
    const h = draw(setResidency(withLines(fresh(), STRAG, { drop: '2026-10-01' }), v));
    expect(h).toContain("DROP is only for California residents, so it doesn't light anything for you. Your other opt-outs still do.");
    expect(BROKER_MAP_DIALOGUE.dropNotResident).toBe("DROP is only for California residents, so it doesn't light anything for you. Your other opt-outs still do.");
  });

  it('DROP reads lit, ask and off', () => {
    const dropped = withLines(fresh(), STRAG, { drop: '2026-10-01' });
    expect(draw(setResidency(dropped, 'yes'))).toContain('DROP: filed. It lights the brokers registered in California.');
    expect(draw(dropped)).toContain('DROP: filed. Tell the map whether you live in California to light it.');
    expect(html).toContain('DROP: not filed yet.');
    expect(html).toContain('href="#/mission/people_search-reclaim-stragglers/briefing"');
  });

  it('the pending nudge links each pending mission\'s re-check', () => {
    const s = { ...fresh(), missions: { [WF]: { status: 'completed', optout_result: 'some-submitted', completedAt: '2026-10-01T12:00:00.000Z' } } };
    const h = draw(s);
    expect(h).toContain(BROKER_MAP_DIALOGUE.nudge);
    expect(BROKER_MAP_DIALOGUE.nudge).toBe('Tell Scout which ones you filed.');
    expect(h).toContain('href="#/mission/people_search-fortify-web-forms/recheck"');
    expect(h).not.toContain('/debrief"');
    expect(html).not.toContain(BROKER_MAP_DIALOGUE.nudge);
  });

  it('whatsLeft on a new save is the top five by reach', () => {
    expect(whatsLeft(map, brokerLighting(map, {}, T)).map((r) => r.id)).toEqual(['transunion', 'experian', 'relx-plc', 'general-motors', 'equifax']);
  });

  it('whatsLeft rows carry a non-recon mission or none, and skip lit stars', () => {
    const rows = whatsLeft(map, brokerLighting(map, {}, T), 900);
    for (const r of rows) {
      const b = map.brokers.find((x) => x.id === r.id);
      expect(r.mission).toBe(b.missions.find((m) => !m.includes('-recon-')) ?? null);
      expect(b.optOut?.method).not.toBe('none');
      expect(b.kind).not.toContain('buyer');
    }
    const l = brokerLighting(map, filedState(), T);
    expect(whatsLeft(map, l, 900).map((r) => r.id)).not.toContain('spokeo');
  });

  it('what\'s left lists name · reach and a briefing link or the no-mission line', () => {
    expect(html).toContain("WHAT'S LEFT THAT MATTERS");
    expect(html).toContain('TransUnion · reach 18');
    expect(html).toContain('No mission covers this one yet');
    const s = { ...fresh() };
    const withMission = whatsLeft(map, brokerLighting(map, s, T), 900).find((r) => r.mission);
    expect(withMission).toBeTruthy();
  });

  it('first visit blooms every lit star; the next visit blooms none', () => {
    let s = filedState();
    const l = brokerLighting(map, s, T);
    const lit = litIds(l);
    expect(lit).toEqual(['spokeo', 'whitepages']);
    const first = newlyLitIds(s, lit);
    expect([...first].sort()).toEqual(lit);
    expect(countNew(draw(s, { newlyLit: first }))).toBe(2);
    s = markMapSeen(s, lit);
    expect(s.brokerMap.seenLit).toEqual(['spokeo', 'whitepages']);
    expect([...newlyLitIds(s, lit)]).toEqual([]);
    expect(countNew(draw(s, { newlyLit: newlyLitIds(s, lit) }))).toBe(0);
    // A newly lit star blooms alone.
    const more = withLines(s, STRAG, { mylife: '2026-10-02' });
    expect([...newlyLitIds(more, litIds(brokerLighting(map, more, T)))]).toEqual(['mylife']);
  });

  it('markMapSeen sorts, and a broken brokerMap starts fresh', () => {
    expect(markMapSeen({ brokerMap: 'x' }, ['b', 'a']).brokerMap).toEqual({ seenLit: ['a', 'b'] });
    expect(markMapSeen({ brokerMap: { seenLit: ['z'], other: 1 } }, ['b']).brokerMap).toEqual({ seenLit: ['b'], other: 1 });
    expect(cleanBrokerState({ brokerMap: [] })).toEqual({});
    expect(cleanBrokerState({ brokerMap: { seenLit: 'x' } })).toEqual({ brokerMap: {} });
    expect(cleanBrokerState({ brokerMap: { seenLit: ['a', 3] } })).toEqual({ brokerMap: { seenLit: ['a'] } });
    const ok = { brokerMap: { seenLit: ['a'] } };
    expect(cleanBrokerState(ok)).toBe(ok);
    expect([...newlyLitIds({ brokerMap: 'x' }, ['a'])]).toEqual(['a']);
  });

  it('the first visit gets Scout\'s constellation line; later visits do not', () => {
    expect(draw(fresh(), { firstVisit: true })).toContain("There's a whole constellation of data brokers");
    expect(html).not.toContain("There's a whole constellation of data brokers");
  });

  it('the bloom only runs without reduced motion', () => {
    const h = draw(filedState(), { newlyLit: new Set(['spokeo']) });
    const css = h.match(/<style>([\s\S]*?)<\/style>/g).join('');
    const motion = css.indexOf('@media (prefers-reduced-motion: no-preference)');
    expect(motion).toBeGreaterThan(-1);
    for (const m of css.matchAll(/\.star--new[^{]*\{/g)) expect(m.index).toBeGreaterThan(motion);
    expect(css.slice(0, motion)).not.toMatch(/animation\s*:/);
  });

  it('a list view reaches every hub and lit star by keyboard', () => {
    const closed = draw(filedState());
    expect(closed).toContain('data-action="map-list"');
    expect(closed).toContain('aria-expanded="false"');
    const open = draw(filedState(), { listOpen: true });
    expect(open).toContain('aria-expanded="true"');
    const items = [...open.matchAll(/<button type="button" class="constellation-star"[^>]*data-action="select-star" data-star="(\d+)"/g)].map((m) => layout.stars[Number(m[1])][0]);
    for (const id of ['spokeo', 'whitepages', 'transunion', 'experian']) expect(items).toContain(id);
    expect(items).toHaveLength(14);
  });

  it('a selected star is named under the map', () => {
    const h = draw(fresh(), { selectedId: 'spokeo' });
    expect(h).toMatch(/class="constellation-pick"[^>]*aria-live="polite"[^>]*>[^<]*Spokeo/);
  });

  it('no broker id goes in an id, name or title attribute', () => {
    const h = draw(filedState(), { selectedId: 'spokeo', listOpen: true });
    const ids = new Set(map.brokers.map((b) => b.id));
    for (const m of h.matchAll(/\s(id|name|title)="([^"]*)"/g)) {
      for (const tok of m[2].split(/\s+/)) expect(ids.has(tok)).toBe(false);
    }
    expect(h).not.toMatch(/href="#\/reclamation\/map[^"]/);
  });

  it('map, list and residency clicks never become breadcrumbs', () => {
    for (const m of ['svg.constellation', 'button.constellation-zoom', 'button.constellation-star', 'div.residency > button.btn', 'button.residency-btn', 'button.constellation-list'])
      expect(isPrivateBreadcrumb({ category: 'ui.click', message: m })).toBe(true);
    expect(html).toMatch(/class="[^"]*constellation-zoom/);
    expect(html).toMatch(/class="[^"]*residency-btn/);
  });
});

describe('the opening view', () => {
  it('opens zoomed in around the player\'s lit stars', () => {
    const l = brokerLighting(map, filedState(), T);
    const v = initialView(map, layout, l, 2);
    expect(v.w).toBeLessThan(600);
    expect(v.h).toBeCloseTo(v.w * 2);
    const pos = Object.fromEntries(layout.stars.map((s) => [s[0], s]));
    for (const id of ['spokeo', 'whitepages']) {
      const [, x, y] = pos[id];
      expect(x).toBeGreaterThanOrEqual(v.x);
      expect(x).toBeLessThanOrEqual(v.x + v.w);
      expect(y).toBeGreaterThanOrEqual(v.y);
      expect(y).toBeLessThanOrEqual(v.y + v.h);
    }
  });

  it('lit stars spread across the sky open on their tightest bunch, still zoomed in', () => {
    const lines = { spokeo: '2026-10-01', whitepages: '2026-10-01', beenverified: '2026-10-01' };
    const s = withLines(withLines(fresh(), WF, lines), STRAG, { mylife: '2026-10-02', nuwber: '2026-10-02' });
    const v = initialView(map, layout, brokerLighting(map, s, T), 2);
    expect(v.w).toBeLessThanOrEqual(600);
    const pos = Object.fromEntries(layout.stars.map((x) => [x[0], x]));
    const shown = ['whitepages', 'mylife'].filter((id) => pos[id][1] >= v.x && pos[id][1] <= v.x + v.w && pos[id][2] >= v.y && pos[id][2] <= v.y + v.h);
    expect(shown).toEqual(['whitepages', 'mylife']);
  });

  it('with nothing lit, opens on the densest hub cluster', () => {
    const v = initialView(map, layout, brokerLighting(map, {}, T), 1);
    expect(v.w).toBeLessThan(500);
    expect(v.h).toBe(v.w);
    const inView = layout.stars.filter(([, x, y]) => x >= v.x && x <= v.x + v.w && y >= v.y && y <= v.y + v.h);
    expect(inView.some(([id]) => map.brokers.find((b) => b.id === id)?.hub)).toBe(true);
  });

  it('withRatio keeps the centre and width; zoomViewBox keeps the ratio', () => {
    const v = withRatio({ x: 100, y: 100, w: 200 }, 2);
    expect(v).toEqual({ x: 100, y: 0, w: 200, h: 400 });
    const z = zoomViewBox(v, 2, 200, 200);
    expect(z.h / z.w).toBeCloseTo(2);
    expect(z.w).toBe(100);
    const out = zoomViewBox({ x: 0, y: 0, w: 1000, h: 2000 }, 0.5, 500, 500);
    expect(out).toEqual({ x: 0, y: -500, w: 1000, h: 2000 });
  });
});

describe('the way in', () => {
  const reclamation = renderDistrict(fresh(), 'reclamation');

  it('the way in sits on The Reclamation\'s facility screen', () => {
    const at = reclamation.indexOf('href="#/reclamation/map"');
    expect(at).toBeGreaterThan(reclamation.indexOf('DISTRICT FACILITIES'));
    expect(at).toBeLessThan(reclamation.indexOf('Welcome to The Reclamation'));
    expect(at).toBeLessThan(reclamation.indexOf('class="panel" style="margin: 0 16px; overflow: hidden;"'));
    expect(reclamation).toContain('LOOK UP');
    expect(reclamation).toContain('Your data drifted up out of the city. Go find it.');
  });

  it('only The Reclamation links to the map', () => {
    for (const d of DISTRICTS) {
      if (d.id === 'reclamation') continue;
      expect(renderDistrict(fresh(), d.id)).not.toContain('#/reclamation/map');
    }
  });
});
