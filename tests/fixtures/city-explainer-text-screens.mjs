// The screens tests/city-explainer-slides.test.js compares, old against new:
// The Whole City (error, loading, ready) and Your City (sharing on, sharing off).
import { createInitialState } from '../../src/state.js';
import { renderCityTogether } from '../../src/screens/city-together.js';
import { renderStats } from '../../src/screens/stats.js';
import { setAnalyticsOff } from '../../src/utils/analytics-pref.js';

export const DATA = {
  k: 50, asOf: '2026-10-06T04:00:00Z',
  city: { players: 11865, fortified: { pct: 18, fixed: 970, breached: 5424 }, ghosts: 3, optedOut: 12,
          byAddress: [{ id: 'gmail', label: 'Gmail', checks: 2759, breachRatePct: 85 }] },
  pods: [
    { id: 'us-il-chicago', label: 'Chicago', players: 312, fortified: { pct: 22 }, ghosts: 1 },
    { id: 'us-wa-seattle', label: 'Seattle', players: 300, fortified: { pct: 30 } },
  ],
};

// Text between tags, whitespace normalised; the as-of time is the machine's locale, so left out.
export function textNodes(html) {
  return String(html)
    .split(/<[^>]*>/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter((t) => t && !/^As of /.test(t));
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

export function* screens() {
  globalThis.localStorage = memoryStorage();
  setAnalyticsOff(false);
  const s = createInitialState();
  yield ['together-error', renderCityTogether(s, { collective: { status: 'error' } })];
  yield ['together-loading', renderCityTogether(s, { collective: { status: 'loading' } })];
  yield ['together-ready', renderCityTogether(s, { collective: { status: 'ready', data: DATA } })];
  yield ['stats-sharing-on', renderStats(s, {})];
  setAnalyticsOff(true);
  yield ['stats-sharing-off', renderStats(s, {})];
  setAnalyticsOff(false);
}
