// CLI + library: build src/data/broker-map.json (the game's view of the dataset).
// Run: npm run brokers:export. Cheap and deterministic; re-run after any dataset change.
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { computeReach, pickHubs } from './reach.js';
import { TIER_A_SOURCE_KINDS } from './schema.js';

// Bumped when the shape of broker-map.json changes in a way a reader must notice.
export const FORMAT_VERSION = 1;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const readJson = async (p) => JSON.parse(await readFile(p, 'utf8'));
const readOptional = async (p, fallback) => {
  try { return await readJson(p); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
};

// A record's `parent` is exported only when tier-A evidence backs it: a published `owns` link from the
// parent to the record, or a record-override that sets this parent and cites a tier-A source the record carries.
export function backedParent(b, { published, sources, recordOverrides }) {
  if (!b.parent) return null;
  if (published.some((l) => l.type === 'owns' && l.from === b.parent && l.to === b.id)) return b.parent;
  const ov = recordOverrides[b.id];
  const recSources = new Set((b.sources ?? []).map((s) => (typeof s === 'string' ? s : s?.id)));
  if (ov && ov.parent === b.parent && recSources.has(ov.source) && TIER_A_SOURCE_KINDS.includes(sources[ov.source]?.kind)) return b.parent;
  return null;
}

// optOut as the game reads it: a missing status means never checked.
const exportOptOut = (o) => (o ? { ...o, status: o.status ?? 'unchecked' } : null);

export async function buildExport(dir) {
  const { asOf } = await readJson(join(dir, 'DATASET.json'));
  const sources = await readJson(join(dir, 'sources.json'));
  const allLinks = await readJson(join(dir, 'links.json'));
  const recordOverrides = await readOptional(join(dir, 'build', 'record-overrides.json'), {});
  const files = (await readdir(join(dir, 'brokers'))).filter((f) => f.endsWith('.json'));
  const raw = [];
  for (const f of files) raw.push(await readJson(join(dir, 'brokers', f)));
  raw.sort((a, b) => cmp(a.id, b.id));

  const published = allLinks.filter((l) => l.published);
  const reach = computeReach(raw, published);
  // A hub must actually reach something; a lone broker is not a hub.
  const hubs = new Set(pickHubs(reach, 12).filter((id) => reach.get(id) > 1));

  const brokers = raw.map((b) => ({
    id: b.id, name: b.name, parent: backedParent(b, { published, sources, recordOverrides }), kind: b.kind,
    registries: b.registries, sells: b.sells ?? [], optOut: exportOptOut(b.optOut), missions: b.missions ?? [],
    reach: reach.get(b.id), hub: hubs.has(b.id),
  }));
  const links = published
    .map((l) => ({
      from: l.from, to: l.to, type: l.type, tier: l.tier, claim: l.claim,
      sources: l.sources.map((id) => {
        const s = sources[id];
        if (!s) throw new Error(`link ${l.from}->${l.to}: unknown source "${id}"`);
        return { url: s.url, archived: s.archived };
      }),
    }))
    .sort((a, b) => cmp(a.from, b.from) || cmp(a.to, b.to) || cmp(a.type, b.type));
  return { formatVersion: FORMAT_VERSION, asOf, brokers, links };
}

export const serialize = (data) => JSON.stringify(data, null, 2) + '\n';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const out = resolve(root, '../../src/data/broker-map.json');
  const data = await buildExport(root);
  const text = serialize(data);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, text);
  console.log(`wrote ${out}: ${data.brokers.length} brokers, ${data.links.length} links, ${(Buffer.byteLength(text) / 1024).toFixed(1)} KB`);
  for (const b of data.brokers.filter((x) => x.hub).sort((a, b) => b.reach - a.reach || cmp(a.id, b.id))) console.log(`hub ${b.id} reach=${b.reach}`);
}
