import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateSweeps, validateLink, validateBroker, validateDataset, MEMBER_LIST_KIND, TIER_A_SOURCE_KINDS,
} from '../../research/data-brokers/build/schema.js';
import { stageMembers, writeStaging } from '../../research/data-brokers/build/stage-membership.js';
import { mergeStaging } from '../../research/data-brokers/build/merge-staging.js';
import { buildExport } from '../../research/data-brokers/build/export.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const J = (x) => `${JSON.stringify(x, null, 2)}\n`;
const source = (kind, extra = {}) => ({
  url: `https://example.org/${kind}`, archived: `https://web.archive.org/web/2026/https://example.org/${kind}`,
  kind, title: 'T', accessed: '2026-10-24', ...extra,
});
const sources = { nai: source(MEMBER_LIST_KIND), daa: source(MEMBER_LIST_KIND, { url: 'https://example.org/daa' }), tenk: source('sec-10k'), reg: source('registry') };
const brokerIds = new Set(['acme', 'criteo', 'zeta']);
const broker = (id, name, extra = {}) => ({
  id, name, aliases: [], parent: null, kind: [], registries: {}, sells: [], optOut: null,
  size: { known: false, signals: [] }, sources: ['reg'], ...extra,
});

let dir;
afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); dir = null; });

describe('validateSweeps', () => {
  const ok = { nai: { name: 'NAI opt-out tool', source: 'nai', members: ['acme', 'criteo'] }, daa: { name: 'DAA WebChoices', source: 'daa', members: ['zeta'] } };

  it('accepts well-formed sweeps', () => {
    expect(validateSweeps(ok, { brokerIds, sources })).toEqual([]);
  });

  it('validateSweeps rejects unknown members', () => {
    const errs = validateSweeps({ nai: { ...ok.nai, members: ['acme', 'nobody'] } }, { brokerIds, sources });
    expect(errs.some((e) => /nobody/.test(e))).toBe(true);
  });

  it('rejects a duplicate member, a missing source and an unknown sweep id', () => {
    expect(validateSweeps({ nai: { ...ok.nai, members: ['acme', 'acme'] } }, { brokerIds, sources }).some((e) => /duplicate/.test(e))).toBe(true);
    expect(validateSweeps({ nai: { ...ok.nai, source: 'gone' } }, { brokerIds, sources }).some((e) => /gone/.test(e))).toBe(true);
    expect(validateSweeps({ drop: { ...ok.nai } }, { brokerIds, sources }).some((e) => /drop/.test(e))).toBe(true);
  });

  it('validateSweeps rejects a non-member-list source', () => {
    const errs = validateSweeps({ nai: { ...ok.nai, source: 'tenk' } }, { brokerIds, sources });
    expect(errs.some((e) => /member-list/.test(e))).toBe(true);
  });
});

describe('member-list sources', () => {
  it('member-list is not a tier A kind', () => {
    expect(MEMBER_LIST_KIND).toBe('member-list');
    expect(TIER_A_SOURCE_KINDS).not.toContain(MEMBER_LIST_KIND);
  });

  it('a link citing a member-list source is rejected, published or not', () => {
    const sourceIds = new Set(Object.keys(sources));
    const sourceKinds = new Map(Object.entries(sources).map(([id, s]) => [id, s.kind]));
    const ctx = { brokerIds, sourceIds, sourceKinds };
    for (const published of [true, false]) {
      const l = { from: 'acme', to: 'criteo', type: 'supplies', tier: 'A', claim: 'c', sources: ['tenk', 'nai'], published };
      expect(validateLink(l, ctx)).toContain("link acme->criteo: a member-list source can't back a link");
    }
    expect(validateLink({ from: 'acme', to: 'criteo', type: 'supplies', tier: 'A', claim: 'c', sources: ['tenk'], published: true }, ctx)).toEqual([]);
  });

  it('a broker record may cite a member-list source', () => {
    const b = broker('newco', 'NewCo', { kind: ['ad-network'], registries: {}, sources: ['nai'] });
    expect(validateBroker(b, { sourceIds: new Set(Object.keys(sources)) })).toEqual([]);
  });

  it('the README merge loop includes membership', () => {
    const readme = readFileSync(join(root, 'research/data-brokers/README.md'), 'utf8');
    expect(readme).toMatch(/journalism membership; do/);
  });
});

describe('membership staging', () => {
  it('members match records by legal name only', async () => {
    dir = await mkdtemp(join(tmpdir(), 'sweeps-'));
    const existing = [
      broker('criteo', 'Criteo S.A.'),
      broker('meta', 'Meta Platforms', { aliases: ['Facebook'] }),
    ];
    await mkdir(join(dir, 'brokers'));
    for (const b of existing) await writeFile(join(dir, 'brokers', `${b.id}.json`), J(b));
    await writeFile(join(dir, 'links.json'), J([]));
    await writeFile(join(dir, 'sources.json'), J({ reg: sources.reg }));

    const lists = [{ sweep: 'nai', name: 'NAI opt-out tool', source: 'nai', members: [{ name: 'Criteo SA' }, { name: 'Facebook' }] }];
    const staged = stageMembers(lists, existing);
    // Criteo SA and Criteo S.A. share a legal name once normalized; Facebook is only meta's brand.
    expect(staged.sweeps.nai.members).toEqual(['criteo', 'facebook']);
    expect(staged.brokers.find((b) => b.id === 'facebook')).toMatchObject({
      name: 'Facebook', kind: ['ad-network'], registries: {}, optOut: null, size: { known: false, signals: [] }, sources: ['nai'],
    });
    await writeStaging(join(dir, 'staging', 'membership'), staged, { nai: sources.nai });

    const r = await mergeStaging(dir, 'membership');
    expect(r.errors).toEqual([]);
    const criteo = JSON.parse(await readFile(join(dir, 'brokers', 'criteo.json'), 'utf8'));
    expect(criteo.sources).toContain('nai');
    const meta = JSON.parse(await readFile(join(dir, 'brokers', 'meta.json'), 'utf8'));
    expect(meta.sources).not.toContain('nai');
    expect((await readdir(join(dir, 'brokers'))).sort()).toEqual(['criteo.json', 'facebook.json', 'meta.json']);
    expect(r.matches).toEqual([{ stagedId: 'criteo', existingId: 'criteo', matchedBy: 'id' }]);
  });

  it('gives a new record a fresh id when its slug is taken by a record with another legal name', () => {
    const existing = [broker('experian', 'Experian plc', { aliases: ['Experian'] })];
    const staged = stageMembers([{ sweep: 'daa', name: 'DAA WebChoices', source: 'daa', members: [{ name: 'Experian' }] }], existing);
    expect(staged.sweeps.daa.members).toEqual(['experian-2']);
  });

  it('one company on both lists is one record', () => {
    const lists = [
      { sweep: 'nai', name: 'NAI opt-out tool', source: 'nai', members: [{ name: 'Acme Ads' }] },
      { sweep: 'daa', name: 'DAA WebChoices', source: 'daa', members: [{ name: 'Acme Ads, Inc.' }] },
    ];
    const staged = stageMembers(lists, []);
    expect(staged.brokers).toHaveLength(1);
    expect(staged.brokers[0].sources).toEqual(['daa', 'nai']);
    expect(staged.sweeps.nai.members).toEqual(['acme-ads']);
    expect(staged.sweeps.daa.members).toEqual(['acme-ads']);
  });
});

describe('export sweeps', () => {
  async function fixture({ sweeps } = {}) {
    dir = await mkdtemp(join(tmpdir(), 'sweeps-export-'));
    await mkdir(join(dir, 'brokers'));
    await mkdir(join(dir, 'build'));
    for (const id of ['acme', 'criteo']) await writeFile(join(dir, 'brokers', `${id}.json`), J(broker(id, id.toUpperCase(), { sources: ['nai'] })));
    await writeFile(join(dir, 'sources.json'), J({ nai: sources.nai, reg: sources.reg }));
    await writeFile(join(dir, 'links.json'), J([]));
    await writeFile(join(dir, 'DATASET.json'), J({ asOf: '2026-10-24' }));
    if (sweeps) await writeFile(join(dir, 'build', 'sweeps.json'), J(sweeps));
    return dir;
  }

  it('export writes sweeps with archived sources', async () => {
    const out = await buildExport(await fixture({ sweeps: { nai: { name: 'NAI opt-out tool', source: 'nai', members: ['acme', 'criteo'] } } }));
    expect(out.formatVersion).toBe(1);
    expect(out.sweeps).toEqual({
      nai: { name: 'NAI opt-out tool', source: { url: sources.nai.url, archived: sources.nai.archived }, members: ['acme', 'criteo'] },
    });
  });

  it('export without sweeps.json writes no sweeps key', async () => {
    const out = await buildExport(await fixture());
    expect(out).not.toHaveProperty('sweeps');
  });

  it('validateDataset checks build/sweeps.json', async () => {
    const d = await fixture({ sweeps: { nai: { name: 'NAI opt-out tool', source: 'nai', members: ['acme', 'ghost'] } } });
    const { errors } = await validateDataset(d);
    expect(errors.some((e) => /ghost/.test(e))).toBe(true);
  });
});
