import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mergeStaging } from '../../research/data-brokers/build/merge-staging.js';
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
async function setup({ brokers = [], links = [], sources = { reg: src() }, staged = {}, idMap } = {}) {
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
  if (idMap) { await mkdir(join(dir, 'build')); await writeFile(join(dir, 'build', 'id-map.json'), J(idMap)); }
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

  it('optOut: takes staged when existing is null; keeps existing and rejects staged when they differ', async () => {
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
    expect((await readB('b')).optOut).toEqual(oo('https://b.example/x'));
    expect(r.rejected.map((x) => x.reason).join()).toMatch(/optOut/);
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
    expect(links[0].sources.sort()).toEqual(['s0', 's1']);
    expect(links[0].published).toBe(true);
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
        links: [link('p', 'c', { sources: ['bad'] }), link('c', 'p', { sources: ['bad', 'ok'] })],
      },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors).toEqual([]);
    const links = await readLinks();
    expect(links).toHaveLength(1);
    expect(links[0].sources).toEqual(['ok']);
    expect(Object.keys(JSON.parse(await readFile(join(dir, 'sources.json'), 'utf8')))).toEqual(['reg', 'ok']);
    expect(r.rejected.length).toBeGreaterThanOrEqual(2);
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
      staged: { sources: { s1: src() }, brokers: [{ id: 'p', name: 'P', kind: ['not-a-kind'], sources: ['s1'] }] },
    });
    const r = await mergeStaging(dir, 'fam');
    expect(r.errors.length).toBeGreaterThan(0);
    expect((await readB('p')).kind).toEqual(['marketing']);
  });
});
