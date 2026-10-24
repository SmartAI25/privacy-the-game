// Stages the industry member lists (README "Sweeps") as the `membership` research family, and writes build/sweeps.json.
// Input: staging/membership/lists/<sweep>.json, each
//   { list, sweep?, name?, source, sourceRecord: { url, archived, kind: 'member-list', title, accessed }, members: [{ name, website? }] }
// as transcribed from the industry body's own published list. `sweep` is set only for a list that is one opt-out tool:
// the DAA's WebChoices. The NAI list has none: since at least 2026-10-24 the NAI runs no one-shot opt-out, so its
// members source records but get no halo.
// A member is matched to an existing record only by legal name, with the same key merge-staging.js uses (legalKey);
// a shared brand, DBA or alias is never enough, unless build/id-map.json's `membership` family pins it with a reason.
// Unmatched members become new `ad-network` records sourced to the list.
// Usage: node research/data-brokers/build/stage-membership.js, then merge-staging.js membership.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { legalKey } from './import-registry.js';
import { slugify } from './ids.js';

const fmt = (x) => `${JSON.stringify(x, null, 2)}\n`;
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const addUnique = (arr, x) => { if (!arr.includes(x)) arr.push(x); };

// lists: [{ list, sweep?, name?, source, members: [{ name }] }]; brokers: the existing records.
// pins: build/id-map.json's `membership` family, { <candidate id>: { id, reason } }. A pin moves a member from the id
// the name rule gives it (an existing record's id, or a new slug) onto `id`: an existing record, or another listed
// member's new record (two list names for one company). Pins are curated with a documented tie; see NOTES.md.
// Only a list with a `sweep` emits one into sweeps.json; the others source records only.
// Returns { brokers: staged records sorted by id, sweeps: { <sweep>: { name, source, members } }, matches }.
export function stageMembers(lists, brokers, { pins = {} } = {}) {
  // A record whose every source is one of these lists exists only because of an earlier membership merge, so it
  // is not an existing record here: restaging the committed tree then gives the same staging as the first run.
  const listSources = new Set(lists.map((l) => l.source));
  const listOnly = (b) => Array.isArray(b.sources) && b.sources.length > 0 && b.sources.every((x) => listSources.has(typeof x === 'string' ? x : x?.id));
  // Same first-wins order as merge-staging.js, which reads brokers/ sorted by filename.
  const existing = brokers.filter((b) => !listOnly(b)).sort((a, b) => cmp(`${a.id}.json`, `${b.id}.json`));
  const existingIds = new Set(existing.map((b) => b.id));
  const byKey = new Map();
  for (const b of existing) { const k = legalKey(b.name); if (!byKey.has(k)) byKey.set(k, b.id); }
  const taken = new Set(existingIds);
  const newByKey = new Map();

  // Pass 1: the id the legal-name rule gives each listing, before any pin.
  const listings = [];
  for (const list of lists) {
    for (const m of list.members) {
      const name = String(m.name).trim();
      const k = legalKey(name);
      if (!k) throw new Error(`${list.list ?? list.sweep}: member "${m.name}" has an empty legal-name key`);
      let cand = byKey.get(k) ?? newByKey.get(k);
      if (!cand) {
        const base = slugify(name);
        cand = base;
        for (let i = 2; taken.has(cand); i++) cand = `${base}-${i}`;
        taken.add(cand);
        newByKey.set(k, cand);
      }
      listings.push({ list, name, cand });
    }
  }
  const candIds = new Set(listings.map((l) => l.cand));

  // Pass 2: apply pins, then build one staged record per final id.
  const finalOf = (cand) => {
    const p = pins[cand];
    if (p === undefined) return cand;
    const id = typeof p === 'string' ? p : p?.id;
    if (!existingIds.has(id) && !(candIds.has(id) && !pins[id])) throw new Error(`membership pin ${cand} -> ${id}: no such record or listed member`);
    return id;
  };
  const ownName = new Map(); // new record id -> the name of the listing whose own candidate id it is
  for (const l of listings) if (!existingIds.has(l.cand) && !ownName.has(l.cand)) ownName.set(l.cand, l.name);
  const staged = new Map();
  const sweeps = {};
  const members = new Map();
  const matches = [];
  for (const l of listings) {
    const id = finalOf(l.cand);
    const matched = existingIds.has(id);
    let rec = staged.get(id);
    if (!rec) {
      const name = matched ? l.name : ownName.get(id);
      rec = matched
        ? { id, name, aliases: [], sources: [] }
        : { id, name, aliases: [], parent: null, kind: ['ad-network'], registries: {}, sells: [], optOut: null, size: { known: false, signals: [] }, sources: [] };
      staged.set(id, rec);
    }
    if (rec.name !== l.name) addUnique(rec.aliases, l.name);
    addUnique(rec.sources, l.list.source);
    rec.sources.sort();
    const key = l.list.list ?? l.list.sweep;
    if (!members.has(key)) members.set(key, new Set());
    members.get(key).add(id);
    matches.push({ list: key, name: l.name, id, matched, ...(id !== l.cand ? { pinned: true } : {}) });
  }
  for (const list of lists) {
    if (!list.sweep) continue;
    sweeps[list.sweep] = { name: list.name, source: list.source, members: [...(members.get(list.list ?? list.sweep) ?? [])].sort() };
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
  const idMap = JSON.parse(await readFile(join(root, 'build', 'id-map.json'), 'utf8'));
  const staged = stageMembers(lists, brokers, { pins: idMap.membership ?? {} });
  await writeStaging(stDir, staged, Object.fromEntries(lists.map((l) => [l.source, l.sourceRecord])));
  await writeFile(join(root, 'build', 'sweeps.json'), fmt(staged.sweeps));
  for (const l of lists) {
    const ms = staged.matches.filter((m) => m.list === l.list);
    console.log(`${l.list}: ${ms.length} members, ${ms.filter((m) => m.matched && !m.pinned).length} matched by legal name, ${ms.filter((m) => m.pinned).length} pinned, ${ms.filter((m) => !m.matched).length} on new records${l.sweep ? '' : ' (no sweep)'}`);
  }
  console.log(`staged ${staged.brokers.length} records (${staged.brokers.filter((b) => b.kind).length} new); wrote build/sweeps.json`);
}
