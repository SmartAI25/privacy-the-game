// Stages the industry member lists (README "Sweeps") as the `membership` research family, and writes build/sweeps.json.
// Input: staging/membership/lists/<sweep>.json, each
//   { sweep, name, source, sourceRecord: { url, archived, kind: 'member-list', title, accessed }, members: [{ name, website? }] }
// as transcribed from the industry body's own published list.
// A member is matched to an existing record only by legal name, with the same key merge-staging.js uses (legalKey);
// a shared brand, DBA or alias is never enough. Unmatched members become new `ad-network` records sourced to the list.
// Usage: node research/data-brokers/build/stage-membership.js, then merge-staging.js membership.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { legalKey } from './import-registry.js';
import { slugify } from './ids.js';

const fmt = (x) => `${JSON.stringify(x, null, 2)}\n`;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const addUnique = (arr, x) => { if (!arr.includes(x)) arr.push(x); };

// lists: [{ sweep, name, source, members: [{ name }] }]; brokers: the existing records.
// Returns { brokers: staged records sorted by id, sweeps: { <sweep>: { name, source, members } }, matches }.
export function stageMembers(lists, brokers) {
  // Same first-wins order as merge-staging.js, which reads brokers/ sorted by filename.
  const existing = [...brokers].sort((a, b) => cmp(`${a.id}.json`, `${b.id}.json`));
  const byKey = new Map();
  for (const b of existing) { const k = legalKey(b.name); if (!byKey.has(k)) byKey.set(k, b.id); }
  const taken = new Set(existing.map((b) => b.id));
  const staged = new Map(); // id -> staged record
  const newByKey = new Map();
  const sweeps = {};
  const matches = [];

  for (const list of lists) {
    const members = new Set();
    for (const m of list.members) {
      const name = String(m.name).trim();
      const k = legalKey(name);
      if (!k) throw new Error(`${list.sweep}: member "${m.name}" has an empty legal-name key`);
      let id = byKey.get(k);
      const matched = Boolean(id);
      if (!id) id = newByKey.get(k);
      if (!id) {
        const base = slugify(name);
        id = base;
        for (let i = 2; taken.has(id); i++) id = `${base}-${i}`;
        taken.add(id);
        newByKey.set(k, id);
      }
      let rec = staged.get(id);
      if (!rec) {
        rec = matched
          ? { id, name, aliases: [], sources: [] }
          : { id, name, aliases: [], parent: null, kind: ['ad-network'], registries: {}, sells: [], optOut: null, size: { known: false, signals: [] }, sources: [] };
        staged.set(id, rec);
      } else if (rec.name !== name) addUnique(rec.aliases, name);
      addUnique(rec.sources, list.source);
      rec.sources.sort();
      members.add(id);
      matches.push({ sweep: list.sweep, name, id, matched });
    }
    sweeps[list.sweep] = { name: list.name, source: list.source, members: [...members].sort() };
  }
  return { brokers: [...staged.values()].sort((a, b) => cmp(a.id, b.id)), sweeps, matches };
}

// Writes staging/<family>/{brokers/*.json, links.json, sources.json}. Replaces any earlier staged brokers.
export async function writeStaging(stDir, staged, sources) {
  const { writeFile, mkdir, rm } = await import('node:fs/promises');
  await rm(join(stDir, 'brokers'), { recursive: true, force: true });
  await mkdir(join(stDir, 'brokers'), { recursive: true });
  for (const b of staged.brokers) await writeFile(join(stDir, 'brokers', `${b.id}.json`), fmt(b));
  await writeFile(join(stDir, 'links.json'), fmt([]));
  await writeFile(join(stDir, 'sources.json'), fmt(sources));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFile, readdir, writeFile } = await import('node:fs/promises');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const stDir = join(root, 'staging', 'membership');
  const listFiles = (await readdir(join(stDir, 'lists'))).filter((f) => f.endsWith('.json')).sort();
  const lists = [];
  for (const f of listFiles) lists.push(JSON.parse(await readFile(join(stDir, 'lists', f), 'utf8')));
  const brokers = [];
  for (const f of (await readdir(join(root, 'brokers'))).filter((x) => x.endsWith('.json'))) brokers.push(JSON.parse(await readFile(join(root, 'brokers', f), 'utf8')));
  const staged = stageMembers(lists, brokers);
  await writeStaging(stDir, staged, Object.fromEntries(lists.map((l) => [l.source, l.sourceRecord])));
  await writeFile(join(root, 'build', 'sweeps.json'), fmt(staged.sweeps));
  for (const l of lists) {
    const ms = staged.matches.filter((m) => m.sweep === l.sweep);
    console.log(`${l.sweep}: ${ms.length} members, ${ms.filter((m) => m.matched).length} matched by legal name, ${ms.filter((m) => !m.matched).length} unmatched`);
  }
  console.log(`staged ${staged.brokers.length} records (${staged.brokers.filter((b) => b.kind).length} new); wrote build/sweeps.json`);
}
