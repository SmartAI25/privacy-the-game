// The screens tests/trim-text.test.js compares, old against new (Task 7a, the phone trim
// pass, 2026-10-24): Quick Quest, every survey, the Reclamation, the Big Check, the Social
// Timeline, a broker debrief and its re-check, and the city map.
import { readFileSync } from 'node:fs';
import { createInitialState, updateMission } from '../../src/state.js';
import { renderQuickQuest } from '../../src/screens/quick-quest.js';
import { renderDistrict } from '../../src/screens/district.js';
import { renderBigCheck } from '../../src/screens/big-check.js';
import { renderTimeline } from '../../src/screens/timeline.js';
import { renderDebrief } from '../../src/screens/debrief.js';
import { renderCityMap } from '../../src/screens/city-map.js';
import { DISTRICTS } from '../../src/data/districts.js';
import { BROKER_MAP_DIALOGUE } from '../../src/data/dialogue.js';

const mini = JSON.parse(readFileSync(new URL('./broker-map-mini.json', import.meta.url), 'utf8'));
const layout = JSON.parse(readFileSync(new URL('../../src/data/broker-layout.json', import.meta.url), 'utf8'));
const T = '2026-10-23';
const WF = 'people_search-fortify-web-forms';

// Text between tags, whitespace normalised; stylesheets left out.
export function textNodes(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .split(/<[^>]*>/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

export function* screens() {
  globalThis.localStorage = memoryStorage();
  const fresh = createInitialState();
  yield ['quickquest', renderQuickQuest(fresh)];
  for (const d of DISTRICTS.filter((x) => x.type !== 'facility' && !x.hasGarage)) {
    yield [`survey-${d.id}`, renderDistrict(fresh, d.id, 'survey')];
  }
  const pm = { ...fresh, passwordManager: 'none', customAccounts: { 'master-keys': ['Old forum'] } };
  yield ['survey-master-keys-pm', renderDistrict(pm, 'master-keys', 'survey')];
  yield ['reclamation', renderDistrict(fresh, 'reclamation')];
  yield ['big-check-first', renderBigCheck(fresh, { status: 'ready', data: { map: mini, layout }, today: T, scoutLine: BROKER_MAP_DIALOGUE.bigCheck })];
  yield ['big-check', renderBigCheck(fresh, { status: 'ready', data: { map: mini, layout }, today: T })];
  yield ['timeline', renderTimeline(fresh)];
  yield ['debrief-broker', renderDebrief(fresh, WF)];
  const filed = updateMission(fresh, WF, { status: 'completed', completedAt: '2026-10-20T10:00:00Z' });
  yield ['recheck-broker', renderDebrief(filed, WF, { recheck: true })];
  yield ['city', renderCityMap(fresh)];
}
