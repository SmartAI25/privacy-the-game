import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { serialize } from '../../research/data-brokers/build/export.js';

const src = readFileSync('src/app.js', 'utf8');

describe('broker map wiring (source checks)', () => {
  it('Escape closes the card directly, not through a swallowable click', () => {
    const i = src.indexOf("e.key === 'Escape' && selectedId");
    expect(i).toBeGreaterThan(-1);
    const block = src.slice(i, i + 400);
    expect(block).toContain('closeCard()');
    expect(block).not.toContain('close.click()');
  });
  it('the click swallow lets CLOSE through', () => {
    const i = src.indexOf('swallowClickUntil) return;');
    expect(src.slice(i, i + 700)).toContain('[data-action="close-star"]');
  });
  it('the sheet height cap is cleared outside phone width', () => {
    expect(src).toContain("card.style.maxHeight = ''");
    expect(src).toContain("removeProperty('max-height')");
  });
});

describe('export serialization', () => {
  it('is compact with a trailing newline', () => {
    const t = serialize({ a: [1, 2], b: { c: 1 } });
    expect(t).toBe('{"a":[1,2],"b":{"c":1}}\n');
  });
});
