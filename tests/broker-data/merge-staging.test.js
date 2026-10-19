import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeStaging, sourceRank } from '../../research/data-brokers/build/merge-staging.js';
import { validateDataset } from '../../research/data-brokers/build/schema.js';

const src = (extra = {}) => ({
  url: 'https://example.gov/doc', title: 'Doc', kind: 'ftc-complaint', accessed: '2026-10-18',
  archived: 'https://web.archive.org/web/2026/https://example.gov/doc', ...extra,
});
const broker = (id, name, extra = {}) => ({
  id, name, aliases: [], parent: null, kind: ['marketing'], registries: {}, sells: [], optOut: null,
  size: { known: false, signals: [] }, sources: ['reg'], ...extra,
});
const J = (x) => `${JSON.stringify(x, null, 2)}\n`;

let dir;
async function setup({ brokers = [], links = [], sources = { reg: src() }, staged = {}, idMap, config = {} } = {}) {
  dir = await mkdtemp(join(tmpdir(), 'merge-staging-'));
  await mkdir(join(dir, 'brokers'));
  for (const b of brokers) await writeFile(join(dir, 'brokers', `${b.id}.json`), J(b));
  await writeFile(join(dir, 'links.json'), J(links));
  await writeFile(join(dir, 'sources.json'), J(sources));
  const st = join(dir, 'staging', 'fam');
  await mkdir(join(st, 'brokers'), { recursive: true });
  for (const b of staged.brokers ?? []) await writeFile(join(st, 'brokers', `${b.id}.json`), J(b));
  await writeFile(join(st, 'links.json'), J(staged.links ?? []));
  await writeFile(join(st, 'sources.json'), J(staged.sources ?? {}));
  if (idMap) config = { ...config, 'id-map.json': { fam: idMap } };
  if (Object.keys(config).length) await mkdir(join(dir, 'build'));
  for (const [f, v] of Object.entries(config)) await writeFile(join(dir, 'build', f), J(v));
}
const readB = async (id) => JSON.parse(await readFile(join(dir, 'brokers', `${id}.json`), 'utf8'));
const readLinks = async () => JSON.parse(await readFile(join(dir, 'links.json'), 'utf8'));
const link = (from, to, extra = {}) => ({ from, to, type: 'owns', tier: 'A', claim: 'c', sources: ['s1'], ...extra });

afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });

describe('mergeStaging', () => {
  it('staged alias merges into existing broker', async () => {
    await setup({
      brokers: [broker('acxiom', 'Acxiom LLC')],
      staged: {
        sources: { s1: src() },
        brokers: [{ id: 'acxiom-corp', name: 'Something Else', aliases: ['ACXIOM Corporation'], sells: ['marketing data'], sources: ['s1'] }],
      },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect(r.added).toBe(0);
    expect(r.updated).toBe(1);
    expect((await readdir(join(dir, 'brokers'))).sort()).toEqual(['acxiom.json']);
    const b = await readB('acxiom');
    expect(b.sells).toEqual(['marketing data']);
    expect(b.sources).toEqual(['reg', 's1']);
    expect(b.aliases).toContain('Something Else');
  });

  it('does not match on alias-to-alias overlap', async () => {
    await setup({
      brokers: [broker('foo', 'Foo Inc', { aliases: ['Shared DBA'] })],
      staged: { sources: { s1: src() }, brokers: [{ id: 'bar', name: 'Bar Inc', kind: ['marketing'], aliases: ['Shared DBA'], sources: ['s1'] }] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.added).toBe(1);
    expect(await readB('bar')).toBeTruthy();
  });

  it('conflicting scalar is rejected not overwritten', async () => {
    await setup({
      brokers: [broker('acme', 'Acme', { website: 'https://acme.example', parent: null })],
      staged: { sources: { s1: src() }, brokers: [{ id: 'acme', name: 'Acme', website: 'https://other.example', sources: ['s1'] }] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect((await readB('acme')).website).toBe('https://acme.example');
    expect(r.rejected).toHaveLength(1);
    expect(r.rejected[0].reason).toMatch(/website/);
  });

  it('optOut: takes staged when existing is null; keeps a specific existing URL and records the staged one as an alternate', async () => {
    const oo = (url) => ({ method: 'web-form', url });
    await setup({
      brokers: [broker('a', 'A'), broker('b', 'B', { optOut: oo('https://b.example/x') })],
      staged: { sources: { s1: src() }, brokers: [
        { id: 'a', name: 'A', optOut: oo('https://a.example/o'), sources: ['s1'] },
        { id: 'b', name: 'B', optOut: oo('https://b.example/y'), sources: ['s1'] },
      ] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect((await readB('a')).optOut).toEqual(oo('https://a.example/o'));
    expect((await readB('b')).optOut).toEqual({ ...oo('https://b.example/x'), alternates: [{ site: 'b.example', url: 'https://b.example/y', source: 's1' }] });
    expect(r.rejected).toEqual([]);
  });

  it('optOut: a generic existing URL is replaced by a staged one on the same domain, unchecked', async () => {
    const oo = (url, extra = {}) => ({ method: 'web-form', url, ...extra });
    const s1 = src({ url: 'https://a.example/privacy' });
    await setup({
      brokers: [
        broker('a', 'A', { website: 'https://a.example', optOut: oo('https://www.a.example/privacy-policy', { status: 'verified', verifiedAt: '2026-10-18' }) }),
        broker('h', 'H', { optOut: oo('https://h.example', { status: 'verified' }) }),
        broker('k', 'K', { optOut: oo('https://k.example/opt', { status: 'blocked' }) }),
        broker('o', 'O', { optOut: oo('https://o.example/privacy') }),
        broker('n', 'N', { optOut: oo('https://n.example/privacy/') }),
      ],
      staged: { sources: { s1 }, brokers: [
        { id: 'a', name: 'A', optOut: oo('https://a.example/optout', { notes: 'form' }), sources: ['s1'] },
        { id: 'h', name: 'H', optOut: oo('https://h.example/remove'), sources: ['s1'] },
        { id: 'k', name: 'K', optOut: oo('https://k.example/opt-out-form'), sources: ['s1'] },
        { id: 'o', name: 'O', optOut: oo('https://dba.example/removal'), sources: ['s1'] },
        { id: 'n', name: 'N', optOut: oo('http://www.n.example/privacy'), sources: ['s1'] },
      ] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect((await readB('a')).optOut).toEqual(oo('https://a.example/optout', { notes: 'form', status: 'unchecked' }));
    expect((await readB('h')).optOut.url).toBe('https://h.example/remove');
    expect((await readB('k')).optOut.url).toBe('https://k.example/opt-out-form');
    expect((await readB('o')).optOut).toEqual({ ...oo('https://o.example/privacy'), alternates: [{ site: 'dba.example', url: 'https://dba.example/removal', source: 's1' }] });
    expect((await readB('n')).optOut).toEqual(oo('https://n.example/privacy/'));
    expect(r.rejected.filter((x) => /replaced by staged/.test(x.reason))).toHaveLength(3);
  });

  it('duplicate link unions sources and keeps stronger tier', async () => {
    await setup({
      brokers: [broker('p', 'P'), broker('c', 'C')],
      sources: { reg: src(), s0: src() },
      links: [link('p', 'c', { tier: 'C', claim: 'weak', sources: ['s0'] })],
      staged: { sources: { s1: src() }, links: [link('p', 'c', { tier: 'A', claim: 'strong', sources: ['s1'] })] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    const links = await readLinks();
    expect(links).toHaveLength(1);
    expect(links[0].tier).toBe('A');
    expect(links[0].claim).toBe('strong');
    expect(links[0].sources).toEqual(['s1']);
    expect(links[0].published).toBe(true);
    expect(r.rejected.some((x) => /superseded by stronger tier/.test(x.reason) && x.item.claim === 'weak')).toBe(true);
  });

  it('tier B staged link lands unpublished, even if staging says published', async () => {
    await setup({
      brokers: [broker('p', 'P'), broker('c', 'C')],
      staged: { sources: { s1: src() }, links: [link('p', 'c', { tier: 'B', published: true })] },
    });
    await mergeStaging(dir, 'fam');
    const [l] = await readLinks();
    expect(l.published).toBe(false);
  });

  it('new broker without source is rejected', async () => {
    await setup({ staged: { brokers: [{ id: 'nu', name: 'Nu', kind: ['marketing'], sources: [] }] } });
    const r = await mergeStaging(dir, 'fam');
    expect(r.added).toBe(0);
    expect(r.rejected[0].reason).toMatch(/source/);
    expect(await readdir(join(dir, 'brokers'))).toEqual([]);
  });

  it('new broker without kind is rejected unless it is an endpoint of an accepted link', async () => {
    await setup({
      brokers: [broker('p', 'P')],
      staged: {
        sources: { s1: src() },
        brokers: [
          { id: 'lonely', name: 'Lonely', kind: [], sources: ['s1'] },
          { id: 'linked', name: 'Linked', kind: [], sources: ['s1'] },
        ],
        links: [link('p', 'linked')],
      },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect((await readdir(join(dir, 'brokers'))).sort()).toEqual(['linked.json', 'p.json']);
    expect(r.rejected.some((x) => /kind/.test(x.reason))).toBe(true);
  });

  it('rejects sources without a valid archived URL and links citing only them', async () => {
    await setup({
      brokers: [broker('p', 'P'), broker('c', 'C')],
      staged: {
        sources: { bad: src({ archived: null }), ok: src() },
        links: [link('p', 'c', { sources: ['bad'] }), link('c', 'p', { sources: ['bad', 'ok'] }), link('p', 'c', { type: 'buys', sources: ['ok'] })],
      },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    const links = await readLinks();
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe('buys');
    expect(links[0].sources).toEqual(['ok']);
    expect(Object.keys(JSON.parse(await readFile(join(dir, 'sources.json'), 'utf8')))).toEqual(['reg', 'ok']);
    expect(r.rejected.length).toBeGreaterThanOrEqual(3);
    expect(r.rejected.some((x) => /claim may rest/.test(x.reason))).toBe(true);
  });

  it('matched staged broker with no usable sources contributes nothing', async () => {
    await setup({
      brokers: [broker('a', 'A')],
      staged: { sources: { bad: src({ archived: null }) }, brokers: [{ id: 'a', name: 'A', sells: ['x'], website: 'https://a.example', sources: ['bad'] }] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.updated).toBe(0);
    expect(await readB('a')).toEqual(broker('a', 'A'));
    expect(r.rejected.some((x) => x.item.id === 'a' && /source/.test(x.reason))).toBe(true);
  });

  it('logs every match with how it was made', async () => {
    await setup({
      idMap: { m: 'viaMap' },
      brokers: [broker('byid', 'By Id'), broker('bykey', 'By Key Inc'), broker('byalias', 'By Alias'), broker('viaMap', 'Via Map')],
      staged: { sources: { s1: src() }, brokers: [
        { id: 'byid', name: 'By Id', sources: ['s1'] },
        { id: 'k', name: 'BY KEY LLC', sources: ['s1'] },
        { id: 'al', name: 'Zzz', aliases: ['By Alias Corp'], sources: ['s1'] },
        { id: 'm', name: 'Whatever', sources: ['s1'] },
      ] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect([...r.matches].sort((x, y) => x.stagedId.localeCompare(y.stagedId))).toEqual([
      { stagedId: 'al', existingId: 'byalias', matchedBy: 'alias' },
      { stagedId: 'byid', existingId: 'byid', matchedBy: 'id' },
      { stagedId: 'k', existingId: 'bykey', matchedBy: 'legalKey' },
      { stagedId: 'm', existingId: 'viaMap', matchedBy: 'id-map' },
    ]);
  });

  it('rejects only the offending item for bad kind, tier, type, and self-links', async () => {
    await setup({
      brokers: [broker('p', 'P'), broker('c', 'C')],
      staged: { sources: { s1: src() },
        brokers: [{ id: 'nk', name: 'Nk', kind: ['bogus'], sources: ['s1'] }, { id: 'ok', name: 'Ok', kind: ['marketing'], sources: ['s1'] }],
        links: [link('p', 'c', { tier: 'Z' }), link('p', 'c', { type: 'weird' }), link('p', 'p'), link('p', 'c')] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect(r.added).toBe(1);
    expect(await readLinks()).toHaveLength(1);
    expect(r.rejected).toHaveLength(4);
    expect(r.rejected.some((x) => /self-link/.test(x.reason))).toBe(true);
  });

  it('id-map.json redirects staged ids and link endpoints', async () => {
    await setup({
      idMap: { 'acme-inc': 'acme' },
      brokers: [broker('acme', 'Acme'), broker('c', 'C')],
      staged: { sources: { s1: src() }, brokers: [{ id: 'acme-inc', name: 'Completely Different', sells: ['x'], sources: ['s1'] }], links: [link('acme-inc', 'c')] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect((await readB('acme')).sells).toEqual(['x']);
    expect((await readLinks())[0].from).toBe('acme');
  });

  it('an id-map entry is final: a mapped id that does not exist yet is created, never name-matched', async () => {
    await setup({
      idMap: { 'acme-holdco': 'acme-holdco', 'acme-plc': 'acme-group' },
      brokers: [broker('acme', 'Acme LLC'), broker('c', 'C')],
      staged: { sources: { s1: src() }, brokers: [
        { id: 'acme-holdco', name: 'Acme', kind: ['marketing'], sources: ['s1'] },
        { id: 'acme-plc', name: 'Acme PLC', aliases: ['Acme'], kind: ['marketing'], sources: ['s1'] },
      ], links: [link('acme-holdco', 'acme')] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect(r.added).toBe(2);
    expect(r.matches).toEqual([]);
    expect((await readB('acme-holdco')).name).toBe('Acme');
    expect((await readB('acme-group')).name).toBe('Acme PLC');
    expect((await readB('acme')).aliases).toEqual([]);
    expect((await readLinks())[0]).toMatchObject({ from: 'acme-holdco', to: 'acme' });
  });

  it('id-map.json must be family-scoped, and another family\'s scope does not apply', async () => {
    await setup({ config: { 'id-map.json': { x: 'y' } } });
    await expect(mergeStaging(dir, 'fam')).rejects.toThrow(/family-scoped/);
    await setup({
      config: { 'id-map.json': { other: { a: 'zzz' } } },
      brokers: [broker('a', 'A')],
      staged: { sources: { s1: src() }, brokers: [{ id: 'a', name: 'A', sells: ['x'], sources: ['s1'] }] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.matches).toEqual([{ stagedId: 'a', existingId: 'a', matchedBy: 'id' }]);
  });

  it('same-tier claim conflict goes to the higher-precedence source kind', async () => {
    const sources = { reg: src(), tenk: src({ kind: 'sec-10k', url: 'https://sec.gov/x' }), ftc: src({ kind: 'ftc-complaint', url: 'https://ftc.gov/x' }), court: src({ kind: 'court', url: 'https://court.gov/x' }) };
    await setup({
      sources,
      brokers: [broker('p', 'P'), broker('c', 'C'), broker('q', 'Q')],
      links: [
        { ...link('p', 'c', { type: 'supplies', claim: 'A 10-K says plaintiffs allege P sent data to C.', sources: ['tenk'] }), published: true },
        { ...link('q', 'c', { type: 'supplies', claim: 'FTC says Q sent data to C.', sources: ['ftc'] }), published: true },
      ],
      staged: { links: [
        link('p', 'c', { type: 'supplies', claim: 'Court record says P sent data to C.', sources: ['court'] }),
        link('q', 'c', { type: 'supplies', claim: 'Court record says Q sent data to C.', sources: ['court'] }),
      ] },
    });
    const r = await mergeStaging(dir, 'fam');
    const L = await readLinks();
    expect(L.find((l) => l.from === 'p').claim).toMatch(/^Court/);
    expect(L.find((l) => l.from === 'p').sources).toEqual(['court']);
    expect(L.find((l) => l.from === 'q').claim).toMatch(/^FTC/);
    expect(r.rejected.some((x) => /higher-precedence/.test(x.reason))).toBe(true);
    expect(r.rejected.some((x) => /source precedence; existing kept/.test(x.reason))).toBe(true);
  });

  it('sourceRank orders regulator > court > issuer statement > SEC summary of allegations > other', () => {
    const S = { f: { kind: 'ftc-order' }, c: { kind: 'court' }, k: { kind: 'sec-10k' }, j: { kind: 'journalism' } };
    const r = (sources, claim = 'x') => sourceRank({ sources, claim }, S);
    expect([r(['f']), r(['c']), r(['k']), r(['k'], 'class actions alleging x'), r(['j'])]).toEqual([5, 4, 3, 2, 1]);
  });

  it('link-overrides.json drops and unpublishes links, staged or existing', async () => {
    await setup({
      config: { 'link-overrides.json': {
        drop: [{ from: 'p', to: 'c', type: 'supplies', reason: 'succession' }, { from: 'q', to: 'c', type: 'owns', reason: 'old' }],
        unpublish: [{ from: 'p', to: 'q', type: 'buys', reason: 'inference' }],
      } },
      brokers: [broker('p', 'P'), broker('c', 'C'), broker('q', 'Q')],
      links: [{ ...link('q', 'c', { sources: ['reg'] }), published: true }],
      staged: { sources: { s1: src() }, links: [link('p', 'c', { type: 'supplies' }), link('p', 'q', { type: 'buys' })] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect(await readLinks()).toEqual([{ from: 'p', to: 'q', type: 'buys', tier: 'A', claim: 'c', sources: ['s1'], published: false }]);
    expect(r.rejected.filter((x) => /link-overrides/.test(x.reason))).toHaveLength(2);
  });

  it('alias-blocklist.json and record-overrides.json apply after the merge', async () => {
    await setup({
      config: {
        'alias-blocklist.json': { a: ['Bad Alias'] },
        'record-overrides.json': { n: { name: 'Legal Name, Inc.', parent: 'a', reason: 'source names it' } },
        'id-map.json': { fam: { n: 'n' } },
      },
      brokers: [broker('a', 'A')],
      staged: { sources: { s1: src() }, brokers: [
        { id: 'a', name: 'A', aliases: ['Bad Alias', 'Good Alias'], sources: ['s1'] },
        { id: 'n', name: 'Brand', aliases: ['Legal Name, Inc.'], kind: ['marketing'], sources: ['s1'] },
      ] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    expect((await readB('a')).aliases).toEqual(['Good Alias']);
    const n = await readB('n');
    expect([n.name, n.aliases, n.parent]).toEqual(['Legal Name, Inc.', ['Brand'], 'a']);
  });

  it('unions size signals and rejects ones citing rejected sources', async () => {
    await setup({
      brokers: [broker('a', 'A')],
      staged: { sources: { s1: src(), bad: src({ archived: '' }) }, brokers: [{ id: 'a', name: 'A', sources: ['s1'], size: { known: true, signals: [
        { kind: 'rev', value: '1', source: 's1' }, { kind: 'rev', value: '2', source: 'bad' }] } }] },
    });
    const r = await mergeStaging(dir, 'fam');
    const b = await readB('a');
    expect(b.size).toEqual({ known: true, signals: [{ kind: 'rev', value: '1', source: 's1' }] });
    expect(r.rejected.some((x) => /bad/.test(x.reason))).toBe(true);
  });

  it('result passes validateDataset; dry run writes nothing', async () => {
    await setup({
      brokers: [broker('p', 'P'), broker('c', 'C')],
      staged: { sources: { s1: src() }, links: [link('p', 'c')] },
    });
    const r = await mergeStaging(dir, 'fam', { dryRun: true });
    expect(r.errors).toEqual([]);
    expect(await readLinks()).toEqual([]);
    await mergeStaging(dir, 'fam');
    expect((await validateDataset(dir)).errors).toEqual([]);
  });

  it('writes nothing when the merged dataset fails validation', async () => {
    await setup({
      brokers: [broker('p', 'P')],
      staged: { sources: { s1: src() }, brokers: [{ id: 'p', name: 'P', parent: null, website: 5, sources: ['s1'] }] },
    });
    const { writeFile: wf } = await import('node:fs/promises');
    await wf(join(dir, 'brokers', 'q.json'), '{"id":"q"}');
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors.length).toBeGreaterThan(0);
    expect((await readB('p')).kind).toEqual(['marketing']);
  });
});
