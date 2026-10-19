import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  validateBroker, validateLink, validateSource, validateDataset,
  KINDS, OPT_OUT_METHODS, LINK_TYPES, TIERS,
} from '../../research/data-brokers/build/schema.js';

const sourceIds = new Set(['s1']);
const src = { url: 'https://example.com/a', archived: 'https://web.archive.org/web/2026/https://example.com/a', kind: 'sec-10k', title: 'T', accessed: '2026-10-18' };
const broker = (o = {}) => ({
  id: 'acme', name: 'Acme', aliases: [], parent: null, kind: ['marketing'],
  registries: { CA: '2024', VT: null }, sells: ['lists'],
  optOut: { method: 'web-form', url: 'https://acme.example/optout' },
  size: { known: false, signals: [] }, sources: [], ...o,
});
const link = (o = {}) => ({ from: 'a', to: 'b', type: 'supplies', tier: 'A', claim: 'c', sources: ['s1'], published: true, ...o });

function tmpDataset({ brokers = [], links = [], sources = { s1: src } } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'brk-'));
  mkdirSync(join(dir, 'brokers'));
  mkdirSync(join(dir, 'staging'));
  writeFileSync(join(dir, 'staging', 'junk.json'), '{not json');
  for (const [file, b] of brokers) writeFileSync(join(dir, 'brokers', file), JSON.stringify(b));
  writeFileSync(join(dir, 'links.json'), JSON.stringify(links));
  writeFileSync(join(dir, 'sources.json'), JSON.stringify(sources));
  return dir;
}

describe('constants', () => {
  it('are frozen with the exact vocab', () => {
    expect(Object.isFrozen(KINDS)).toBe(true);
    expect(OPT_OUT_METHODS).toEqual(['web-form', 'email', 'mail', 'portal', 'sweep-only', 'none']);
    expect(LINK_TYPES).toEqual(['owns', 'supplies', 'buys', 'matches-identity']);
    expect(TIERS).toEqual(['A', 'B', 'C']);
    expect(KINDS).toHaveLength(11);
  });
});

describe('validateBroker', () => {
  const v = (b) => validateBroker(b, { sourceIds });
  it('valid broker passes', () => expect(v(broker())).toEqual([]));
  it('unknown kind fails', () => expect(v(broker({ kind: ['bogus'] })).length).toBeGreaterThan(0));
  it('optOut null is allowed', () => expect(v(broker({ optOut: null }))).toEqual([]));
  it('optOut.method none needs no url', () => expect(v(broker({ optOut: { method: 'none' } }))).toEqual([]));
  it('web-form needs url', () => expect(v(broker({ optOut: { method: 'web-form' } })).length).toBeGreaterThan(0));
  it('email accepts email field or url', () => {
    expect(v(broker({ optOut: { method: 'email', email: 'a@b.com' } }))).toEqual([]);
    expect(v(broker({ optOut: { method: 'email' } })).length).toBeGreaterThan(0);
  });
  it('bad optOut status fails', () => expect(v(broker({ optOut: { method: 'none', status: 'meh' } })).length).toBeGreaterThan(0));
  it('size.known false must have empty signals', () =>
    expect(v(broker({ size: { known: false, signals: [{ kind: 'x', value: '1', source: 's1' }] } })).length).toBeGreaterThan(0));
  it('bad registry key fails', () => expect(v(broker({ registries: { ZZ: '2024' } })).length).toBeGreaterThan(0));
  it('broker.sources ids must exist in sources.json', () =>
    expect(v(broker({ sources: ['nope'] })).length).toBeGreaterThan(0));
  it('size signal source must exist', () =>
    expect(v(broker({ size: { known: true, signals: [{ kind: 'x', value: '1', source: 'nope' }] } })).length).toBeGreaterThan(0));
});

describe('validateLink', () => {
  const v = (l) => validateLink(l, { brokerIds: new Set(['a', 'b']), sourceIds });
  it('valid link passes', () => expect(v(link())).toEqual([]));
  it('link to unknown broker fails', () => expect(v(link({ to: 'zzz' })).length).toBeGreaterThan(0));
  it('link with no sources fails', () => expect(v(link({ sources: [] })).length).toBeGreaterThan(0));
  it('link source must exist', () => expect(v(link({ sources: ['nope'] })).length).toBeGreaterThan(0));
  it('only tier A may be published', () => {
    expect(v(link({ tier: 'B', published: true })).length).toBeGreaterThan(0);
    expect(v(link({ tier: 'B', published: false }))).toEqual([]);
    expect(v(link({ tier: 'B', published: undefined }))).toEqual([]);
  });
});

describe('validateSource', () => {
  it('valid source passes', () => expect(validateSource('s1', src)).toEqual([]));
  it('source needs archived copy', () => {
    expect(validateSource('s1', { ...src, archived: '' }).length).toBeGreaterThan(0);
    expect(validateSource('s1', { ...src, archived: 'https://example.com/x' }).length).toBeGreaterThan(0);
  });
  it('source needs url and dated access', () => {
    expect(validateSource('s1', { ...src, url: '' }).length).toBeGreaterThan(0);
    expect(validateSource('s1', { ...src, accessed: '10/18/2026' }).length).toBeGreaterThan(0);
  });
});

describe('validateDataset', () => {
  it('empty dataset is valid and ignores staging/', async () => {
    const r = await validateDataset(tmpDataset());
    expect(r.errors).toEqual([]);
    expect(r.counts).toEqual({ brokers: 0, links: 0, published: 0, sources: 1 });
  });
  it('duplicate broker id fails', async () => {
    const r = await validateDataset(tmpDataset({ brokers: [['acme.json', broker()], ['acme2.json', broker()]] }));
    expect(r.errors.some((e) => /duplicate/i.test(e))).toBe(true);
  });
  it('id must match filename', async () => {
    const r = await validateDataset(tmpDataset({ brokers: [['other.json', broker()]] }));
    expect(r.errors.some((e) => /filename/i.test(e))).toBe(true);
  });
  it('parent must exist', async () => {
    const r = await validateDataset(tmpDataset({ brokers: [['acme.json', broker({ parent: 'ghost' })]] }));
    expect(r.errors.some((e) => /parent/i.test(e))).toBe(true);
  });
  it('counts published links and checks links against brokers', async () => {
    const dir = tmpDataset({ brokers: [['acme.json', broker()], ['b.json', broker({ id: 'b' })]], links: [link({ from: 'acme', to: 'b' }), link({ from: 'acme', to: 'ghost', published: false })] });
    const r = await validateDataset(dir);
    expect(r.counts).toMatchObject({ brokers: 2, links: 2, published: 1 });
    expect(r.errors.length).toBe(1);
  });
});
