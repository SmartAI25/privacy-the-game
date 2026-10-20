// A building's interior: a cutaway of its floors, top to bottom. Roof (the
// player's own checkup), the company's records desk, the ground-floor entries,
// and a saint's alcove. Spec: docs/superpowers/specs/2026-10-20-building-interiors-design.md
import { ACCOUNTS } from '../data/accounts.js';
import { DISTRICTS } from '../data/districts.js';
import { MISSIONS } from '../data/missions.js';
import { getInterior } from '../data/interiors/index.js';
import { SAINTS } from '../data/interiors/saints.js';
import { renderHud } from '../components/hud.js';
import { checkupRows, entryState, sealedCount, recordDate, freshness } from '../utils/interior.js';
import { isMissionDoneIn, isMissionAvailable } from '../utils/mission-status.js';
import { canRecheck } from '../utils/debrief.js';
import { renderScout } from '../components/scout.js';
import { INTERIOR_LINES, pick } from '../data/dialogue.js';
import { renderCandle } from './saints.js';
import { devicesOf, isFloorOpen, newlySealed, interiorLineKind } from '../utils/interior-state.js';

const DAY = 864e5;
const LIT = { ok: 4, warn: 2, crit: 1, 'not-checked': 0 };
const DIM = { fresh: 1, aging: 0.6, stale: 0.35, unknown: 0.35 };
const ICON = { sealed: '🔒', open: '◇', beyond: '◌', 'not-checked': '?' };
const STATE_LABEL = { sealed: 'Sealed', open: 'Open', beyond: 'Beyond your control', 'not-checked': 'Not checked yet' };
const METAPHOR = {
  'front-door': 'Front door',
  'phone-line': 'Phone line',
  'mail-slot': 'Mail slot',
  'back-room': 'Back room',
  vents: 'Vents',
  number: 'Phone number',
};

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const missionById = (id) => MISSIONS.find((m) => m.id === id);
const briefingHref = (id) => `#/mission/${esc(id)}/briefing`;

function sourceLinks(sources = []) {
  if (!sources.length) return '';
  return `<details class="interior-sources"><summary>SOURCES · ${sources.length}</summary>${sources
    .map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`)
    .join('')}</details>`;
}

// Floors remember whether the player folded them (state.interior[id].floors).
function floor(ctx, kind, title, body) {
  const open = isFloorOpen(ctx.state, ctx.accountId, kind) ? ' open' : '';
  return `
    <details class="floor floor--${kind}"${open} data-floor="${kind}">
      <summary class="floor-head"><span>${title}</span><span class="floor-chev" aria-hidden="true">▾</span></summary>
      <div class="floor-body">${body}</div>
    </details>`;
}

// The completed record behind a mission (or the old one it replaces).
function filedRecord(state, id) {
  const own = state.missions?.[id];
  if (own?.status === 'completed') return own;
  const old = missionById(id)?.replaces;
  return old && state.missions?.[old]?.status === 'completed' ? state.missions[old] : null;
}

// LAST SWEEP: the newest dated filing behind the roof rows.
function lastSweep(state, rows, now) {
  let filed = false;
  let newest = null;
  for (const id of new Set(rows.map((r) => r.missionId).filter(Boolean))) {
    const rec = filedRecord(state, id);
    if (!rec) continue;
    filed = true;
    const t = Date.parse(recordDate(rec));
    if (!Number.isNaN(t) && (newest === null || t > newest)) newest = t;
  }
  if (!filed) return null;
  if (newest === null) return { text: 'date unknown', fresh: 'unknown' };
  const days = Math.max(0, Math.floor((now.getTime() - newest) / DAY));
  return { text: days === 0 ? 'today' : `${days}d`, fresh: freshness(new Date(newest).toISOString(), now) };
}

function meter(state, accountId, rows, now) {
  const { sealed, total } = sealedCount(state, accountId);
  const sweep = lastSweep(state, rows, now);
  const count = total === 0 ? '<span>NO ENTRIES CHECKED YET</span>' : `<span>ENTRIES SEALED <b>${sealed}/${total}</b></span>`;
  const age = sweep ? `<span class="dim">·</span><span>LAST SWEEP <b class="fresh-${sweep.fresh}">${esc(sweep.text)}</b></span>` : '';
  return `<div class="interior-meter">${count}${age}</div>`;
}

function roofRow(state, row) {
  const lit = LIT[row.status] ?? 0;
  const checked = row.status !== 'not-checked';
  const bars = [0, 1, 2, 3].map((i) => `<span class="bar${i < lit ? ' on' : ''}"></span>`).join('');
  const mission = row.missionId ? missionById(row.missionId) : null;
  const sweepable = checked && mission && state.missions?.[mission.id]?.status === 'completed' && canRecheck(mission);
  let action = '';
  if (sweepable) action = `<a class="interior-btn interior-btn--quiet" href="#/mission/${esc(mission.id)}/recheck">SWEEP</a>`;
  else if (mission) action = `<a class="interior-btn interior-btn--quiet" href="${briefingHref(mission.id)}">START</a>`;
  const when = checked && row.freshness === 'unknown' ? '<span class="dim"> · date unknown</span>' : '';
  return `
        <div class="ant-row" data-row="${esc(row.id)}" data-status="${esc(row.status)}" data-fresh="${esc(row.freshness)}">
          <span class="ant-label">${esc(row.label)}${when}</span>
          <span class="ant-bars ant-bars--${esc(row.status)}" style="opacity: ${DIM[row.freshness] ?? 0.35};" aria-label="${lit} of 4 bars">${bars}</span>
          ${action}
        </div><!-- /row -->`;
}

// The player's own list of where they are signed in. Stays on this device.
function deviceList(state, accountId) {
  const list = devicesOf(state, accountId);
  const items = list.length
    ? list.map((d, i) => `
        <li class="device"><span class="device-name">${esc(d)}</span><button type="button" class="device-x" data-action="remove-device" data-building="${esc(accountId)}" data-index="${i}" aria-label="Remove ${esc(d)}">×</button></li>`).join('')
    : '<li class="device dim">not listed</li>';
  return `
      <div class="devices" data-devices>
        <div class="devices-title">Your devices</div>
        <ul class="devices-list">${items}</ul>
        <div class="devices-add">
          <input class="devices-input" type="text" maxlength="40" autocomplete="off" data-device-input aria-label="Add a device" placeholder="e.g. old tablet">
          <button type="button" class="interior-btn interior-btn--quiet" data-action="add-device" data-building="${esc(accountId)}">ADD</button>
        </div>
        <div class="dim interior-note">Kept on this phone only. Nothing here is sent anywhere.</div>
      </div>`;
}

function roof(ctx, rows) {
  const { state, accountId } = ctx;
  return floor(ctx, 'roof', '▲ Roof · Signal check', `
      <div class="ant">${rows.map((r) => roofRow(state, r)).join('')}</div>
      ${deviceList(state, accountId)}
      <div class="dim interior-note">The antennas fade as your last check gets older. A fresh sweep lights them back up.</div>`);
}

function desk(ctx, interior) {
  const slips = interior.desk.map((lane) => `
      <div class="slip" data-lane="${esc(lane.id)}">
        <div class="slip-stamp">${esc(lane.tool)}</div>
        <div class="slip-who">${esc(lane.actor)}</div>
        ${lane.actorNote ? `<div class="dim slip-note">${esc(lane.actorNote)}</div>` : ''}
        <div class="slip-gets">${esc(lane.gets)}</div>
        ${sourceLinks(lane.sources)}
      </div>`).join('');
  return floor(ctx, 'desk', `▣ Records desk · ${esc(interior.company)}’s`, `
      <div class="dim interior-note">${esc(interior.deskIntro)}</div>${slips}`);
}

// Where SEAL IT (or START) goes. The 2FA upgrade only unlocks after the base
// 2FA mission is filed with text or email codes; until then, the base mission.
function entryMission(state, accountId, entry) {
  const id = entry.fixMission;
  if (!id || !missionById(id)) return null;
  if (id === `${accountId}-fortify-2fa-upgrade`) {
    const base = missionById(`${accountId}-fortify-2fa`);
    if (base && (!isMissionDoneIn(state, base) || !isMissionAvailable(state, missionById(id)))) return base.id;
  }
  return id;
}

function actorLines(actor) {
  return String(actor).split(' · ').map((a) => `<span class="entry-actor">${esc(a)}</span>`).join('');
}

function entry(state, accountId, e, sealing) {
  const s = entryState(state, accountId, e);
  const target = entryMission(state, accountId, e);
  let status = '';
  if (s.state === 'sealed') {
    status = `<div class="ok">Sealed.</div>${s.note ? `<div class="dim">${esc(s.note)}</div>` : ''}`;
  } else if (s.state === 'open') {
    status = `${e.fix ? `<div class="entry-fix">${esc(e.fix)}</div>` : ''}${target ? `<a class="interior-btn" href="${briefingHref(target)}">SEAL IT ▸</a>` : ''}`;
  } else if (s.state === 'beyond') {
    status = `<div class="dim">Beyond your control.${e.narrows ? ` ${esc(e.narrows)}` : ''}</div>`;
  } else {
    status = `<div class="dim">Not checked yet.</div>${e.fix ? `<div class="entry-fix">${esc(e.fix)}</div>` : ''}${target ? `<a class="interior-btn interior-btn--quiet" href="${briefingHref(target)}">START</a>` : ''}`;
  }
  return `
      <div class="entry entry--${s.state}${sealing.has(e.id) ? ' entry--sealing' : ''}" data-entry="${esc(e.id)}" data-state="${s.state}">
        <div class="entry-lock" role="img" aria-label="${STATE_LABEL[s.state] ?? 'Not checked yet'}">${ICON[s.state] ?? '?'}</div>
        <div class="entry-text">
          <div class="entry-where">${esc(METAPHOR[e.metaphor] ?? e.metaphor)}</div>
          <div class="entry-actors">${actorLines(e.actor)}</div>
          ${e.actorNote ? `<div class="dim entry-note">${esc(e.actorNote)}</div>` : ''}
          <div class="entry-how">${esc(e.how)}</div>
          ${status}
          ${sourceLinks(e.sources)}
        </div>
      </div><!-- /entry -->`;
}

function ground(ctx, interior, sealing) {
  const { state, accountId } = ctx;
  return floor(ctx, 'ground', '▼ Ground floor · Entries', interior.entries.map((e) => entry(state, accountId, e, sealing)).join(''));
}

function alcove(ctx, saint) {
  return floor(ctx, 'alcove', `✦ Alcove · ${esc(saint.name)}`, `
      <div class="alcove-tribute"><span>Scout: “${esc(saint.tribute)}”</span></div>
      ${renderCandle(ctx.state, saint)}
      <div class="dim alcove-title">${esc(saint.title)} · ${esc(saint.years)}</div>
      <div class="alcove-story">${esc(saint.story)}</div>
      ${sourceLinks(saint.sources)}
      <a class="interior-btn interior-btn--quiet saints-link" href="#/saints">All saints →</a>`);
}

function renderNoPlan(state, accountId) {
  const account = ACCOUNTS[accountId];
  const district = account ? DISTRICTS.find((d) => d.id === account.district) : null;
  const back = district
    ? `<a class="btn-secondary interior-back" href="#/district/${esc(district.id)}">← ${esc(district.name.toUpperCase())}</a>`
    : '<a class="btn-secondary interior-back" href="#/city">← CITY</a>';
  return `
  <div class="scanlines">
    ${renderHud(state)}
    <div class="interior">
      ${back}
      <div class="interior-empty">
        <div class="interior-title">${esc(account?.name ?? 'Unknown building')}</div>
        <p>No floor plan for this building yet.</p>
      </div>
    </div>
  </div>`;
}

export function renderBuildingInterior(state, accountId, { now = new Date() } = {}) {
  const interior = getInterior(accountId);
  const account = ACCOUNTS[accountId];
  if (!interior || !account || !state.accounts?.[accountId]?.enabled) return renderNoPlan(state, accountId);
  const district = DISTRICTS.find((d) => d.id === account.district);
  const rows = checkupRows(state, accountId, now);
  const saints = (interior.saints ?? []).map((id) => SAINTS[id]).filter(Boolean);
  const ctx = { state, accountId };
  const sealing = new Set(newlySealed(state, accountId));
  const kind = interiorLineKind(state, accountId);
  const scout = kind
    ? `<div class="interior-scout" data-scout="interior">${renderScout(esc(pick(INTERIOR_LINES[kind]).replace(/\{name\}/g, account.name)))}</div>`
    : '';
  return `
  <div class="scanlines">
    ${renderHud(state)}
    <div class="interior" data-building="${esc(accountId)}">
      <a class="btn-secondary interior-back" href="#/district/${esc(account.district)}">← ${esc((district?.name ?? 'DISTRICT').toUpperCase())}</a>
      <div class="interior-title">${esc(account.name.toUpperCase())}</div>
      <div class="interior-sub">${esc(district?.name ?? '')} · tap a floor to fold it</div>
      ${meter(state, accountId, rows, now)}
      ${scout}
      ${roof(ctx, rows)}
      ${desk(ctx, interior)}
      ${ground(ctx, interior, sealing)}
      ${saints.map((sa) => alcove(ctx, sa)).join('')}
    </div>
  </div>`;
}
