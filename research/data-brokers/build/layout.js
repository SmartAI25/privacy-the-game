// CLI + library: build src/data/broker-layout.json, the fixed star coordinates for the Broker
// Constellation map, so phones draw the map without running a simulation.
// Run: npm run brokers:layout (after brokers:export). Deterministic: same input, byte-identical output.
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFile, readdir, writeFile } from 'node:fs/promises';

export const FORMAT_VERSION = 1;
const SIZE = 1000;
const C = SIZE / 2;
const RIM = 470; // buyers
const INNER = 330; // linked non-buyers
const OUTER_MIN = 350; // unlinked non-buyers fill 350..440
const OUTER_SPAN = 90;
const GOLDEN = 2.39996;
const SEED = 20261018;
const ITERATIONS = 400;
const T_START = 60;
const T_END = 0.5;
const HUB_GAP = 140;
const PUSH_PASSES = 200;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const round1 = (n) => Math.round(n * 10) / 10 + 0; // + 0 turns -0 into 0

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const starRadius = (reach, known) => 2 + 2.2 * Math.log2(reach) + (known ? 1 : 0);

function clamp(p, max) {
  const dx = p.x - C, dy = p.y - C;
  const d = Math.hypot(dx, dy);
  if (d > max) { p.x = C + (dx / d) * max; p.y = C + (dy / d) * max; }
}

export function computeLayout(map, sizeKnown) {
  const brokers = [...map.brokers].sort((a, b) => cmp(a.id, b.id));
  const isBuyer = (b) => b.kind.includes('buyer');
  const linkedIds = new Set(map.links.flatMap((l) => [l.from, l.to]));
  const pos = new Map();

  // Buyers on the rim, evenly spaced in id order from -90deg.
  const buyers = brokers.filter(isBuyer);
  buyers.forEach((b, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / buyers.length;
    pos.set(b.id, { x: C + RIM * Math.cos(a), y: C + RIM * Math.sin(a) });
  });

  // Unlinked non-buyers in the outer annulus (sunflower spiral, id order).
  const unlinked = brokers.filter((b) => !isBuyer(b) && !linkedIds.has(b.id));
  unlinked.forEach((b, i) => {
    const a = i * GOLDEN;
    const r = OUTER_MIN + OUTER_SPAN * Math.sqrt((i + 0.5) / unlinked.length);
    pos.set(b.id, { x: C + r * Math.cos(a), y: C + r * Math.sin(a) });
  });

  // Linked non-buyers by Fruchterman-Reingold inside INNER, buyers as fixed anchors.
  const movers = brokers.filter((b) => !isBuyer(b) && linkedIds.has(b.id));
  const rand = mulberry32(SEED);
  for (const b of movers) {
    const a = 2 * Math.PI * rand();
    const r = INNER * Math.sqrt(rand());
    pos.set(b.id, { x: C + r * Math.cos(a), y: C + r * Math.sin(a) });
  }
  const moving = new Set(movers.map((b) => b.id));
  const edgeKeys = new Set();
  const edges = [];
  for (const l of map.links) {
    if (l.from === l.to) continue;
    const [u, v] = cmp(l.from, l.to) < 0 ? [l.from, l.to] : [l.to, l.from];
    const key = `${u}\u0000${v}`;
    if (edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    edges.push([u, v]);
  }
  edges.sort((a, b) => cmp(a[0], b[0]) || cmp(a[1], b[1]));

  const n = movers.length;
  if (n > 0) {
    const k = Math.sqrt((Math.PI * INNER * INNER) / n);
    const k2 = k * k;
    for (let it = 0; it < ITERATIONS; it++) {
      const t = ITERATIONS === 1 ? T_END : T_START + ((T_END - T_START) * it) / (ITERATIONS - 1);
      const disp = new Map(movers.map((b) => [b.id, { x: 0, y: 0 }]));
      for (let i = 0; i < n; i++) {
        const p = pos.get(movers[i].id);
        for (let j = i + 1; j < n; j++) {
          const q = pos.get(movers[j].id);
          let dx = p.x - q.x, dy = p.y - q.y;
          let d = Math.hypot(dx, dy);
          if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }
          const f = k2 / d;
          const di = disp.get(movers[i].id), dj = disp.get(movers[j].id);
          di.x += (dx / d) * f; di.y += (dy / d) * f;
          dj.x -= (dx / d) * f; dj.y -= (dy / d) * f;
        }
      }
      for (const [u, v] of edges) {
        const p = pos.get(u), q = pos.get(v);
        const dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.hypot(dx, dy);
        if (d < 0.01) continue;
        const f = (d * d) / k;
        if (moving.has(u)) { const du = disp.get(u); du.x -= (dx / d) * f; du.y -= (dy / d) * f; }
        if (moving.has(v)) { const dv = disp.get(v); dv.x += (dx / d) * f; dv.y += (dy / d) * f; }
      }
      for (const b of movers) {
        const p = pos.get(b.id), dv = disp.get(b.id);
        const len = Math.hypot(dv.x, dv.y);
        if (len > 0) {
          const step = Math.min(len, t);
          p.x += (dv.x / len) * step; p.y += (dv.y / len) * step;
        }
        clamp(p, INNER);
      }
    }

    // Spread the hubs: no two closer than HUB_GAP.
    const hubs = movers.filter((b) => b.hub).map((b) => pos.get(b.id));
    for (let pass = 0; pass < PUSH_PASSES; pass++) {
      let moved = false;
      for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
          const p = hubs[i], q = hubs[j];
          let dx = q.x - p.x, dy = q.y - p.y;
          let d = Math.hypot(dx, dy);
          if (d >= HUB_GAP) continue;
          if (d < 0.01) { dx = 1; dy = 0; d = 1; }
          const push = (HUB_GAP - d) / 2 + 0.05;
          p.x -= (dx / d) * push; p.y -= (dy / d) * push;
          q.x += (dx / d) * push; q.y += (dy / d) * push;
          clamp(p, INNER); clamp(q, INNER);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  const stars = brokers.map((b) => {
    const p = pos.get(b.id);
    return [b.id, round1(p.x), round1(p.y), round1(starRadius(b.reach, sizeKnown.has(b.id)))];
  });
  return { formatVersion: FORMAT_VERSION, asOf: map.asOf, size: SIZE, stars };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const mapPath = resolve(dir, '../../src/data/broker-map.json');
  const outPath = resolve(dir, '../../src/data/broker-layout.json');
  const map = JSON.parse(await readFile(mapPath, 'utf8'));
  const sizeKnown = new Set();
  for (const f of (await readdir(join(dir, 'brokers'))).filter((x) => x.endsWith('.json'))) {
    const b = JSON.parse(await readFile(join(dir, 'brokers', f), 'utf8'));
    if (b.size?.known === true) sizeKnown.add(b.id);
  }
  const text = JSON.stringify(computeLayout(map, sizeKnown));
  await writeFile(outPath, text);
  console.log(`wrote ${outPath}: ${map.brokers.length} stars, ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB (${Buffer.byteLength(text)} bytes)`);
}
