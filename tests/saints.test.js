import { describe, it, expect } from 'vitest';
import { createInitialState, toggleAccount } from '../src/state.js';
import { renderSaints } from '../src/screens/saints.js';
import { renderBuildingInterior } from '../src/screens/building.js';
import { lightCandle } from '../src/utils/interior-state.js';
import { SAINTS } from '../src/data/interiors/saints.js';
import { parseRoute } from '../src/router.js';

const ORDER = ['swartz', 'snowden', 'klein', 'zimmermann', 'ellsberg', 'manning', 'drake', 'binney', 'poitras'];

describe('saints gallery', () => {
  it('routes #/saints', () => {
    expect(parseRoute('#/saints')).toEqual({ screen: 'saints', params: {} });
  });

  it('lists all nine saints in spec order, each with sources and an unlit candle', () => {
    const html = renderSaints(createInitialState());
    const found = [...html.matchAll(/data-saint-card="([a-z]+)"/g)].map((m) => m[1]);
    expect(found).toEqual(ORDER);
    for (const id of ORDER) {
      const card = html.match(new RegExp(`data-saint-card="${id}"[\\s\\S]*?</section>`))[0];
      expect(card).toContain(SAINTS[id].years);
      expect(card).toContain(SAINTS[id].sources[0].url);
      expect(card).toContain('target="_blank" rel="noopener"');
      expect(card).toContain('aria-pressed="false"');
    }
  });

  it('shows a lit candle as pressed and announced', () => {
    const html = renderSaints(lightCandle(createInitialState(), 'snowden'));
    const card = html.match(/data-saint-card="snowden"[\s\S]*?<\/section>/)[0];
    expect(card).toContain('aria-pressed="true"');
    expect(card).toContain('Candle lit');
    expect(card).toContain('candle--lit');
  });

  it('works on an old save with no candles key', () => {
    const s = createInitialState();
    delete s.candles;
    expect(() => renderSaints(s)).not.toThrow();
    expect(lightCandle(s, 'swartz').candles.swartz).toBe(true);
  });
});

describe('lightCandle', () => {
  it('is idempotent, ignores unknown ids, and sends no event', () => {
    const s0 = createInitialState();
    const before = JSON.stringify(s0);
    const s1 = lightCandle(s0, 'swartz');
    expect(s1.candles.swartz).toBe(true);
    expect(JSON.stringify(s0)).toBe(before);
    expect(lightCandle(s1, 'swartz')).toBe(s1);
    expect(lightCandle(s1, 'nobody')).toBe(s1);
    expect(lightCandle(s1, '__proto__')).toBe(s1);
  });
});

describe('alcove', () => {
  const enabled = (id) => toggleAccount(createInitialState(), id, true);
  it('gmail alcove shows Saint Edward Snowden with a candle and gallery link; netflix has no alcove', () => {
    const html = renderBuildingInterior(enabled('gmail'), 'gmail');
    expect(html).toContain('Saint Edward Snowden');
    expect(html).toContain('data-action="light-candle" data-saint="snowden"');
    expect(html).toContain('href="#/saints"');
    expect(renderBuildingInterior(enabled('netflix'), 'netflix')).not.toContain('data-floor="alcove"');
  });
});

describe('saint copy', () => {
  it('never says "they" or "Schwartz"', () => {
    const text = JSON.stringify(Object.values(SAINTS)) + renderSaints(createInitialState());
    expect(text).not.toMatch(/\bthey\b/i);
    expect(text).not.toMatch(/Schwartz/i);
  });
});

describe('lighting a candle never reaches analytics', () => {
  it('the light-candle action path has no track and saints code imports no analytics', async () => {
    const { readFileSync } = await import('node:fs');
    const app = readFileSync('src/app.js', 'utf8');
    const start = app.indexOf("action === 'light-candle'");
    const body = app.slice(start, app.indexOf('} else if', start + 10)).replace(/\/\/.*$/gm, '');
    expect(start).toBeGreaterThan(0);
    expect(body.length).toBeGreaterThan(50);
    expect(body).toContain('lightCandle(');
    expect(body).not.toMatch(/\btrack|afterMissionRecorded|captureError/);
    for (const f of ['src/screens/saints.js', 'src/utils/interior-state.js', 'src/data/interiors/saints.js']) {
      expect(readFileSync(f, 'utf8')).not.toMatch(/analytics|track\(/);
    }
  });
});
