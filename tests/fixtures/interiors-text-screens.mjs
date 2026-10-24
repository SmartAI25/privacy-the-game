// The screens tests/interiors-slides.test.js compares, old against new.
import { createInitialState, toggleAccount, updateMission } from '../../src/state.js';
import { renderSaints } from '../../src/screens/saints.js';
import { renderBuildingInterior } from '../../src/screens/building.js';
import { INTERIORS } from '../../src/data/interiors/index.js';
import { lightCandle } from '../../src/utils/interior-state.js';

const NOW = new Date('2026-10-20T00:00:00Z');

// Text between tags, whitespace normalised. Scout's interior line is picked at random: left out.
export function textNodes(html) {
  return String(html)
    .replace(/<div class="interior-scout"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, ' ')
    .split(/<[^>]*>/)
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function* screens() {
  const fresh = createInitialState();
  yield ['saints', renderSaints(fresh)];
  yield ['saints-lit', renderSaints(lightCandle(fresh, 'snowden'))];
  for (const id of Object.keys(INTERIORS)) {
    let s = toggleAccount(createInitialState(), id, true);
    yield [`building-${id}`, renderBuildingInterior(s, id, { now: NOW })];
  }
  // A Gmail with filings: sealed and open entries.
  let g = toggleAccount(createInitialState(), 'gmail', true);
  g = updateMission(g, 'gmail-fortify-2fa', { status: 'completed', method: 'sms', completedAt: '2026-10-17T00:00:00Z' });
  g = updateMission(g, 'gmail-fortify-password', { status: 'completed', action: 'reset-password', completedAt: '2026-10-17T00:00:00Z' });
  yield ['building-gmail-filed', renderBuildingInterior(g, 'gmail', { now: NOW })];
}
