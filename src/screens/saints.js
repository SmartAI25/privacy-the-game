// Saints gallery: Scout's honor roll, in the spec's order. The candle is local
// only (state.candles); lighting one is never tracked or reported.
import { SAINTS } from '../data/interiors/saints.js';
import { renderHud } from '../components/hud.js';
import { isCandleLit } from '../utils/interior-state.js';

export const SAINT_ORDER = ['swartz', 'snowden', 'klein', 'zimmermann', 'ellsberg', 'manning', 'drake', 'binney', 'poitras'];

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// One button: pressed means lit. The words change too, so it never relies on the flame alone.
export function renderCandle(state, saint) {
  const lit = isCandleLit(state, saint.id);
  return `<button type="button" class="candle-btn${lit ? ' candle-btn--lit' : ''}" data-action="light-candle" data-saint="${esc(saint.id)}" aria-pressed="${lit}" aria-label="${lit ? 'Candle lit' : 'Light a candle'} for ${esc(saint.name)}"><span class="candle${lit ? ' candle--lit' : ''}" aria-hidden="true"></span><span class="candle-text">${lit ? 'Candle lit' : 'Light a candle'}</span></button>`;
}

function sources(list = []) {
  if (!list.length) return '';
  return `<details class="interior-sources"><summary>SOURCES · ${list.length}</summary>${list
    .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`)
    .join('')}</details>`;
}

function card(state, s) {
  return `
      <section class="saint-card" data-saint-card="${esc(s.id)}">
        <h2 class="saint-name">${esc(s.name)}</h2>
        <div class="dim alcove-title">${esc(s.title)} · ${esc(s.years)}</div>
        <div class="alcove-tribute"><span>Scout: “${esc(s.tribute)}”</span></div>
        <div class="alcove-story">${esc(s.story)}</div>
        ${sources(s.sources)}
        ${renderCandle(state, s)}
      </section>`;
}

export function renderSaints(state) {
  const saints = SAINT_ORDER.map((id) => SAINTS[id]).filter(Boolean);
  return `
  <div class="scanlines">
    ${renderHud(state)}
    <div class="interior saints" data-saints>
      <a class="btn-secondary interior-back" href="#/city">← CITY</a>
      <div class="interior-title">SAINTS</div>
      <div class="interior-sub">People whose work made this map knowable</div>
      <div class="dim interior-note">Candles stay on this phone. Nothing here is sent anywhere.</div>
      ${saints.map((s) => card(state, s)).join('')}
    </div>
  </div>`;
}
