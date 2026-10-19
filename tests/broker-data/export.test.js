import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildExport, serialize } from '../../research/data-brokers/build/export.js';

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'brokers-'));
  await mkdir(join(dir, 'brokers'));
  const mk = (id) => ({ id, name: id.toUpperCase(), aliases: [], parent: null, kind: ['marketing'], registries: {}, sells: [], optOut: { method: 'none' }, missions: [] });
  for (const id of ['b', 'a', 'c']) await writeFile(join(dir, 'brokers', `${id}.json`), JSON.stringify(mk(id)));
  await writeFile(join(dir, 'sources.json'), JSON.stringify({
    s1: { url: 'https://x.test/1', archived: 'https://web.archive.org/1', kind: 'filing', title: 't', accessed: '2026-10-18' },
  }));
  await writeFile(join(dir, 'links.json'), JSON.stringify([
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
});
