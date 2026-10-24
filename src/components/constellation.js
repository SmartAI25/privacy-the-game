// The Broker Constellation, drawn as one SVG string. Pure: (map, layout, lighting) in, markup out.
//
// Kept lean for ~900 stars on a phone: no per-star filters, only a few shared gradients in <defs>,
// and every animation is CSS inside a no-preference motion query (colours stay, motion stops).
// No href, no <a>, and no broker id in any attribute: ids stay in the layout arrays the app reads.

import { isBuyer } from '../utils/broker-lighting.js';
import { shortName } from '../utils/broker-view.js';

// Fill opacity of an amber (re-check due) star. It still counts in full; it just draws dimmer.
export const RECHECK_OPACITY = 0.55;

const LIME = '#C6FF00';
const AMBER = '#FF9F00';
const MAGENTA = '#FF2D9B';
const DIM = '#3a4256';
const CYAN = '#00E5FF';
const BUYER = '#8a93a6';
const PALE = '#EDEFF3';
const MIDNIGHT = '#090B10';
const CHARCOAL = '#1A1F2B';

// Sizes when the caller does not say how wide the SVG is drawn (user units of the 1000-unit map).
const LABEL_SIZE = 22;
const LABEL_GAP = 6;
// Sizes in CSS px when it does (`px`), so they hold steady as the viewBox zooms.
const LABEL_PX = 12;
const STAR_LABEL_PX = 10;
const MIN_STAR_PX = 1.6;
export const HIT_PX = 22; // tap radius: a 44px target round every star, whatever its drawn size
// Non-hub stars get names once the map is zoomed to at least this many CSS px per map unit.
export const STAR_LABEL_SCALE = 1.8;
const ASSUMED_PX = 343; // a 375px phone less 16px gutters, for hit radii when `px` is not given
const LABEL_WRAP = 20;
const BLOOM_STEP_MS = 60;
const BLOOM_WAVE = 20;

const n = (v) => String(Math.round(v * 100) / 100);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `<style>
.constellation{display:block;width:100%;height:auto;background:radial-gradient(ellipse at 50% 45%,#121826 0%,${MIDNIGHT} 70%);border-radius:8px}
.constellation .skyline,.constellation .sky,.constellation .links,.constellation .stars,.constellation .rings,.constellation .effects,.constellation .labels{pointer-events:none}
.constellation .link{stroke:${CYAN};stroke-width:1.4}
.constellation .link,.constellation .star-x,.constellation .buyer,.constellation .ring-frozen,.constellation .selected,.constellation .burst{vector-effect:non-scaling-stroke}
.constellation .hub-label,.constellation .star-label{font-family:'JetBrains Mono',ui-monospace,monospace;paint-order:stroke;stroke:${MIDNIGHT};stroke-linejoin:round;letter-spacing:.5px}
.constellation .hub-label{font-weight:700}
.constellation .star-hit{cursor:pointer;-webkit-tap-highlight-color:transparent}
.constellation .burst{opacity:0}
@media (prefers-reduced-motion: no-preference){
.constellation .star--new,.constellation .glow,.constellation .burst,.constellation .selected{transform-box:fill-box;transform-origin:center}
@keyframes rc-bloom{0%{transform:scale(0);opacity:0}55%{transform:scale(2.4);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes rc-glow-in{0%{opacity:0;transform:scale(.2)}50%{opacity:1;transform:scale(1.8)}100%{opacity:1;transform:scale(1)}}
@keyframes rc-burst{0%{opacity:.9;transform:scale(.4)}100%{opacity:0;transform:scale(6)}}
@keyframes rc-twinkle{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes rc-select{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.15)}}
.constellation .star--new{animation:rc-bloom 900ms cubic-bezier(.2,.8,.3,1) both}
.constellation .glow--new{animation:rc-glow-in 1200ms ease-out both}
.constellation .burst{animation:rc-burst 1100ms ease-out both}
.constellation .glow--hub{animation:rc-twinkle 4.2s ease-in-out infinite}
.constellation .selected{animation:rc-select 1.6s ease-in-out infinite}
}
</style>`;

const DEFS = `<defs>
<linearGradient id="rc-sky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000"><stop offset="0" stop-color="${MIDNIGHT}"/><stop offset=".55" stop-color="#0d1220"/><stop offset="1" stop-color="${CHARCOAL}"/></linearGradient>
<linearGradient id="rc-city" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a26"/><stop offset="1" stop-color="${MIDNIGHT}"/></linearGradient>
<radialGradient id="rc-glow"><stop offset="0" stop-color="${LIME}" stop-opacity=".6"/><stop offset=".35" stop-color="${LIME}" stop-opacity=".18"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></radialGradient>
<radialGradient id="rc-neb"><stop offset="0" stop-color="${CYAN}" stop-opacity=".13"/><stop offset=".5" stop-color="${CYAN}" stop-opacity=".04"/><stop offset="1" stop-color="${CYAN}" stop-opacity="0"/></radialGradient>
<radialGradient id="rc-neb-lit"><stop offset="0" stop-color="${LIME}" stop-opacity=".16"/><stop offset=".5" stop-color="${CYAN}" stop-opacity=".05"/><stop offset="1" stop-color="${CYAN}" stop-opacity="0"/></radialGradient>
</defs>`;

// Reclaim City along the bottom of whatever is in view: the player is looking up from it.
// Built once, deterministically, in a 1000-wide local frame (y up from 0 to -SKYLINE_MAX):
// one path for the buildings and one for their lit windows.
const SKYLINE_MAX = 64;
const SKYLINE = (() => {
  let seed = 20261019;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  let d = 'M0 0';
  let win = '';
  let x = 0;
  while (x < 1000) {
    const w = Math.min(1000 - x, 14 + Math.floor(rnd() * 30));
    const tall = rnd() < 0.12;
    const h = Math.round(tall ? 42 + rnd() * 22 : 12 + rnd() * 26);
    d += `L${x} ${-h}`;
    if (tall && rnd() < 0.7) { const m = x + Math.round(w / 2); d += `L${m - 1} ${-h}L${m - 1} ${-h - 10}L${m + 1} ${-h - 10}L${m + 1} ${-h}`; }
    d += `L${x + w} ${-h}`;
    for (let wy = h - 6; wy > 4; wy -= 7) for (let wx = x + 3; wx < x + w - 4; wx += 6) if (rnd() < 0.18) win += `M${wx} ${-wy}h2v2h-2z`;
    x += w;
  }
  return { body: `${d}L1000 0Z`, windows: win };
})();

// A long name goes on two lines, split at the space nearest its middle.
function wrapLabel(text) {
  if (text.length <= LABEL_WRAP) return [text];
  let best = -1;
  for (let i = text.indexOf(' '); i !== -1; i = text.indexOf(' ', i + 1)) {
    if (best === -1 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2)) best = i;
  }
  return best === -1 ? [text] : [text.slice(0, best), text.slice(best + 1)];
}

function labelBody(lines, x) {
  if (lines.length === 1) return esc(lines[0]);
  return lines.map((t, i) => `<tspan x="${n(x)}" dy="${i === 0 ? '-0.5em' : '1.1em'}">${esc(t)}</tspan>`).join('');
}

function starState(broker, lighting) {
  if (isBuyer(broker)) return 'buyer';
  const s = lighting?.stars?.[broker.id]?.state;
  if (s === 'lit' || s === 'amber' || s === 'no-opt-out') return s;
  if (s === undefined && broker?.optOut?.method === 'none') return 'no-opt-out';
  return 'dim';
}

export function constellationSvg({ map, layout, lighting, selectedId = null, newlyLit = new Set(), view = { x: 0, y: 0, w: 1000 }, px = null }) {
  const vx = Number.isFinite(view?.x) ? view.x : 0;
  const vy = Number.isFinite(view?.y) ? view.y : 0;
  const vw = Number.isFinite(view?.w) && view.w > 0 ? view.w : 1000;
  // CSS px per map unit, when the caller knows how wide the SVG is drawn.
  const scale = Number.isFinite(px) && px > 0 ? px / vw : null;
  const hitR = HIT_PX / (scale ?? ASSUMED_PX / vw);
  const labelSize = scale ? LABEL_PX / scale : LABEL_SIZE;
  const labelGap = scale ? LABEL_GAP * (labelSize / LABEL_SIZE) : LABEL_GAP;
  const minR = scale ? MIN_STAR_PX / scale : 0;
  const nameStars = scale !== null && scale >= STAR_LABEL_SCALE;

  const byId = new Map();
  for (const b of Array.isArray(map?.brokers) ? map.brokers : []) if (b && typeof b.id === 'string') byId.set(b.id, b);

  // Drawn stars: in the layout and in the map, in layout order. `index` is the star's place in
  // layout.stars, the only handle the hit layer carries.
  const stars = [];
  const pos = new Map();
  const laid = Array.isArray(layout?.stars) ? layout.stars : [];
  laid.forEach((s, index) => {
    if (!Array.isArray(s)) return;
    const [id, x, y, r0] = s;
    const broker = byId.get(id);
    if (!broker || pos.has(id) || ![x, y, r0].every(Number.isFinite)) return;
    const st = { id, index, x, y, r: Math.max(r0, minR), broker, state: starState(broker, lighting) };
    stars.push(st);
    pos.set(id, st);
  });

  // Newly lit stars bloom in waves, in id order.
  const blooming = [...(newlyLit instanceof Set ? newlyLit : new Set(newlyLit ?? []))]
    .filter((id) => pos.get(id)?.state === 'lit')
    .sort();
  const delay = new Map(blooming.map((id, i) => [id, (i % BLOOM_WAVE) * BLOOM_STEP_MS]));

  const sky = [];
  const links = [];
  const glows = [];
  const marks = [];
  const rings = [];
  const halos = [];
  const effects = [];
  const labels = [];
  const hits = [];

  for (const l of Array.isArray(map?.links) ? map.links : []) {
    const a = pos.get(l?.from);
    const b = pos.get(l?.to);
    if (!a || !b) continue;
    const count = Array.isArray(l.sources) ? l.sources.length : 0;
    const op = Math.min(0.6, 0.15 * (1 + count));
    const dash = l.tier === 'C' ? ' stroke-dasharray="6 5"' : '';
    links.push(`<line class="link" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" opacity="${n(op)}"${dash}/>`);
  }

  const size = Number.isFinite(layout?.size) ? layout.size : 1000;
  const inView = (s) => s.x >= vx && s.x <= vx + vw && s.y >= vy && s.y <= vy + vw;
  const label = (s, cls, fontSize, fill) => {
    const { x, y, r } = s;
    const gap = scale ? (fontSize / labelSize) * labelGap : labelGap;
    const lines = wrapLabel(shortName(s.broker.name ?? ''));
    const width = Math.max(...lines.map((t) => t.length)) * fontSize * 0.6;
    // Right of the star; flipped left only where the name would run out of view and there is more room on the left.
    const right = x + r + gap;
    const roomRight = Math.min(size, vx + vw) - right;
    const roomLeft = x - r - gap - Math.max(0, vx);
    const flip = width > roomRight && roomLeft > roomRight;
    const lx = flip ? x - r - gap : right;
    const anchor = flip ? ' text-anchor="end"' : '';
    return `<text class="${cls}" x="${n(lx)}" y="${n(y + fontSize * 0.35)}" font-size="${n(fontSize)}" stroke-width="${n(fontSize * 0.28)}" fill="${fill}"${anchor}>${labelBody(lines, lx)}</text>`;
  };

  let lit = 0;
  let amber = 0;
  let none = 0;
  for (const s of stars) {
    const { x, y, r, state } = s;
    const cx = n(x);
    const cy = n(y);
    const hub = s.broker.hub === true;
    const d = delay.get(s.id);
    const anim = d === undefined ? '' : ` style="animation-delay:${d}ms"`;

    if (hub) sky.push(`<circle class="nebula" cx="${cx}" cy="${cy}" r="${n(70 + r * 6)}" fill="url(#${state === 'lit' || state === 'amber' ? 'rc-neb-lit' : 'rc-neb'})"/>`);

    if (state === 'buyer') {
      marks.push(`<rect class="buyer" x="${n(x - r)}" y="${n(y - r)}" width="${n(2 * r)}" height="${n(2 * r)}" fill="none" stroke="${BUYER}" stroke-width="1.2" transform="rotate(45 ${cx} ${cy})"/>`);
    } else if (state === 'no-opt-out') {
      none += 1;
      const k = r + 1;
      marks.push(`<path class="star-x" d="M${n(x - k)} ${n(y - k)}L${n(x + k)} ${n(y + k)}M${n(x + k)} ${n(y - k)}L${n(x - k)} ${n(y + k)}" stroke="${MAGENTA}" stroke-width="1.8" stroke-linecap="round" fill="none"/>`);
    } else if (state === 'lit') {
      lit += 1;
      const g = hub ? ' glow--hub' : '';
      const gn = d === undefined ? '' : ' glow--new';
      glows.push(`<circle class="glow${g}${gn}" cx="${cx}" cy="${cy}" r="${n(Math.max(7, r * 3.2))}" fill="url(#rc-glow)"${anim}/>`);
      marks.push(`<circle class="star star--lit${d === undefined ? '' : ' star--new'}" cx="${cx}" cy="${cy}" r="${n(r)}" fill="${LIME}"${anim}/>`);
      if (d !== undefined) effects.push(`<circle class="burst" cx="${cx}" cy="${cy}" r="${n(r + 2)}" fill="none" stroke="${LIME}" stroke-width="1"${anim}/>`);
    } else if (state === 'amber') {
      amber += 1;
      marks.push(`<circle class="star star--amber" cx="${cx}" cy="${cy}" r="${n(r)}" fill="${AMBER}" fill-opacity="${RECHECK_OPACITY}"/>`);
    } else {
      marks.push(`<circle class="star star--dim" cx="${cx}" cy="${cy}" r="${n(r)}" fill="${DIM}"/>`);
    }

    if (hub) labels.push(label(s, 'hub-label', labelSize, state === 'lit' ? LIME : PALE));
    else if (nameStars && inView(s)) labels.push(label(s, 'star-label', STAR_LABEL_PX / scale, state === 'lit' ? LIME : BUYER));

    hits.push(`<circle class="star-hit" cx="${cx}" cy="${cy}" r="${n(Math.max(hitR, r))}" data-star="${s.index}" fill="transparent" pointer-events="all"/>`);
  }

  const frozen = new Set(Array.isArray(lighting?.frozen) ? lighting.frozen : []);
  const halo = new Set(Array.isArray(lighting?.halo) ? lighting.halo : []);
  for (const s of stars) {
    if (frozen.has(s.id)) rings.push(`<circle class="ring-frozen" cx="${n(s.x)}" cy="${n(s.y)}" r="${n(s.r + 3)}" fill="none" stroke="${CYAN}" stroke-width="1.2" stroke-dasharray="2 2"/>`);
  }
  for (const s of stars) {
    if (halo.has(s.id)) halos.push(`<circle class="halo" cx="${n(s.x)}" cy="${n(s.y)}" r="${n(s.r + 4)}" fill="${PALE}" opacity="0.12"/>`);
  }

  const sel = selectedId === null ? null : pos.get(selectedId);
  if (sel) effects.push(`<circle class="selected" cx="${n(sel.x)}" cy="${n(sel.y)}" r="${n(sel.r + 6)}" fill="none" stroke="${PALE}" stroke-width="1.5"/>`);

  const aria = `Map of data brokers: ${stars.length} companies, ${lit + amber} lit by your opt-outs (${amber} due for a re-check), ${none} with no opt-out`;

  // Hit circles sit on top and overlap in the dense crowd; the app resolves a tap with
  // nearestStar (broker-view.js) on the tap point, not with whichever circle is uppermost.
  return `<svg class="constellation" viewBox="${n(vx)} ${n(vy)} ${n(vw)} ${n(vw)}" role="img" aria-label="${esc(aria)}" xmlns="http://www.w3.org/2000/svg">${STYLE}${DEFS}`
    + `<g class="sky"><rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#rc-sky)"/>${sky.join('')}</g>`
    + `<g class="links">${links.join('')}</g>`
    + `<g class="stars">${glows.join('')}${marks.join('')}</g>`
    + `<g class="rings">${rings.join('')}${halos.join('')}</g>`
    + `<g class="effects">${effects.join('')}</g>`
    + `<g class="skyline" transform="translate(${n(vx)} ${n(vy + vw)}) scale(${n(vw / 1000)})"><path d="${SKYLINE.body}" fill="url(#rc-city)" stroke="${CYAN}" stroke-opacity=".35" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="${SKYLINE.windows}" fill="${LIME}" opacity=".55"/></g>`
    + `<g class="labels">${labels.join('')}</g>`
    + `<g class="hits">${hits.join('')}</g>`
    + '</svg>';
}
