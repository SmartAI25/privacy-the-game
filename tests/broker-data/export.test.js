import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildExport, serialize } from '../../research/data-brokers/build/export.js';

async function fixture({ links, noMissions = [] } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'brokers-'));
  await mkdir(join(dir, 'brokers'));
  const mk = (id) => ({ id, name: id.toUpperCase(), aliases: [], parent: null, kind: ['marketing'], registries: {}, sells: [], optOut: { method: 'none' }, missions: [] });
  for (const id of ['b', 'a', 'c']) {
    const b = mk(id);
    if (noMissions.includes(id)) delete b.missions;
    await writeFile(join(dir, 'brokers', `${id}.json`), JSON.stringify(b));
  }
  await writeFile(join(dir, 'sources.json'), JSON.stringify({
    s1: { url: 'https://x.test/1', archived: 'https://web.archive.org/1', kind: 'filing', title: 't', accessed: '2026-10-18' },
  }));
  await writeFile(join(dir, 'links.json'), JSON.stringify(links ?? [
    { from: 'b', to: 'c', type: 'supplies', tier: 'A', claim: 'pub', sources: ['s1'], published: true },
    { from: 'a', to: 'b', type: 'owns', tier: 'B', claim: 'unpub', sources: ['s1'], published: false },
  ]));
  await writeFile(join(dir, 'DATASET.json'), JSON.stringify({ asOf: '2026-01-02' }));
  return dir;
}

describe('buildExport', () => {
  it('export drops unpublished links', async () => {
    const out = await buildExport(await fixture());
    expect(out.asOf).toBe('2026-01-02');
    expect(out.links).toHaveLength(1);
    expect(out.links[0]).toEqual({ from: 'b', to: 'c', type: 'supplies', tier: 'A', claim: 'pub', sources: [{ url: 'https://x.test/1', archived: 'https://web.archive.org/1' }] });
    expect(out.brokers.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(out.brokers.find((x) => x.id === 'b').reach).toBe(2);
    expect(out.brokers.find((x) => x.id === 'b').hub).toBe(true);
    expect(out.brokers[0]).not.toHaveProperty('sells');
  });
  it('export is byte-identical across two runs', async () => {
    const dir = await fixture();
    expect(serialize(await buildExport(dir))).toBe(serialize(await buildExport(dir)));
  });
  it('emits missions as [] when a record has none', async () => {
    const out = await buildExport(await fixture({ noMissions: ['a'] }));
    expect(out.brokers.find((x) => x.id === 'a').missions).toEqual([]);
  });
  it('a broker that reaches nothing (reach 1) is never a hub, even in the top 12', async () => {
    const out = await buildExport(await fixture());
    expect(out.brokers.filter((x) => x.hub).map((x) => x.id)).toEqual(['b']);
    expect(out.brokers.find((x) => x.id === 'a').reach).toBe(1);
    expect(out.brokers.find((x) => x.id === 'c').hub).toBe(false);
  });
  it('throws on a published link citing an unknown source', async () => {
    const dir = await fixture({ links: [{ from: 'b', to: 'c', type: 'supplies', tier: 'A', claim: 'x', sources: ['nope'], published: true }] });
    await expect(buildExport(dir)).rejects.toThrow(/unknown source "nope"/);
  });
});
