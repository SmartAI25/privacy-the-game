// Building Interiors: each account building's threat model. Records desk
// (what named agencies can make the company hand over), entries (named ways
// in, sealed by the player's own filings), and the saint's alcove.
// Spec: docs/superpowers/specs/2026-10-20-building-interiors-design.md
import { MASTER_KEYS_INTERIORS } from './master-keys.js';
import { SQUARE_INTERIORS } from './square.js';

/** @typedef {{ label: string, url: string }} Source */
/** @typedef {'password-unique'|'sim-swap'|'phishing'|'devices'|'reglock'|'beyond'} RuleId */
/**
 * @typedef {{ id: string, metaphor: 'front-door'|'phone-line'|'mail-slot'|'back-room'|'vents'|'number',
 *   actor: string, actorNote?: string, how: string, rule: RuleId, fix?: string, fixMission?: string,
 *   narrows?: string, sources: Source[] }} Entry
 */
/**
 * @typedef {{ accountId: string, company: string, deskIntro: string,
 *   desk: import('./lanes.js').DeskLane[], entries: Entry[], saints: string[] }} Interior
 */

/** @type {Record<string, Interior>} */
export const INTERIORS = { ...MASTER_KEYS_INTERIORS, ...SQUARE_INTERIORS };

export function hasInterior(accountId) {
  return Object.hasOwn(INTERIORS, accountId);
}

/** @returns {Interior | null} */
export function getInterior(accountId) {
  return hasInterior(accountId) ? INTERIORS[accountId] : null;
}
