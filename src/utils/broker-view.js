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

// Zoom a square viewBox { x, y, w } by `factor` (>1 zooms in) about the map point (cx, cy),
// which stays put on screen. The width is held to [minW, maxW] and the box to the map.
export function zoomViewBox(viewBox, factor, cx, cy, bounds = {}) {
  const size = Number.isFinite(bounds.size) ? bounds.size : 1000;
  const minW = Number.isFinite(bounds.minW) ? bounds.minW : 100;
  const maxW = Number.isFinite(bounds.maxW) ? bounds.maxW : size;
  const x = Number.isFinite(viewBox?.x) ? viewBox.x : 0;
  const y = Number.isFinite(viewBox?.y) ? viewBox.y : 0;
  const w = Number.isFinite(viewBox?.w) && viewBox.w > 0 ? viewBox.w : size;
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const px = Number.isFinite(cx) ? cx : x + w / 2;
  const py = Number.isFinite(cy) ? cy : y + w / 2;
  const nw = Math.min(maxW, Math.max(minW, w / f));
  const k = nw / w;
  const clamp = (v) => (nw >= size ? (size - nw) / 2 : Math.min(size - nw, Math.max(0, v)));
  return { x: clamp(px - (px - x) * k), y: clamp(py - (py - y) * k), w: nw };
}
