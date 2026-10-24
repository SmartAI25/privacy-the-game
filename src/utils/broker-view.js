// Small display helpers for the Broker Constellation. Pure; nothing here is tracked or put in a URL.

// One trailing legal suffix (with the comma before it), or a bare trailing comma, comes off once.
const SUFFIX = /,?\s+(?:Inc\.|Inc|LLC|L\.L\.C\.|Ltd|plc|PLC|Corp|Corporation|Company|Co\.)$/;

export function shortName(name) {
  const s = String(name ?? '').trim();
  if (SUFFIX.test(s)) return s.replace(SUFFIX, '').trim();
  return s.endsWith(',') ? s.slice(0, -1).trim() : s;
}

// The layout index of the star whose centre is nearest (x, y), within maxDist map units, or -1.
// Hit circles overlap in the dense crowd, so a tap resolves here rather than to the uppermost one.
export function nearestStar(layout, x, y, maxDist = Infinity) {
  const stars = Array.isArray(layout?.stars) ? layout.stars : [];
  let best = -1;
  let bestD = maxDist * maxDist;
  for (let i = 0; i < stars.length; i += 1) {
    const s = stars[i];
    if (!Array.isArray(s) || !Number.isFinite(s[1]) || !Number.isFinite(s[2])) continue;
    const d = (s[1] - x) ** 2 + (s[2] - y) ** 2;
    if (d <= bestD && (best === -1 || d < bestD)) {
      best = i;
      bestD = d;
    }
  }
  return best;
}

// Zoom a viewBox { x, y, w } (square) or { x, y, w, h } by `factor` (>1 zooms in) about the map
// point (cx, cy), which stays put on screen. The width is held to [minW, maxW], the h:w ratio is
// kept, and the box is kept on the map (a side longer than the map is centred on it).
export function zoomViewBox(viewBox, factor, cx, cy, bounds = {}) {
  const size = Number.isFinite(bounds.size) ? bounds.size : 1000;
  const minW = Number.isFinite(bounds.minW) ? bounds.minW : 100;
  const maxW = Number.isFinite(bounds.maxW) ? bounds.maxW : size;
  const x = Number.isFinite(viewBox?.x) ? viewBox.x : 0;
  const y = Number.isFinite(viewBox?.y) ? viewBox.y : 0;
  const w = Number.isFinite(viewBox?.w) && viewBox.w > 0 ? viewBox.w : size;
  const h = Number.isFinite(viewBox?.h) && viewBox.h > 0 ? viewBox.h : null;
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const px = Number.isFinite(cx) ? cx : x + w / 2;
  const py = Number.isFinite(cy) ? cy : y + (h ?? w) / 2;
  const nw = Math.min(maxW, Math.max(minW, w / f));
  const k = nw / w;
  const nh = h === null ? nw : h * k;
  const clamp = (v, side) => (side >= size ? (size - side) / 2 : Math.min(size - side, Math.max(0, v)));
  const out = { x: clamp(px - (px - x) * k, nw), y: clamp(py - (py - y) * k, nh), w: nw };
  if (h !== null) out.h = nh;
  return out;
}

// The same view drawn into a box `ratio` times as tall as it is wide: same centre, same width.
export function withRatio(view, ratio) {
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const w = Number.isFinite(view?.w) && view.w > 0 ? view.w : 1000;
  const cx = (Number.isFinite(view?.x) ? view.x : 0) + w / 2;
  const cy = (Number.isFinite(view?.y) ? view.y : 0) + (Number.isFinite(view?.h) ? view.h : w) / 2;
  return zoomViewBox({ x: cx - w / 2, y: cy - (w * r) / 2, w, h: w * r }, 1, cx, cy);
}

const isLit = (s) => s === 'lit' || s === 'amber';

// Ids of every star the player's opt-outs light (re-check due included), sorted.
export function litIds(lighting) {
  const stars = lighting?.stars && typeof lighting.stars === 'object' ? lighting.stars : {};
  return Object.keys(stars).filter((id) => isLit(stars[id]?.state)).sort();
}

const OPEN_W = 330; // the opening width with nothing lit: about one hub and its cluster
const OPEN_MIN_W = 260;
const OPEN_MAX_W = 600;
const CLUSTER_R = 90;
const LIT_R = 180;

// Where the map opens: zoomed in around the player's lit stars, or else on the densest hub cluster.
// `ratio` is the drawn box's height over its width.
export function initialView(map, layout, lighting, ratio = 1) {
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  const stars = (Array.isArray(layout?.stars) ? layout.stars : []).filter((s) => Array.isArray(s) && Number.isFinite(s[1]) && Number.isFinite(s[2]));
  const lit = new Set(litIds(lighting));
  const on = stars.filter((s) => lit.has(s[0]));
  let cx;
  let cy;
  let w;
  const fit = (pts) => {
    const xs = pts.map((s) => s[1]);
    const ys = pts.map((s) => s[2]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const span = Math.max(x1 - x0, (y1 - y0) / r);
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, span, w: Math.max(OPEN_MIN_W, span * 1.25 + 80) };
  };
  if (on.length) {
    let f = fit(on);
    // Spread across the sky: open on the tightest bunch of them instead (the most lit stars
    // within LIT_R of one lit star, ties by id), still zoomed in. RESET and − show the rest.
    if (f.w > OPEN_MAX_W) {
      let best = null;
      for (const c of on) {
        const near = on.filter((s) => (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2 <= LIT_R ** 2);
        if (!best || near.length > best.length || (near.length === best.length && c[0] < best.c[0])) best = Object.assign(near, { c });
      }
      f = fit(best);
    }
    ({ cx, cy } = f);
    w = Math.min(OPEN_MAX_W, f.w);
  } else {
    const hubIds = new Set((Array.isArray(map?.brokers) ? map.brokers : []).filter((b) => b?.hub === true).map((b) => b.id));
    const reach = new Map((map?.brokers ?? []).map((b) => [b.id, Number.isFinite(b.reach) ? b.reach : 0]));
    let best = null;
    for (const h of stars) {
      if (!hubIds.has(h[0])) continue;
      const count = stars.filter((s) => (s[1] - h[1]) ** 2 + (s[2] - h[2]) ** 2 <= CLUSTER_R ** 2).length;
      const key = [count, reach.get(h[0]) ?? 0];
      if (!best || key[0] > best.key[0] || (key[0] === best.key[0] && (key[1] > best.key[1] || (key[1] === best.key[1] && h[0] < best.s[0])))) best = { s: h, key };
    }
    [cx, cy] = best ? [best.s[1], best.s[2]] : [500, 500];
    w = OPEN_W;
  }
  w = Math.min(1000, w);
  return zoomViewBox({ x: cx - w / 2, y: cy - (w * r) / 2, w, h: w * r }, 1, cx, cy);
}

const kinds = (b) => (Array.isArray(b?.kind) ? b.kind : []);

// The biggest reachable stars still dark: not a buyer, an opt-out exists, not lit. By reach, then id.
export function whatsLeft(map, lighting, n = 5) {
  const brokers = (Array.isArray(map?.brokers) ? map.brokers : []).filter((b) => b && typeof b.id === 'string');
  return brokers
    .filter((b) => !kinds(b).includes('buyer') && b.optOut?.method !== 'none' && !isLit(lighting?.stars?.[b.id]?.state))
    .map((b) => ({
      id: b.id,
      name: String(b.name ?? b.id),
      reach: Number.isFinite(b.reach) ? b.reach : 0,
      mission: (Array.isArray(b.missions) ? b.missions : []).find((m) => typeof m === 'string' && !m.includes('-recon-')) ?? null,
    }))
    .sort((a, b) => b.reach - a.reach || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, n);
}
