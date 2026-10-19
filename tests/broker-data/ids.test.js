import { describe, it, expect } from 'vitest';
import { normalizeName, slugify } from '../../research/data-brokers/build/ids.js';

describe('normalizeName', () => {
  it('strips legal suffixes and punctuation', () => {
    expect(normalizeName('Acxiom LLC')).toBe('acxiom');
    expect(normalizeName('ACXIOM CORPORATION')).toBe('acxiom');
    expect(normalizeName('Spokeo, Inc.')).toBe('spokeo');
    expect(normalizeName('Foo L.L.C.')).toBe('foo');
  });
  it('strips stacked trailing suffixes and collapses whitespace', () => {
    expect(normalizeName('  Thomson   Reuters Holdings Inc ')).toBe('thomson reuters');
  });
  it('keeps suffix words that are not trailing', () => {
    expect(normalizeName('Company Kitchen LLC')).toBe('company kitchen');
  });
});

describe('slugify', () => {
  it('normalizes then hyphenates', () => {
    expect(slugify('Thomson Reuters Holdings Inc')).toBe('thomson-reuters');
  });
});
