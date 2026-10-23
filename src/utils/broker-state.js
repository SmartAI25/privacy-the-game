// Saved-game fields for the Broker Constellation: which checklist lines the
// player filed (and when), whether they live in California, and Big Check
// ticks. Pure helpers. Nothing here is ever tracked or put in a URL.
// Must not import state.js (state.js imports this for loadState).

import { checklistFor, LEGACY_ALL_ANSWERS } from '../data/broker-checklists.js';

export const RESIDENCY = ['yes', 'no', 'unsaid'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// A real YYYY-MM-DD day (round-trips through Date), or null.
function realDay(day) {
  if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === day ? day : null;
}

// The local calendar day of an ISO time (same rule as localDay in state.js).
export function dayOf(iso) {
  if (typeof iso !== 'string') return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// A save is untrusted JSON: a "__proto__" key would set the output's
// prototype instead of a field, so it is dropped.
const SKIP = '__proto__';

function cleanDays(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (k !== SKIP && realDay(v)) out[k] = v;
  return out;
}

function cleanFiled(filed) {
  if (!isObj(filed)) return undefined;
  const out = {};
  for (const [id, entry] of Object.entries(filed)) {
    if (id === SKIP || !isObj(entry) || !isObj(entry.lines)) continue;
    const e = { lines: cleanDays(entry.lines) };
    if (realDay(entry.since)) e.since = entry.since;
    out[id] = e;
  }
  return out;
}

export function cleanBrokerState(state) {
  if (!isObj(state)) return state;
  const next = { ...state };
  let changed = false;
  const drop = (key) => { delete next[key]; changed = true; };
  if ('brokerFiled' in state) {
    const c = cleanFiled(state.brokerFiled);
    if (c === undefined) drop('brokerFiled');
    else if (JSON.stringify(c) !== JSON.stringify(state.brokerFiled)) { next.brokerFiled = c; changed = true; }
  }
  if ('caResident' in state && !RESIDENCY.includes(state.caResident)) drop('caResident');
  if ('bigCheck' in state) {
    if (!isObj(state.bigCheck)) drop('bigCheck');
    else {
      const c = cleanDays(state.bigCheck);
      if (Object.keys(c).length !== Object.keys(state.bigCheck).length) { next.bigCheck = c; changed = true; }
    }
  }
  return changed ? next : state;
}

function withEntry(state, missionId, entry) {
  return { ...state, brokerFiled: { ...(isObj(state.brokerFiled) ? state.brokerFiled : {}), [missionId]: entry } };
}

export function recordChecklist(state, missionId, lineIds, day, { first = false } = {}) {
  const list = checklistFor(missionId);
  if (!list || (lineIds.length === 0 && !first)) return state;
  const prev = state.brokerFiled?.[missionId];
  const lines = { ...(isObj(prev?.lines) ? prev.lines : {}) };
  const valid = new Set(list.map((l) => l.id));
  for (const id of lineIds) if (valid.has(id)) lines[id] = day;
  const entry = { lines };
  const since = prev?.since ?? (first ? day : undefined);
  if (since) entry.since = since;
  return withEntry(state, missionId, entry);
}

// The debrief's ticks count only on a completed filing.
export function applyChecklistFiling(state, missionId, status, lineIds, day) {
  return status === 'completed' ? recordChecklist(state, missionId, lineIds, day, { first: true }) : state;
}

export function setResidency(state, value) {
  const next = { ...state };
  if (RESIDENCY.includes(value)) next.caResident = value;
  else delete next.caResident;
  return next;
}

export function setBigCheck(state, brokerId, ticked, day) {
  const bigCheck = { ...(isObj(state.bigCheck) ? state.bigCheck : {}) };
  if (ticked) bigCheck[brokerId] = day;
  else delete bigCheck[brokerId];
  return { ...state, bigCheck };
}

// A legacy "all" filing (completed, answered all-submitted / done) becomes
// explicit lines at its completedAt day, so a later re-check can't erase it.
export function materializeLegacy(state, missionId) {
  const list = checklistFor(missionId);
  const rec = state.missions?.[missionId];
  if (!list || rec?.status !== 'completed') return state;
  const isAll = Object.entries(LEGACY_ALL_ANSWERS).some(([q, vals]) => vals.includes(rec[q]));
  if (!isAll || state.brokerFiled?.[missionId]?.since) return state;
  const day = dayOf(rec.completedAt);
  if (!day) return state;
  const prev = state.brokerFiled?.[missionId];
  const lines = { ...(isObj(prev?.lines) ? prev.lines : {}) };
  for (const l of list) if (!lines[l.id]) lines[l.id] = day;
  return withEntry(state, missionId, { lines, since: day });
}
