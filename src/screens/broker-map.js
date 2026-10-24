// The Broker Constellation: the night sky above Reclaim City, where the player's data drifted.
// Pure: (state, data, view) in, markup out. Selection, zoom, the list and residency edits live in
// app.js memory and never reach the URL, an event or a breadcrumb: every control here carries a
// class PRIVATE_UI (errorNoise.js) matches, and no broker id goes in an id, name or title.
import { renderHud } from '../components/hud.js';
import { smallScout } from '../components/scout.js';
import { constellationSvg, RECHECK_OPACITY } from '../components/constellation.js';
import { brokerLighting, fieldCoverage, fieldHeader, isBuyer } from '../utils/broker-lighting.js';
import { whatsLeft, initialView, shortName } from '../utils/broker-view.js';
import { BROKER_MAP_DIALOGUE } from '../data/dialogue.js';
import { MISSIONS } from '../data/missions.js';
import { localDay } from '../state.js';

const BACK = '<a class="back-link" href="#/district/reclamation">← THE RECLAMATION</a>';
const DROP_MISSION = 'people_search-reclaim-stragglers';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `<style>
#app.map-refresh>*{animation:none}
.broker-map{padding:0 16px 24px;max-width:960px;margin:0 auto;box-sizing:border-box}
.broker-map .back-link{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--cyan);text-decoration:none}
.broker-map .map-head{font-family:var(--font-display);font-size:14px;font-weight:800;color:var(--lime);letter-spacing:2px;margin:12px 0 2px;overflow-wrap:anywhere}
.broker-map .map-sub{font-size:12px;color:rgba(237,239,243,0.55);margin:0 0 10px}
.map-scout{display:flex;gap:10px;align-items:flex-start;margin:0 0 10px;padding:8px 10px;background:rgba(26,31,43,0.9);border:1px solid rgba(0,229,255,0.25)}
.map-scout p{margin:0;font-size:12px;line-height:1.5;color:var(--offwhite)}
.map-stage{position:relative;width:100%;height:calc(100svh - 150px);min-height:320px;border-radius:8px;overflow:hidden;background:#090B10}
.map-stage>svg.constellation{width:100%;height:100%;border-radius:8px}
.constellation-controls{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:6px}
.constellation-zoom{min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:20px;font-weight:700;color:var(--offwhite);background:rgba(9,11,16,0.82);border:1px solid rgba(0,229,255,0.35);border-radius:8px;cursor:pointer;padding:0}
.constellation-zoom--reset{font-size:10px;letter-spacing:1px}
.constellation-zoom:focus-visible,.constellation-star:focus-visible,.constellation-list:focus-visible,.residency-btn:focus-visible{outline:2px solid var(--cyan);outline-offset:2px}
.constellation-pick{min-height:22px;margin:8px 0 0;font-family:var(--font-mono);font-size:13px;color:var(--offwhite);overflow-wrap:anywhere}
.constellation-list{min-height:44px;margin-top:6px;padding:0 14px;font-family:var(--font-mono);font-size:11px;letter-spacing:1px;color:var(--cyan);background:transparent;border:1px solid rgba(0,229,255,0.3);cursor:pointer}
.constellation-stars{list-style:none;margin:8px 0 0;padding:0;max-height:50vh;overflow-y:auto}
.constellation-star{display:flex;width:100%;min-height:44px;align-items:center;gap:10px;padding:6px 10px;text-align:left;font-size:13px;color:var(--offwhite);background:rgba(26,31,43,0.5);border:0;border-bottom:1px solid rgba(255,255,255,0.05);cursor:pointer;overflow-wrap:anywhere}
.constellation-star[aria-pressed="true"]{background:rgba(198,255,0,0.08)}
.map-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:14px 0 4px;padding:0;list-style:none;font-size:12px;color:rgba(237,239,243,0.7)}
.map-legend li{display:flex;align-items:center;gap:6px}
.map-panel{margin-top:14px;padding:12px 14px;background:rgba(26,31,43,0.5);border:1px solid rgba(255,255,255,0.06);font-size:13px;line-height:1.6;color:var(--offwhite);overflow-wrap:anywhere}
.map-panel .label{font-family:var(--font-display);font-size:10px;font-weight:700;letter-spacing:2px;color:rgba(0,229,255,0.6);margin-bottom:6px}
.map-panel a{color:var(--cyan)}
.residency-buttons{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.residency-btn{min-height:44px;padding:0 16px}
.map-left{list-style:none;margin:0;padding:0}
.map-left li{padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)}
.map-left .none{display:block;font-size:11px;color:rgba(237,239,243,0.45)}
</style>`;

const swatch = (inner) => `<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${inner}</svg>`;
const LEGEND = [
  [swatch('<circle cx="9" cy="9" r="4" fill="#C6FF00"/>'), 'You filed'],
  [swatch(`<circle cx="9" cy="9" r="4" fill="#FF9F00" fill-opacity="${RECHECK_OPACITY}"/>`), 'Re-check due'],
  [swatch('<path d="M5 5L13 13M13 5L5 13" stroke="#FF2D9B" stroke-width="2" stroke-linecap="round"/>'), 'No opt-out exists'],
  [swatch('<circle cx="9" cy="9" r="4" fill="#3a4256"/>'), 'Not yet'],
  [swatch('<circle cx="9" cy="9" r="3" fill="#3a4256"/><circle cx="9" cy="9" r="6.5" fill="none" stroke="#00E5FF" stroke-width="1.2" stroke-dasharray="2 2"/>'), 'Credit frozen (still sells data)'],
  [swatch('<circle cx="9" cy="9" r="8" fill="#EDEFF3" opacity="0.25"/><circle cx="9" cy="9" r="3" fill="#3a4256"/>'), 'Opted out in this browser only'],
  [swatch('<rect x="5" y="5" width="8" height="8" fill="none" stroke="#8a93a6" stroke-width="1.4" transform="rotate(45 9 9)"/>'), 'Buyers'],
];

// The zoom buttons' corner, in CSS px (44px buttons, 8px inset, gaps): labels keep clear of it.
const CONTROLS = { w: 60, h: 160 };

const RESIDENCY_LABEL = { yes: 'Yes', no: 'No', unsaid: 'Rather not say' };

function residencyBlock(state, editing) {
  const answer = RESIDENCY_LABEL[state.caResident];
  const inner = answer && !editing
    ? `<div>California resident: ${answer}</div><button type="button" class="btn-secondary residency-btn residency-change" data-action="change-residency" style="margin-top: 8px;">CHANGE</button>`
    : `<div>Do you live in California?</div><div class="residency-buttons">${Object.entries(RESIDENCY_LABEL).map(([v, label]) => `<button type="button" class="btn-secondary residency-btn" data-action="set-residency" data-value="${v}">${label}</button>`).join('')}</div>`;
  return `<div class="residency"><div class="map-panel">${inner}</div></div>`;
}

function dropBlock(drop) {
  const text = {
    lit: 'DROP: filed. It lights the brokers registered in California.',
    'not-resident': esc(BROKER_MAP_DIALOGUE.dropNotResident),
    ask: 'DROP: filed. Tell the map whether you live in California to light it.',
  }[drop] ?? `DROP: not filed yet. <a href="#/mission/${DROP_MISSION}/briefing">File it</a>`;
  return `<div class="map-panel map-drop">${text}</div>`;
}

const missionTitle = (id) => MISSIONS.find((m) => m.id === id)?.title ?? id;

function nudgeBlock(pending) {
  if (!pending.length) return '';
  const links = pending.map((id) => `<li><a href="#/mission/${esc(id)}/recheck">${esc(missionTitle(id))}</a></li>`).join('');
  return `<div class="map-panel map-nudge"><div>${esc(BROKER_MAP_DIALOGUE.nudge)}</div><ul style="margin: 6px 0 0; padding-left: 18px;">${links}</ul></div>`;
}

function leftBlock(rows) {
  const items = rows.map((r) => {
    const text = `${esc(r.name)} · reach ${r.reach}`;
    return r.mission
      ? `<li><a href="#/mission/${esc(r.mission)}/briefing">${text}</a></li>`
      : `<li>${text}<span class="none">No mission covers this one yet</span></li>`;
  }).join('');
  return `<div class="map-panel map-whats-left"><div class="label">WHAT'S LEFT THAT MATTERS</div><ul class="map-left">${items}</ul></div>`;
}

const STATE_WORD = { lit: 'You filed', amber: 'Re-check due', dim: 'Not yet', 'no-opt-out': 'No opt-out exists' };

// The keyboard and screen-reader route to stars: the SVG is role="img", so its hit circles are
// invisible to assistive tech. Hubs and every lit star, by reach. data-star is a layout index.
function starList(map, layout, lighting, selectedId, open) {
  const toggle = `<button type="button" class="constellation-list" data-action="map-list" aria-expanded="${open ? 'true' : 'false'}">${open ? 'HIDE LIST' : 'LIST VIEW'}</button>`;
  if (!open) return toggle;
  const byId = new Map(map.brokers.map((b) => [b.id, b]));
  const rows = [];
  layout.stars.forEach((s, index) => {
    const b = byId.get(s?.[0]);
    if (!b || isBuyer(b)) return;
    const st = lighting.stars[b.id]?.state ?? 'dim';
    if (b.hub === true || st === 'lit' || st === 'amber') rows.push({ b, index, st });
  });
  const reach = (b) => (Number.isFinite(b.reach) ? b.reach : 0);
  rows.sort((p, q) => reach(q.b) - reach(p.b) || (p.b.id < q.b.id ? -1 : 1));
  const items = rows.map(({ b, index, st }) => `<li><button type="button" class="constellation-star" data-action="select-star" data-star="${index}" aria-pressed="${b.id === selectedId ? 'true' : 'false'}">${esc(shortName(b.name))} <span style="color: rgba(237,239,243,0.5); font-size: 11px;">· ${STATE_WORD[st] ?? 'Not yet'}</span></button></li>`).join('');
  return `${toggle}<ul class="constellation-stars">${items}</ul>`;
}

export function renderBrokerMap(state, {
  status = 'idle', data = null, today = localDay(), selectedId = null, view = null, newlyLit = new Set(),
  stage = null, firstVisit = false, editingResidency = false, listOpen = false,
} = {}) {
  let body;
  if (status === 'error') {
    body = `<div class="constellation constellation--error" role="alert"><p>COULDN'T LOAD THE MAP</p><button type="button" class="btn" data-action="retry-broker-data">TRY AGAIN</button></div>`;
  } else if (status === 'ready' && data) {
    body = loadedView(state, data, { today, selectedId, view, newlyLit, stage, firstVisit, editingResidency, listOpen });
  } else {
    body = '<div class="constellation constellation--loading" role="status"><p>LOADING THE FIELD…</p></div>';
  }
  return `${renderHud(state)}${STYLE}<div class="screen broker-map">${BACK}${body}</div>`;
}

function loadedView(state, { map, layout }, { today, selectedId, view, newlyLit, stage, firstVisit, editingResidency, listOpen }) {
  const lighting = brokerLighting(map, state, today);
  const ratio = stage?.w > 0 && stage?.h > 0 ? stage.h / stage.w : 1;
  const v = view ?? initialView(map, layout, lighting, ratio);
  const svg = constellationSvg({ map, layout, lighting, selectedId, newlyLit, view: v, px: stage?.w ?? null, controls: CONTROLS });
  const selected = selectedId ? map.brokers.find((b) => b.id === selectedId) : null;
  const height = stage?.h > 0 ? ` style="height:${Math.round(stage.h)}px"` : '';
  // Above the map, compact, so it reads on a 375×812 phone without scrolling.
  const scout = firstVisit
    ? `<div class="map-scout">${smallScout('thinkingA', 36)}<p>${esc(BROKER_MAP_DIALOGUE.firstVisit)}</p></div>`
    : '';
  return `<h1 class="map-head">${fieldHeader(fieldCoverage(map, lighting))}</h1>`
    + '<p class="map-sub">estimated share of the field your opt-outs reach</p>'
    + scout
    + '<div class="constellation-wrap">'
    + `<div class="map-stage"${height}>${svg}<div class="constellation-controls">`
    + '<button type="button" class="constellation-zoom" data-action="map-zoom" data-dir="in" aria-label="Zoom in">+</button>'
    + '<button type="button" class="constellation-zoom" data-action="map-zoom" data-dir="out" aria-label="Zoom out">−</button>'
    + '<button type="button" class="constellation-zoom constellation-zoom--reset" data-action="map-zoom" data-dir="reset" aria-label="Reset the view">RESET</button>'
    + '</div></div>'
    + `<p class="constellation-pick" aria-live="polite">${selected ? esc(shortName(selected.name)) : ''}</p>`
    + starList(map, layout, lighting, selectedId, listOpen)
    + '</div>'
    + `<ul class="map-legend">${LEGEND.map(([icon, label]) => `<li>${icon}${label}</li>`).join('')}</ul>`
    + nudgeBlock(lighting.pending)
    + residencyBlock(state, editingResidency)
    + dropBlock(lighting.drop)
    + leftBlock(whatsLeft(map, lighting));
}
