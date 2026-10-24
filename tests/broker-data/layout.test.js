import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeLayout, KIND_NAMES } from '../../research/data-brokers/build/layout.js';

const root = join(import.meta.dirname, '../..');
const map = JSON.parse(readFileSync(join(root, 'src/data/broker-map.json'), 'utf8'));
const brokerDir = join(root, 'research/data-brokers/brokers');
const sizeKnown = new Set(
  readdirSync(brokerDir).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(brokerDir, f), 'utf8')))
    .filter((b) => b.size?.known === true).map((b) => b.id),
);

const out = computeLayout(map, sizeKnown);
const byId = new Map(out.stars.map((s) => [s[0], s]));
const linked = new Set(map.links.flatMap((l) => [l.from, l.to]));
const isBuyer = (b) => b.kind.includes('buyer');
const dist = ([, x, y]) => Math.hypot(x - 500, y - 500);
const pick = (pred) => map.brokers.filter(pred).map((b) => byId.get(b.id));

describe('computeLayout', () => {
  it('has the documented header', () => {
    expect(out.formatVersion).toBe(1);
    expect(out.size).toBe(1000);
    expect(out.asOf).toBe(map.asOf);
  });

  it('is byte-identical across two runs', () => {
    expect(JSON.stringify(computeLayout(map, sizeKnown))).toBe(JSON.stringify(out));
  });

  it('every broker has exactly one star', () => {
    const ids = out.stars.map((s) => s[0]);
    expect(ids.length).toBe(map.brokers.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(map.brokers.map((b) => b.id).sort());
  });

  it('stars are sorted by id and rounded to one decimal', () => {
    const ids = out.stars.map((s) => s[0]);
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    for (const [, x, y, r] of out.stars) for (const n of [x, y, r]) expect(Math.round(n * 10) / 10).toBe(n);
  });

  it('buyers sit on the rim', () => {
    const buyers = pick(isBuyer);
    expect(buyers.length).toBeGreaterThan(0);
    for (const [, x, y] of buyers) expect(Math.abs(Math.hypot(x - 500, y - 500) - 470)).toBeLessThan(0.6);
  });

  it('the first buyer in id order sits at -90 degrees (top)', () => {
    const first = map.brokers.filter(isBuyer).map((b) => b.id).sort()[0];
    const [, x, y] = byId.get(first);
    expect(x).toBeCloseTo(500, 0);
    expect(y).toBeCloseTo(30, 0);
  });

  describe('the crowd as constellations (Liz 2026-10-24: "a ring instead of like... constellations")', () => {
    const crowd = map.brokers.filter((b) => !isBuyer(b) && !linked.has(b.id));
    const idx = new Map(out.stars.map((s, i) => [s[0], i]));
    const kindOf = new Map(map.brokers.map((b) => [b.id, b.kind[0] ?? '']));

    it('is not a ring: crowd stars spread across the sky, a fifth or more inside r < 330', () => {
      const ds = crowd.map((b) => dist(byId.get(b.id)));
      for (const d of ds) expect(d).toBeLessThanOrEqual(440.5);
      // The old ring had none in here; the centre is mostly hubs and their linked stars.
      expect(ds.filter((d) => d < 330).length / ds.length).toBeGreaterThan(0.2);
    });

    it('no two crowd stars sit closer than the star gap, and none on a hub', () => {
      const hubs = map.brokers.filter((b) => b.hub).map((b) => byId.get(b.id));
      const pts = crowd.map((b) => byId.get(b.id));
      let close = 0;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        if (Math.hypot(pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]) < 8.9) close += 1;
      }
      expect(close).toBe(0);
      for (const p of pts) for (const h of hubs) expect(Math.hypot(p[1] - h[1], p[2] - h[2])).toBeGreaterThanOrEqual(40);
    });

    it('figures join only crowd stars of the same kind, never a pair a documented link joins', () => {
      const linkPairs = new Set(map.links.map((l) => [l.from, l.to].sort().join('|')));
      expect(out.figures.length).toBeGreaterThan(0);
      for (const [i, j] of out.figures) {
        const a = out.stars[i][0], b = out.stars[j][0];
        expect(linked.has(a) || linked.has(b)).toBe(false);
        expect(kindOf.get(a)).toBe(kindOf.get(b));
        expect(linkPairs.has([a, b].sort().join('|'))).toBe(false);
      }
    });

    it('each constellation is a tree: every crowd star is on a figure, with no cycles', () => {
      const parent = new Map();
      const find = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
      for (const b of crowd) parent.set(idx.get(b.id), idx.get(b.id));
      for (const [i, j] of out.figures) {
        const ri = find(i), rj = find(j);
        expect(ri).not.toBe(rj);
        parent.set(ri, rj);
      }
      const roots = new Set(crowd.map((b) => find(idx.get(b.id))));
      // components = constellations; each has at most 13 stars
      const size = new Map();
      for (const b of crowd) { const r = find(idx.get(b.id)); size.set(r, (size.get(r) ?? 0) + 1); }
      for (const n of size.values()) expect(n).toBeLessThanOrEqual(13);
      expect(roots.size).toBe(out.figures.length === 0 ? crowd.length : crowd.length - out.figures.length);
    });

    it('one name per named kind, inside the sky', () => {
      const kinds = new Set(crowd.map((b) => b.kind[0]).filter(Boolean));
      expect(out.names.map((m) => m[0]).sort()).toEqual([...kinds].map((k) => KIND_NAMES[k]).sort());
      for (const [, x, y] of out.names) expect(Math.hypot(x - 500, y - 500)).toBeLessThanOrEqual(460);
    });
  });

  it('linked brokers sit inside 330', () => {
    const inner = pick((b) => !isBuyer(b) && linked.has(b.id));
    expect(inner.length).toBeGreaterThan(0);
    for (const s of inner) expect(dist(s)).toBeLessThanOrEqual(330.1);
  });

  describe('M1: hubs with their crowd as a nebula (controller ruling, mockup A)', () => {
    const hubIds = new Set(map.brokers.filter((b) => b.hub).map((b) => b.id));
    const neighbours = new Map();
    for (const l of map.links) {
      for (const [a, b] of [[l.from, l.to], [l.to, l.from]]) {
        if (!neighbours.has(a)) neighbours.set(a, new Set());
        neighbours.get(a).add(b);
      }
    }
    const linkedNonHubs = map.brokers.filter((b) => !isBuyer(b) && linked.has(b.id) && !b.hub);

    it('a linked non-hub sits near its nearest linked hub (median <= 90)', () => {
      const ds = [];
      for (const b of linkedNonHubs) {
        const hubs = [...neighbours.get(b.id)].filter((id) => hubIds.has(id));
        if (!hubs.length) continue;
        const [, x, y] = byId.get(b.id);
        ds.push(Math.min(...hubs.map((h) => Math.hypot(x - byId.get(h)[1], y - byId.get(h)[2]))));
      }
      expect(ds.length).toBeGreaterThan(10);
      ds.sort((a, b) => a - b);
      expect(ds[Math.floor(ds.length / 2)]).toBeLessThanOrEqual(90);
    });

    it('linked non-hubs do not pile on the r=330 clamp (<= 10% at r >= 315)', () => {
      const edge = linkedNonHubs.filter((b) => dist(byId.get(b.id)) >= 315);
      expect(edge.length / linkedNonHubs.length).toBeLessThanOrEqual(0.1);
    });

  });

  it('no two hubs are closer than 140', () => {
    const hubs = pick((b) => b.hub);
    expect(hubs.length).toBe(12);
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        expect(Math.hypot(hubs[i][1] - hubs[j][1], hubs[i][2] - hubs[j][2])).toBeGreaterThanOrEqual(139.85);
      }
    }
  });

  it('radius follows reach and known size', () => {
    const synth = {
      formatVersion: 1, asOf: '2026-01-01',
      brokers: [
        { id: 'a', reach: 1, hub: false, kind: [], parent: null },
        { id: 'b', reach: 4, hub: false, kind: [], parent: null },
        { id: 'c', reach: 18, hub: true, kind: [], parent: null },
      ],
      links: [{ from: 'c', to: 'b', type: 'owns' }],
    };
    const r = new Map(computeLayout(synth, new Set(['b'])).stars.map((s) => [s[0], s[3]]));
    expect(r.get('a')).toBe(2);
    expect(r.get('b')).toBe(7.4);
    expect(r.get('c')).toBe(11.2);
  });

  it('the committed layout matches the committed map', () => {
    const committed = JSON.parse(readFileSync(join(root, 'src/data/broker-layout.json'), 'utf8'));
    expect(committed.asOf).toBe(map.asOf);
    expect(committed.stars.map((s) => s[0])).toEqual([...map.brokers.map((b) => b.id)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    expect(committed).toEqual(out);
  });
});
