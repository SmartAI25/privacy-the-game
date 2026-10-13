// The city's lights: rainbow LED halos, chasing rings, searchlights, string
// lights, fireworks, the plaza fountain and the aurora. Markup only; which
// tier shows comes from utils/lights.js. CSS only, no new sprites; motion is
// transform/opacity/filter so it stays on the compositor, and the map's
// reduced-motion rule stops all of it (colours stay).

const RAINBOW = ['#ff3b6b', '#ff9f1c', '#ffe14d', '#4dff88', '#2de2ff', '#6c7bff', '#c64dff'];
const RAINBOW_STOPS = [...RAINBOW, RAINBOW[0]].join(', ');

// A firework is one 3px dot whose box-shadows are the sparks: two rings, the
// inner one offset half a step, every spark its own colour.
const SPARKS = (() => {
  const out = [];
  const ring = (n, r, offset, size) => {
    for (let i = 0; i < n; i += 1) {
      const a = ((i + offset) / n) * Math.PI * 2;
      const hue = Math.round(((i + offset) / n) * 360);
      out.push(`${(Math.cos(a) * r).toFixed(1)}px ${(Math.sin(a) * r).toFixed(1)}px 0 ${size}px hsl(${hue} 100% 66%)`);
    }
  };
  ring(16, 24, 0, 1);
  ring(10, 13, 0.5, 0.5);
  return out.join(', ');
})();

export const LIGHTS_STYLE = `
  <style>
    @property --lt-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
    @keyframes ltHue { from { filter: hue-rotate(0deg); } to { filter: hue-rotate(360deg); } }
    @keyframes ltSpin { to { --lt-a: 360deg; } }
    @keyframes ltWindow { 0%, 100% { opacity: 0.95; } 40% { opacity: 0.55; } 46% { opacity: 1; } 70% { opacity: 0.75; } }
    @keyframes ltSweep { 0%, 100% { transform: rotate(-28deg); } 50% { transform: rotate(28deg); } }
    @keyframes ltSweepWide { 0%, 100% { transform: rotate(-38deg); } 50% { transform: rotate(38deg); } }
    @keyframes ltBulb { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.6); } }
    @keyframes ltFirework {
      0% { transform: translateY(70px) scale(0.05); opacity: 0; }
      4% { opacity: 1; }
      30% { transform: translateY(0) scale(0.05); opacity: 1; }
      44% { transform: translateY(0) scale(var(--fs, 1)); opacity: 1; }
      80% { opacity: 0.85; }
      100% { transform: translateY(14px) scale(calc(var(--fs, 1) * 1.2)); opacity: 0; }
    }
    @keyframes ltRipple { from { transform: scale(0.15); opacity: 1; } to { transform: scale(1.7); opacity: 0; } }
    @keyframes ltJet { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(-90px) scale(0.3); opacity: 0; } }
    @keyframes ltColumn { 0%, 100% { transform: scaleX(1); opacity: 0.75; } 50% { transform: scaleX(1.6); opacity: 1; } }
    @keyframes ltAurora { 0%, 100% { transform: translateX(-6%) skewX(-12deg) scaleY(1); } 50% { transform: translateX(6%) skewX(10deg) scaleY(1.25); } }
    @keyframes ltTwinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* ---------- a district ---------- */
    .lt-window { position: absolute; width: 4px; height: 3px; margin-left: -2px; z-index: 4; pointer-events: none;
      background: #ffe9a8; box-shadow: 0 0 4px #ffd36b, 0 0 9px rgba(255,190,90,0.6); animation: ltWindow 3.4s ease-in-out infinite; }
    /* Rainbow LED halo: silhouettes of the buildings behind them, glowing, the glow cycling through the spectrum. */
    .lt-halo { position: absolute; inset: 0; z-index: 0; pointer-events: none; animation: ltHue 6s linear infinite; }
    .lt-halo img { position: absolute; display: block; height: auto;
      filter: brightness(0) drop-shadow(0 0 1.5px #ff3355) drop-shadow(0 0 5px #ff3355) drop-shadow(0 0 14px rgba(255,51,85,0.55)); }
    /* A rainbow that chases round the lot's edge. */
    .lt-ring { position: absolute; inset: -6px -10px; z-index: 0; pointer-events: none;
      clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%, 50% 0, 50% 4px, 7px 50%, 50% calc(100% - 4px), calc(100% - 7px) 50%, 50% 4px);
      background: conic-gradient(from var(--lt-a), ${RAINBOW_STOPS}); animation: ltSpin 3s linear infinite; filter: drop-shadow(0 0 4px #fff); }
    .lt-ring::after { content: ''; position: absolute; inset: 0; background: inherit; filter: blur(6px); opacity: 0.8; }
    .city-cluster.lt-2 .city-beacon, .city-cluster.lt-3 .city-beacon, .city-cluster.lt-4 .city-beacon, .city-cluster.lt-5 .city-beacon { animation-duration: 1.6s; }
    .lt-rainbow-beacon { position: absolute; width: 9px; height: 9px; margin: -2px 0 0 -4.5px; border-radius: 50%; z-index: 6; pointer-events: none;
      background: #ff3b6b; box-shadow: 0 0 8px #ff3b6b, 0 0 20px #ff3b6b, 0 0 36px rgba(255,59,107,0.6); animation: ltHue 2.4s linear infinite; }
    /* Searchlight: a cone of light from the tower, sweeping, cycling colour. */
    .lt-beam { position: absolute; width: 34px; height: 260px; margin-left: -17px; z-index: 5; pointer-events: none; transform-origin: 50% 100%;
      animation: ltSweep 7s ease-in-out infinite; }
    .lt-beam::before { content: ''; position: absolute; inset: 0; clip-path: polygon(46% 100%, 54% 100%, 100% 0, 0 0);
      background: linear-gradient(0deg, rgba(255,80,140,0.75), rgba(255,80,140,0.18) 55%, transparent);
      animation: ltHue 5s linear infinite; }
    .lt-bulb { position: absolute; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 50%; pointer-events: none;
      background: hsl(var(--h) 100% 65%); box-shadow: 0 0 5px hsl(var(--h) 100% 60%), 0 0 10px hsl(var(--h) 100% 55% / 0.6);
      animation: ltBulb 1.4s ease-in-out infinite; }
    .lt-fw { position: absolute; width: 3px; height: 3px; margin: -1.5px 0 0 -1.5px; border-radius: 50%; pointer-events: none; z-index: 7;
      background: #fff; box-shadow: ${SPARKS}; opacity: 0; animation: ltFirework 3.4s cubic-bezier(.2,.7,.3,1) infinite; }

    /* ---------- the whole city ---------- */
    .lt-fountain { position: absolute; width: 0; height: 0; z-index: 25; pointer-events: none; }
    .lt-ripple { position: absolute; left: -60px; top: -30px; width: 120px; height: 60px; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%, 50% 0, 50% 3px, 4px 50%, 50% calc(100% - 3px), calc(100% - 4px) 50%, 50% 3px);
      background: conic-gradient(from 0deg, ${RAINBOW_STOPS}); animation: ltRipple 2.7s ease-out infinite; }
    .lt-jet { position: absolute; width: 5px; height: 5px; margin: -2.5px 0 0 -2.5px; border-radius: 50%;
      background: hsl(var(--h) 100% 70%); box-shadow: 0 0 8px hsl(var(--h) 100% 60%); animation: ltJet 1.8s ease-out infinite; }
    .lt-column { position: absolute; width: 16px; height: 420px; margin-left: -8px; z-index: 19; pointer-events: none; transform-origin: 50% 100%;
      background: linear-gradient(0deg, rgba(255,255,255,0.65), transparent), linear-gradient(90deg, transparent, ${RAINBOW_STOPS}, transparent);
      -webkit-mask-image: linear-gradient(0deg, #000 30%, transparent); mask-image: linear-gradient(0deg, #000 30%, transparent);
      animation: ltColumn 2.6s ease-in-out infinite; }
    .lt-sky-beam { position: absolute; width: 70px; height: 560px; margin-left: -35px; z-index: 19; pointer-events: none; transform-origin: 50% 100%;
      animation: ltSweepWide 11s ease-in-out infinite; }
    .lt-sky-beam::before { content: ''; position: absolute; inset: 0; clip-path: polygon(47% 100%, 53% 100%, 100% 0, 0 0);
      background: linear-gradient(0deg, rgba(60,200,255,0.5), rgba(60,200,255,0.1) 60%, transparent); animation: ltHue 9s linear infinite; }
    .lt-city-2 .city-stream { animation-name: cityStream, ltHue; }
    .lt-city-2 .city-stream--cyan, .lt-city-2 .city-stream--lime { background: linear-gradient(180deg, transparent, rgba(255,59,107,0.5) 60%, #ff3b6b); box-shadow: 0 0 8px #ff3b6b; }
    .lt-city-3 .city-horizon { height: 2px; background: linear-gradient(90deg, transparent, ${RAINBOW_STOPS}, transparent); animation: ltHue 4s linear infinite; }
    .lt-city-3 .city-floor { animation: ltHue 14s linear infinite; }
    .lt-city-4 .city-stars { animation: ltTwinkle 2.2s ease-in-out infinite; }
    .lt-aurora { position: absolute; left: -10%; right: -10%; top: 40px; height: 220px; z-index: 0; pointer-events: none; opacity: 0.55;
      -webkit-mask-image: linear-gradient(180deg, transparent, #000 30%, #000 60%, transparent); mask-image: linear-gradient(180deg, transparent, #000 30%, #000 60%, transparent); }
    .lt-aurora i { position: absolute; left: 0; right: 0; height: 70px; border-radius: 50%; filter: blur(18px);
      background: linear-gradient(90deg, transparent, ${RAINBOW_STOPS}, transparent); animation: ltAurora 9s ease-in-out infinite; }
    .lt-aurora i:nth-child(1) { top: 30px; }
    .lt-aurora i:nth-child(2) { top: 80px; opacity: 0.7; animation-duration: 13s; animation-direction: reverse; }
    .lt-aurora i:nth-child(3) { top: 120px; opacity: 0.45; animation-duration: 17s; }
    .lt-aurora-hue { position: absolute; inset: 0; animation: ltHue 20s linear infinite; }

    /* ---------- the pods ---------- */
    .city-pod .lt-halo img { filter: brightness(0) drop-shadow(0 0 1.5px #ff3355) drop-shadow(0 0 6px #ff3355); }

    @media (prefers-reduced-motion: reduce) {
      .city-wide *, .city-wide *::before, .city-wide *::after { animation: none !important; }
      .lt-fw, .lt-jet, .lt-ripple { display: none; }
    }
  </style>`;

const px = (n) => `${n.toFixed(1)}px`;

// Same placement as the buildings themselves, so the glow hugs their outline.
function halo(placed, srcs, delay) {
  const imgs = placed.map((p, i) => (srcs[i]
    ? `<img src="assets/${srcs[i]}" alt="" style="left: ${px(p.left)}; bottom: ${p.bottom}px; width: ${px(p.w)};">`
    : '')).join('');
  return `<span class="lt-halo" style="animation-delay: ${delay}s;">${imgs}</span>`;
}

export function firework(x, y, { delay = 0, hue = 0, scale = 1, z } = {}) {
  const style = [`left: ${px(x)}`, `top: ${px(y)}`, `animation-delay: ${delay.toFixed(2)}s`];
  if (hue) style.push(`filter: hue-rotate(${hue}deg)`);
  if (scale !== 1) style.push(`--fs: ${scale}`);
  if (z !== undefined) style.push(`z-index: ${z}`);
  return `<span class="lt-fw" style="${style.join('; ')};"></span>`;
}

// Bulbs strung round a lot box (w x h, its ground diamond), back edges behind
// the buildings, front edges in front of them.
function stringLights(w, h, perEdge, delay) {
  const corners = [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
  const out = [];
  let n = 0;
  const total = perEdge * 4;
  for (let e = 0; e < 4; e += 1) {
    const [x0, y0] = corners[e];
    const [x1, y1] = corners[(e + 1) % 4];
    const front = e === 1 || e === 2; // right->bottom->left are nearest the camera
    for (let i = 0; i < perEdge; i += 1) {
      const t = (i + 0.5) / perEdge;
      // A little sag between posts, like a real string.
      const sag = Math.sin(t * Math.PI) * 3;
      const hue = Math.round((n / total) * 360);
      out.push(`<span class="lt-bulb" style="left: ${px(x0 + (x1 - x0) * t)}; top: ${px(y0 + (y1 - y0) * t + sag)}; --h: ${hue}; z-index: ${front ? 6 : 0}; animation-delay: ${(delay + n * 0.09).toFixed(2)}s;"></span>`);
      n += 1;
    }
  }
  return out.join('');
}

const WINDOW_SPOTS = [[-0.18, 0.5], [0.16, 0.62], [-0.06, 0.36], [0.22, 0.42]];

// One district's lights. `box` is its lot box size; `placed` the buildings as
// drawn, `srcs` their sprites; `tower` the tower's placement; `peak` the top of
// the tallest roof (box y).
export function districtLightsMarkup({ tier, windows }, { box, placed, srcs, tower, peak, index }) {
  if (!tier) return '';
  const delay = -(index * 0.7);
  const parts = [];
  if (tier === 1) {
    for (let k = 0; k < windows; k += 1) {
      const p = placed[k % placed.length];
      const [fx, fy] = WINDOW_SPOTS[k];
      parts.push(`<span class="lt-window" style="left: ${px(p.cx + fx * p.w)}; top: ${px(p.top + fy * p.h)}; animation-delay: ${(delay - k * 0.8).toFixed(2)}s;"></span>`);
    }
    return parts.join('');
  }
  parts.push(halo(placed, srcs, delay));
  parts.push(`<span class="lt-ring" style="animation-delay: ${delay}s;"></span>`);
  if (tier >= 3) {
    parts.push(`<span class="lt-rainbow-beacon" style="left: ${px(tower.cx)}; top: ${px(tower.top + 3)}; animation-delay: ${delay}s;"></span>`);
    parts.push(`<span class="lt-beam" style="left: ${px(tower.cx)}; top: ${px(tower.top + 3 - 260)}; animation-delay: ${(delay * 1.3).toFixed(2)}s;"></span>`);
  }
  if (tier >= 4) parts.push(stringLights(box.w, box.h, 7, delay));
  if (tier >= 5) {
    const cx = box.w / 2;
    parts.push(firework(cx - 26, peak - 34, { delay: delay - 0.2, hue: (index * 47) % 360 }));
    parts.push(firework(cx + 30, peak - 52, { delay: delay - 1.4, hue: (index * 47 + 120) % 360 }));
    parts.push(firework(cx + 2, peak - 70, { delay: delay - 2.5, hue: (index * 47 + 240) % 360, scale: 1.3 }));
  }
  return parts.join('');
}

// A pod's lights: the halo only round its lit buildings (`litSrcs` holds a
// sprite for each lit building, null for dark ones).
export function podLightsMarkup(tier, { box, placed, litSrcs, tower, peak, yours, index }) {
  const parts = [];
  const delay = -(index * 0.9);
  if (tier >= 1) parts.push(halo(placed, litSrcs, delay));
  if (tier >= 2) parts.push(`<span class="lt-ring" style="animation-delay: ${delay}s;"></span>`);
  if (yours && tower) parts.push(`<span class="lt-beam" style="left: ${px(tower.cx)}; top: ${px(tower.top - 260)}; animation-delay: ${delay}s;"></span>`);
  if (tier >= 3) {
    parts.push(firework(box.w / 2 - 14, peak - 30, { delay: delay - 0.6, hue: (index * 71) % 360 }));
    parts.push(firework(box.w / 2 + 18, peak - 48, { delay: delay - 2.1, hue: (index * 71 + 180) % 360 }));
  }
  return parts.join('');
}

// The plaza and sky, by city stage. `plaza` is the plaza's iso-space centre.
// Returns markup for inside .city-iso and for the sky behind the skyline.
export function cityLightsMarkup(stage, plaza) {
  if (!stage) return { iso: '', sky: '' };
  const iso = [];
  const sky = [];
  const { x, y } = plaza;
  const ripples = [0, -0.9, -1.8].map((d) => `<span class="lt-ripple" style="animation-delay: ${d}s;"></span>`).join('');
  const jets = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return `<span class="lt-jet" style="left: ${px(Math.cos(a) * 9)}; top: ${px(Math.sin(a) * 4.5)}; --h: ${i * 36}; animation-delay: ${(-i * 0.18).toFixed(2)}s;"></span>`;
  }).join('');
  iso.push(`<span class="lt-fountain" style="left: ${px(x)}; top: ${px(y)};">${ripples}${jets}</span>`);
  if (stage >= 2) iso.push(`<span class="lt-column" style="left: ${px(x)}; top: ${px(y - 420)};"></span>`);
  if (stage >= 3) {
    iso.push(`<span class="lt-sky-beam" style="left: ${px(x - 60)}; top: ${px(y - 560)};"></span>`);
    iso.push(`<span class="lt-sky-beam" style="left: ${px(x + 60)}; top: ${px(y - 560)}; animation-delay: -5.5s;"></span>`);
  }
  if (stage >= 4) {
    sky.push('<div class="lt-aurora"><div class="lt-aurora-hue"><i></i><i></i><i></i></div></div>');
    const bursts = [[-150, -250, 0], [130, -280, -1.1], [-20, -330, -2.0], [220, -210, -2.7], [-250, -200, -0.5]];
    for (const [dx, dy, d] of bursts) iso.push(firework(x + dx, y + dy, { delay: d, hue: (dx + 400) % 360, scale: 1.6, z: 60 }));
  }
  return { iso: iso.join(''), sky: sky.join('') };
}
