// Player-side state for Building Interiors: their own device list, which seals
// they have already watched, whether Scout has said his one-time lines, and
// which floors they folded. Every function is pure and returns new state (or
// the very same object when nothing would change). None of it is ever sent
// anywhere: no analytics, no error context.
import { entryState } from './interior.js';
import { getInterior } from '../data/interiors/index.js';

const MAX_DEVICES = 12;
const MAX_LABEL = 40;

const listOf = (state, accountId) => {
  const l = state?.devices?.[accountId];
  return Array.isArray(l) ? l.filter((d) => typeof d === 'string') : [];
};
const interiorOf = (state, accountId) => state?.interior?.[accountId] ?? {};
const withInterior = (state, accountId, patch) => ({
  ...state,
  interior: { ...state.interior, [accountId]: { ...interiorOf(state, accountId), ...patch } },
});

export function devicesOf(state, accountId) {
  return listOf(state, accountId);
}

export function addDevice(state, accountId, label) {
  const clean = String(label ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL).trim();
  const list = listOf(state, accountId);
  if (!clean || list.length >= MAX_DEVICES || list.includes(clean)) return state;
  return { ...state, devices: { ...state.devices, [accountId]: [...list, clean] } };
}

export function removeDevice(state, accountId, index) {
  const list = listOf(state, accountId);
  if (!Number.isInteger(index) || index < 0 || index >= list.length) return state;
  return { ...state, devices: { ...state.devices, [accountId]: list.filter((_, i) => i !== index) } };
}

// Doors the player can do something about (not 'beyond'), and how many are sealed.
export function controllableProgress(state, accountId) {
  let sealed = 0;
  let controllable = 0;
  for (const e of getInterior(accountId)?.entries ?? []) {
    const st = entryState(state, accountId, e).state;
    if (st === 'beyond') continue;
    controllable += 1;
    if (st === 'sealed') sealed += 1;
  }
  return { sealed, controllable };
}

// Every door within reach is sealed: none open, none still unchecked.
export function allControllableSealed(state, accountId) {
  const { sealed, controllable } = controllableProgress(state, accountId);
  return sealed > 0 && sealed === controllable;
}

// Entries that are sealed right now but whose seal the player has not watched.
export function newlySealed(state, accountId) {
  const seen = new Set(interiorOf(state, accountId).sealedSeen ?? []);
  return (getInterior(accountId)?.entries ?? [])
    .filter((e) => entryState(state, accountId, e).state === 'sealed' && !seen.has(e.id))
    .map((e) => e.id);
}

// Call after the render that showed the animation and Scout's line.
export function markSealedSeen(state, accountId, entryIds = []) {
  const cur = interiorOf(state, accountId);
  const seen = new Set(cur.sealedSeen ?? []);
  const grown = entryIds.filter((id) => !seen.has(id));
  const full = allControllableSealed(state, accountId);
  if (!grown.length && cur.visited && (!full || cur.fullySealedSeen)) return state;
  return withInterior(state, accountId, {
    visited: true,
    sealedSeen: [...seen, ...grown],
    ...(full ? { fullySealedSeen: true } : {}),
  });
}

export function isFloorOpen(state, accountId, floorId) {
  return interiorOf(state, accountId).floors?.[floorId] !== false;
}

export function setFloorOpen(state, accountId, floorId, open) {
  if (isFloorOpen(state, accountId, floorId) === Boolean(open)) return state;
  const cur = interiorOf(state, accountId);
  return withInterior(state, accountId, { floors: { ...cur.floors, [floorId]: Boolean(open) } });
}

// Scout's line for this render: fully sealed (once) > a new seal > first visit (once).
export function interiorLineKind(state, accountId) {
  const cur = interiorOf(state, accountId);
  if (allControllableSealed(state, accountId) && !cur.fullySealedSeen) return 'fullySealed';
  if (newlySealed(state, accountId).length) return 'newSeal';
  if (!cur.visited) return 'firstVisit';
  return null;
}
