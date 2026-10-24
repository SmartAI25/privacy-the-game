import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { computeLayout } from '../../research/data-brokers/build/layout.js';

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

  it('unlinked brokers sit in the outer annulus', () => {
    const unlinked = pick((b) => !isBuyer(b) && !linked.has(b.id));
    expect(unlinked.length).toBeGreaterThan(0);
    for (const s of unlinked) {
      expect(dist(s)).toBeGreaterThanOrEqual(349.5);
      expect(dist(s)).toBeLessThanOrEqual(440.5);
    }
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

    it('the unlinked crowd is jittered, not a constant-angle spiral', () => {
      const crowd = pick((b) => !isBuyer(b) && !linked.has(b.id));
      const steps = [];
      for (let i = 1; i < crowd.length; i++) {
        const a0 = Math.atan2(crowd[i - 1][2] - 500, crowd[i - 1][1] - 500);
        const a1 = Math.atan2(crowd[i][2] - 500, crowd[i][1] - 500);
        steps.push((((a1 - a0) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI));
      }
      const mean = steps.reduce((s, x) => s + x, 0) / steps.length;
      const sd = Math.sqrt(steps.reduce((s, x) => s + (x - mean) ** 2, 0) / steps.length);
      expect(sd / mean).toBeGreaterThan(0.05);
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
