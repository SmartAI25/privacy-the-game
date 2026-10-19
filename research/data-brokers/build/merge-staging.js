// Folds research/data-brokers/staging/<family>/ into the dataset.
// Curation lives in build/ config, never in hand edits:
//   id-map.json         { family: { stagedId: canonicalId } }, final (no name matching)
//   alias-blocklist.json { brokerId: [alias] }, removed after the merge
//   alias-blocklist.json { brokerId: [{ alias, reason }] }
//   link-overrides.json { drop: [{from,to,type,reason}], unpublish: [...], reassign: [{from,to,type,newFrom,reason}],
//                         reclaim: [{from,to,type,claim,reason}] }
//     drop and reassign act on staged links (keys after id resolution); unpublish and reclaim on every
//     link (reclaim keys are final, i.e. after reassign). reclaim sets the narrower claim a fact-check found.
//   record-overrides.json { brokerId: { name?, parent?, sells?, source?, dropSources?, replaces?: {field: value}, reason } }
//     An override never silently replaces a different non-empty value: it applies only when the
//     current value is empty or equals replaces[field]; otherwise it is reported as a conflict.
// Same-tier claim conflicts go to the claim with the stronger source kind (sourceRank).
// optOut: a generic existing URL (homepage, privacy page, blocked) is replaced by a staged URL
// on the record's own domain; any other differing staged URL goes to optOut.alternates.
// Rules: match by id (or a final id-map.json entry) then legalKey(name), then staged alias; never overwrite a non-null scalar (conflicts go to
// `rejected`); arrays union; links dedupe on from|to|type; published is always tier === 'A'.
// Usage: node research/data-brokers/build/merge-staging.js <family> [--dry-run]
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { legalKey } from './import-registry.js';
import { registrableDomain } from './check-urls.js';
import { KINDS, LINK_TYPES, TIERS, validateDataset, validateSource } from './schema.js';

const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = (x) => typeof x === 'string' && x.trim() !== '';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const TIER_RANK = { A: 3, B: 2, C: 1 };
const fmt = (x) => `${JSON.stringify(x, null, 2)}\n`;
const srcId = (s) => (typeof s === 'string' ? s : s?.id);
const domainOf = (u) => { try { return registrableDomain(/^https?:/i.test(u) ? u : `https://${u}`); } catch { return null; } };
const normUrl = (u) => String(u).toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[/#?]+$/, '');
const domainLike = (a) => /^[\w.-]+\.[a-z]{2,}$/i.test(String(a).trim());

// Source-kind precedence for same-tier claim conflicts (higher wins):
// regulator order/complaint > court record > issuer's own SEC/statutory annual report >
// an SEC filing's summary of third-party allegations > anything else.
const REGULATOR = /^(ftc|cfpb|fcc|sec-order|doj|state-ag|regulator)/;
const ISSUER = new Set(['sec-10k', 'sec-20f', 'sec-40f', 'sec-8k', 'annual-report']);
const THIRD_PARTY = /\b(alleg\w*|putative class|plaintiffs?|lawsuits?)\b/i;
export function sourceRank(link, sources) {
  const kinds = (link.sources ?? []).map((id) => sources[id]?.kind ?? '');
  if (kinds.some((k) => REGULATOR.test(k))) return 5;
  if (kinds.includes('court')) return 4;
  if (kinds.some((k) => ISSUER.has(k))) return THIRD_PARTY.test(link.claim ?? '') ? 2 : 3;
  return 1;
}

// An existing opt-out that isn't really an opt-out: no URL, a homepage, a privacy-policy page, or unverifiable.
const PRIVACY_SEG = /^(privacy|privacy[-_]?(policy|notice|statement|center)(-\w+)?|[\w-]*-privacy-(policy|notice)|legal)$/;
const FORM_WORD = /request|choice|opt-?out|rights|dsr|form|portal|remov|suppress/;
export function isGenericOptOut(o) {
  if (!o?.url || o.status === 'blocked') return true;
  let u; try { u = new URL(o.url); } catch { return true; }
  const segs = u.pathname.toLowerCase().split('/').filter(Boolean);
  if (!segs.length) return true;
  const last = segs[segs.length - 1].replace(/\.(html?|aspx?|page|php)$/, '');
  return PRIVACY_SEG.test(last) && !FORM_WORD.test(last);
}

async function readJson(path, fallback) {
  const { readFile } = await import('node:fs/promises');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw new Error(`${path}: ${e.message}`); }
}

async function readBrokers(dir) {
  const { readdir } = await import('node:fs/promises');
  let files = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort(); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  const out = [];
  for (const f of files) out.push(await readJson(join(dir, f), null));
  return out.filter(Boolean);
}

const union = (a = [], b = []) => {
  const seen = new Set(); const out = [];
  for (const x of [...a, ...b]) { const k = typeof x === 'string' ? x : JSON.stringify(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
};

const newBroker = (id, name) => ({
  id, name, aliases: [], parent: null, kind: [], registries: {}, sells: [], optOut: null,
  size: { known: false, signals: [] }, sources: [],
});

export async function mergeStaging(datasetDir, family, { dryRun = false } = {}) {
  const { writeFile, mkdtemp, mkdir, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const stDir = join(datasetDir, 'staging', family);
  const rejected = [];
  const reject = (item, reason) => rejected.push({ item, reason });

  const existingBrokers = await readBrokers(join(datasetDir, 'brokers'));
  const links = await readJson(join(datasetDir, 'links.json'), []);
  const sources = await readJson(join(datasetDir, 'sources.json'), {});
  const cfg = (f, fb) => readJson(join(datasetDir, 'build', f), fb);
  const idMapAll = await cfg('id-map.json', {});
  if (Object.values(idMapAll).some((v) => typeof v === 'string')) throw new Error('id-map.json must be family-scoped: { "<family>": { stagedId: canonicalId } }');
  const idMap = idMapAll[family] ?? {};
  const aliasBlock = await cfg('alias-blocklist.json', {});
  const linkOv = await cfg('link-overrides.json', {});
  const recordOv = await cfg('record-overrides.json', {});
  const ovKey = (o) => `${o.from}|${o.to}|${o.type}`;
  const dropOv = new Map((linkOv.drop ?? []).map((o) => [ovKey(o), o]));
  const unpubOv = new Map((linkOv.unpublish ?? []).map((o) => [ovKey(o), o]));
  const reassignOv = new Map((linkOv.reassign ?? []).map((o) => [ovKey(o), o]));
  for (const o of linkOv.reclaim ?? []) {
    if (!isObj(o) || !isStr(o.from) || !isStr(o.to) || !isStr(o.type) || !isStr(o.claim) || !isStr(o.reason)) throw new Error(`link-overrides.json reclaim entries need from, to, type, claim and reason: ${JSON.stringify(o)}`);
  }
  const reclaimOv = new Map((linkOv.reclaim ?? []).map((o) => [ovKey(o), o]));
  for (const [id, list] of Object.entries(aliasBlock)) {
    if (!Array.isArray(list) || !list.every((x) => isObj(x) && isStr(x.alias) && isStr(x.reason))) throw new Error(`alias-blocklist.json ${id}: entries must be { alias, reason }`);
  }
  const stBrokers = await readBrokers(join(stDir, 'brokers'));
  const stLinks = await readJson(join(stDir, 'links.json'), []);
  const stSources = await readJson(join(stDir, 'sources.json'), {});

  // ---- sources
  const mergedSources = { ...sources };
  const usable = new Set(Object.keys(sources));
  const badSources = new Set();
  let sourcesAdded = 0;
  for (const [id, s] of Object.entries(stSources)) {
    const errs = validateSource(id, s);
    if (errs.length) { badSources.add(id); reject({ source: id }, `source ${id} rejected: ${errs.join('; ')}`); continue; }
    if (sources[id]) {
      if (sources[id].url !== s.url) { badSources.add(id); reject({ source: id }, `source ${id} rejected: id already used by a different url`); }
      continue;
    }
    mergedSources[id] = s; usable.add(id); sourcesAdded++;
  }
  const okSource = (id) => usable.has(id) && !badSources.has(id);

  // ---- broker identity resolution
  const work = new Map(existingBrokers.map((b) => [b.id, structuredClone(b)]));
  const isNew = new Set();
  const byKey = new Map();
  for (const b of existingBrokers) if (!byKey.has(legalKey(b.name))) byKey.set(legalKey(b.name), b.id);
  const mapId = (id) => idMap[id] ?? id;
  const resolved = new Map(); // staged id -> canonical id
  const matches = []; // [canonicalId, stagedRecord]
  const matchLog = [];
  for (const sb of stBrokers) {
    if (!isStr(sb.id) || !isStr(sb.name)) { reject(sb, 'staged broker needs id and name'); continue; }
    const badKind = (Array.isArray(sb.kind) ? sb.kind : []).filter((k) => !KINDS.includes(k));
    if (badKind.length) { reject(sb, `${sb.id}: unknown kind ${badKind.join(', ')}`); continue; }
    const mapped = mapId(sb.id);
    let target = null;
    let matchedBy = null;
    // An id-map entry is final: it names the record (existing or to be created) and skips name matching.
    const pinned = Object.hasOwn(idMap, sb.id);
    if (work.has(mapped)) { target = mapped; matchedBy = mapped === sb.id ? 'id' : 'id-map'; }
    else if (pinned) { /* new record under the mapped id */ }
    else if (byKey.has(legalKey(sb.name))) { target = byKey.get(legalKey(sb.name)); matchedBy = 'legalKey'; }
    else for (const a of sb.aliases ?? []) { if (isStr(a) && byKey.has(legalKey(a))) { target = byKey.get(legalKey(a)); matchedBy = 'alias'; break; } }
    if (!(sb.sources ?? []).some((s) => okSource(srcId(s)))) {
      reject(sb, `${sb.id}: staged broker has no usable (archived) source; contributes nothing`);
      if (target) resolved.set(sb.id, target);
      continue;
    }
    if (target && !isNew.has(target)) matchLog.push({ stagedId: sb.id, existingId: target, matchedBy });
    if (!target) {
      target = mapped;
      if (!work.has(target)) { work.set(target, newBroker(target, sb.name)); isNew.add(target); if (!byKey.has(legalKey(sb.name))) byKey.set(legalKey(sb.name), target); }
    }
    resolved.set(sb.id, target);
    matches.push([target, sb]);
  }
  const res = (id) => resolved.get(id) ?? mapId(id);

  // ---- links (first pass: sources + endpoints), then new-broker acceptance to a fixpoint
  const stagedFor = (id) => matches.filter(([t]) => t === id).map(([, sb]) => sb);
  let cand = [];
  for (const l of stLinks) {
    const nl = { ...l, from: res(l.from), to: res(l.to) };
    if (!LINK_TYPES.includes(l.type)) { reject(l, `link ${l.from}->${l.to} rejected: unknown type "${l.type}"`); continue; }
    if (!TIERS.includes(l.tier)) { reject(l, `link ${l.from}->${l.to} rejected: unknown tier "${l.tier}"`); continue; }
    if (nl.from === nl.to) { reject(l, `link ${l.from}->${l.to} rejected: self-link after resolution`); continue; }
    const srcs = l.sources ?? [];
    if (!srcs.length) { reject(l, `link ${l.from}->${l.to} rejected: no source`); continue; }
    const bad = srcs.filter((x) => !okSource(x));
    if (bad.length) { reject(l, `link ${l.from}->${l.to} rejected: cites rejected or unknown source(s) ${bad.join(', ')}; claim may rest on them`); continue; }
    cand.push(nl);
  }
  const brokerSourceOk = (id) => stagedFor(id).some((sb) => (sb.sources ?? []).some((s) => okSource(srcId(s))));
  const droppedNew = new Set();
  for (let changed = true; changed;) {
    changed = false;
    const live = cand.filter((l) => work.has(l.from) && work.has(l.to) && !droppedNew.has(l.from) && !droppedNew.has(l.to));
    const endpoints = new Set(live.flatMap((l) => [l.from, l.to]));
    for (const id of isNew) {
      if (droppedNew.has(id)) continue;
      const hasKind = stagedFor(id).some((sb) => Array.isArray(sb.kind) && sb.kind.length);
      let why = null;
      if (!brokerSourceOk(id)) why = 'new broker needs at least one usable source';
      else if (!hasKind && !endpoints.has(id)) why = 'new broker needs a kind (or must be an endpoint of an accepted link)';
      if (why) { droppedNew.add(id); changed = true; for (const sb of stagedFor(id)) reject(sb, `${sb.id}: ${why}`); }
    }
  }
  for (const id of droppedNew) { work.delete(id); isNew.delete(id); }

  // ---- optOut: replace a generic existing URL with a staged one on the record's own domain;
  // otherwise keep the existing one and record the staged URL as an alternate.
  const stagedSourceFor = (sb, url) => {
    const ok = (sb.sources ?? []).map(srcId).filter(okSource);
    return ok.find((s) => domainOf(mergedSources[s]?.url) === domainOf(url)) ?? ok[0];
  };
  function mergeOptOut(w, sb, id) {
    const o = sb.optOut;
    if (w.optOut === null || w.optOut === undefined) { w.optOut = o; return; }
    if (!isStr(o.url) || !/^https?:\/\//i.test(o.url)) {
      if (!Object.entries(o).every(([k, v]) => same(w.optOut[k], v))) reject({ broker: id, field: 'optOut', existing: w.optOut, staged: o }, `${id}: optOut conflicts with existing value (staged has no web URL); existing kept`);
      return;
    }
    if (w.optOut.url && normUrl(w.optOut.url) === normUrl(o.url)) return; // near-identical: leave alone
    // The record's own domains, plus the domains the registry lists as its DBAs (domain-like aliases).
    const own = new Set([domainOf(w.website ?? ''), domainOf(w.optOut.url ?? ''), ...w.aliases.filter(domainLike).map((a) => domainOf(a.trim()))].filter(Boolean));
    const d = domainOf(o.url);
    const src = stagedSourceFor(sb, o.url);
    if (isGenericOptOut(w.optOut) && own.has(d) && src) {
      const prev = w.optOut;
      w.optOut = { ...o, status: 'unchecked' };
      if (prev.alternates) w.optOut.alternates = prev.alternates;
      reject({ broker: id, field: 'optOut', existing: prev, staged: o }, `${id}: generic optOut ${prev.url ?? '(none)'} replaced by staged ${o.url}`);
      return;
    }
    if (!src) { reject({ broker: id, field: 'optOut', staged: o }, `${id}: staged optOut has no usable source; not recorded`); return; }
    const alts = w.optOut.alternates ?? [];
    if (!alts.some((a) => normUrl(a.url) === normUrl(o.url))) w.optOut.alternates = [...alts, { site: new URL(o.url).hostname.replace(/^www\./, ''), url: o.url, source: src }];
  }

  // ---- merge broker fields
  const touched = new Set();
  const added = new Set();
  const updated = new Set();
  const SKIP = new Set(['id', 'name', 'aliases', 'parent', 'kind', 'sells', 'missions', 'sources', 'size', 'registries', 'optOut']);
  for (const [id, sb] of matches) {
    const w = work.get(id);
    if (!w) continue;
    const before = JSON.stringify(w);
    const conflict = (field, existing, staged) => reject({ broker: id, field, existing, staged }, `${id}: ${field} conflicts with existing value; existing kept`);
    if (sb.name !== w.name && isStr(sb.name)) w.aliases = union(w.aliases, [sb.name]);
    w.aliases = union(w.aliases, (sb.aliases ?? []).filter(isStr)).filter((a) => a !== w.name);
    for (const f of ['kind', 'sells', 'missions']) if (Array.isArray(sb[f])) w[f] = union(w[f] ?? [], sb[f]);
    w.sources = union(w.sources, (sb.sources ?? []).map(srcId).filter(okSource));
    if (sb.parent !== undefined && sb.parent !== null) {
      const p = res(sb.parent);
      if (!work.has(p) || droppedNew.has(p)) reject({ broker: id, field: 'parent', staged: sb.parent }, `${id}: parent "${sb.parent}" not in dataset`);
      else if (w.parent === null || w.parent === undefined) w.parent = p;
      else if (w.parent !== p) conflict('parent', w.parent, p);
    }
    if (isObj(sb.registries)) for (const [k, v] of Object.entries(sb.registries)) {
      if (v === null || v === undefined) { if (!(k in w.registries)) w.registries[k] = null; continue; }
      if (w.registries[k] === null || w.registries[k] === undefined) w.registries[k] = v;
      else if (w.registries[k] !== v) conflict(`registries.${k}`, w.registries[k], v);
    }
    if (isObj(sb.optOut)) mergeOptOut(w, sb, id);
    if (isObj(sb.size) && Array.isArray(sb.size.signals)) {
      const keep = [];
      for (const s of sb.size.signals) {
        if (okSource(s?.source)) keep.push(s);
        else reject({ broker: id, signal: s }, `${id}: size signal cites rejected or unknown source ${s?.source}`);
      }
      w.size.signals = union(w.size.signals, keep);
      w.size.known = w.size.known || w.size.signals.length > 0;
    }
    for (const [k, v] of Object.entries(sb)) {
      if (SKIP.has(k) || v === null || v === undefined) continue;
      if (w[k] === null || w[k] === undefined) w[k] = v;
      else if (!same(w[k], v)) conflict(k, w[k], v);
    }
    if (isNew.has(id)) { added.add(id); touched.add(id); }
    else if (JSON.stringify(w) !== before) { updated.add(id); touched.add(id); }
  }

  // ---- merge links
  const finalLinks = links.map((l) => ({ ...l }));
  const idx = new Map(finalLinks.map((l, i) => [`${l.from}|${l.to}|${l.type}`, i]));
  let linksAdded = 0; let linksUpdated = 0;
  for (const l0 of cand) {
    const k0 = `${l0.from}|${l0.to}|${l0.type}`;
    if (dropOv.has(k0)) { reject(l0, `link ${k0}: dropped by link-overrides.json (${dropOv.get(k0).reason})`); continue; }
    const ra = reassignOv.get(k0);
    const l = ra ? { ...l0, from: ra.newFrom } : l0;
    if (ra) reject({ link: k0, newFrom: ra.newFrom }, `link ${k0}: reassigned to from=${ra.newFrom} by link-overrides.json (${ra.reason})`);
    if (!work.has(l.from) || !work.has(l.to)) {
      reject(l, `link ${l.from}->${l.to} rejected: endpoint not in dataset or rejected`);
      continue;
    }
    const key = `${l.from}|${l.to}|${l.type}`;
    const clean = { from: l.from, to: l.to, type: l.type, tier: l.tier, claim: l.claim, sources: l.sources };
    if (!idx.has(key)) {
      finalLinks.push({ ...clean, published: clean.tier === 'A' });
      idx.set(key, finalLinks.length - 1); linksAdded++;
      continue;
    }
    const cur = finalLinks[idx.get(key)];
    const tl = TIER_RANK[l.tier] ?? 0; const tc = TIER_RANK[cur.tier] ?? 0;
    const sameTierStronger = tl === tc && l.claim !== cur.claim && sourceRank(l, mergedSources) > sourceRank(cur, mergedSources);
    if (tl < tc || (tl === tc && l.claim !== cur.claim && !sameTierStronger)) {
      reject(l, `link ${key}: claim differs from existing at the same or stronger tier and source precedence; existing kept`);
      continue;
    }
    if (tl > tc || sameTierStronger) {
      reject({ claim: cur.claim, tier: cur.tier, sources: cur.sources, link: key }, `link ${key}: superseded by ${tl > tc ? 'stronger tier' : 'higher-precedence source kind'}`);
      cur.tier = l.tier; cur.claim = l.claim; cur.sources = [...l.sources];
    } else cur.sources = union(cur.sources, l.sources);
    cur.published = cur.tier === 'A';
    linksUpdated++;
  }

  for (const l of finalLinks) if (unpubOv.has(`${l.from}|${l.to}|${l.type}`)) l.published = false;
  for (const [k, o] of reclaimOv) {
    const l = idx.has(k) ? finalLinks[idx.get(k)] : null;
    if (!l) { reject({ link: k, reclaim: o.claim }, `link ${k}: reclaim has no matching link yet; not applied`); continue; }
    if (l.claim === o.claim) continue;
    reject({ link: k, claim: l.claim, newClaim: o.claim }, `link ${k}: claim replaced by link-overrides.json reclaim (${o.reason})`);
    l.claim = o.claim;
  }

  // ---- record overrides and alias blocklist (config, applied to every record every run)
  const empty = (v) => v === null || v === undefined || (Array.isArray(v) && v.length === 0);
  for (const [id, ov] of Object.entries(recordOv)) {
    const w = work.get(id);
    if (!w) continue;
    if (ov.parent && !work.has(ov.parent)) { // parent record arrives with a later family
      reject({ broker: id, override: ov }, `${id}: record-overrides parent "${ov.parent}" not in dataset yet; deferred, nothing applied`);
      continue;
    }
    if (ov.source !== undefined && !mergedSources[ov.source]) { reject({ broker: id, override: ov }, `${id}: record-overrides cites unknown source ${ov.source}; not applied`); continue; }
    const before = JSON.stringify(w);
    for (const f of ['name', 'parent', 'sells']) {
      if (!(f in ov) || same(w[f], ov[f])) continue;
      const ok = empty(w[f]) || (isObj(ov.replaces) && f in ov.replaces && same(ov.replaces[f], w[f]));
      if (!ok) { reject({ broker: id, field: f, existing: w[f], override: ov[f] }, `${id}: record-overrides ${f} would overwrite ${JSON.stringify(w[f])}; not applied (confirm it in "replaces")`); continue; }
      if (f === 'name') w.aliases = union(w.aliases, [w.name]);
      w[f] = ov[f];
    }
    if (ov.source) w.sources = union(w.sources, [ov.source]);
    if (Array.isArray(ov.dropSources)) w.sources = w.sources.filter((x) => !ov.dropSources.includes(srcId(x)));
    w.aliases = w.aliases.filter((a) => a !== w.name);
    if (JSON.stringify(w) !== before) touched.add(id);
  }
  for (const [id, list] of Object.entries(aliasBlock)) {
    const w = work.get(id);
    if (!w) continue;
    const kept = w.aliases.filter((a) => !list.some((x) => x.alias === a));
    if (kept.length !== w.aliases.length) { w.aliases = kept; touched.add(id); }
  }

  // ---- validate in a scratch copy, then write
  const scratch = await mkdtemp(join(tmpdir(), 'merge-staging-validate-'));
  let errors = [];
  try {
    await mkdir(join(scratch, 'brokers'));
    for (const [id, b] of work) await writeFile(join(scratch, 'brokers', `${id}.json`), fmt(b));
    await writeFile(join(scratch, 'links.json'), fmt(finalLinks));
    await writeFile(join(scratch, 'sources.json'), fmt(mergedSources));
    errors = (await validateDataset(scratch)).errors;
  } finally { await rm(scratch, { recursive: true, force: true }); }

  const result = { added: added.size, updated: updated.size, linksAdded, linksUpdated, sourcesAdded, rejected, matches: matchLog, errors, written: false };
  if (errors.length || dryRun) return result;

  await mkdir(join(datasetDir, 'brokers'), { recursive: true });
  for (const id of touched) await writeFile(join(datasetDir, 'brokers', `${id}.json`), fmt(work.get(id)));
  await writeFile(join(datasetDir, 'links.json'), fmt(finalLinks));
  await writeFile(join(datasetDir, 'sources.json'), fmt(mergedSources));
  result.written = true;
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const family = args.find((a) => !a.startsWith('--'));
  if (!family) { console.error('usage: merge-staging.js <family> [--dry-run]'); process.exit(2); }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const r = await mergeStaging(root, family, { dryRun });
  if (r.errors.length) {
    for (const e of r.errors) console.error(e);
    if (r.rejected.length) console.error(JSON.stringify(r.rejected, null, 2));
    console.error(`${r.errors.length} validation error(s); nothing written`);
    process.exit(1);
  }
  console.log(JSON.stringify({ family, dryRun, added: r.added, updated: r.updated, linksAdded: r.linksAdded, linksUpdated: r.linksUpdated, sourcesAdded: r.sourcesAdded, rejected: r.rejected.length }));
  if (dryRun) { if (r.rejected.length) console.log(JSON.stringify(r.rejected, null, 2)); }
  else {
    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(join(root, 'staging', family), { recursive: true });
    await writeFile(join(root, 'staging', family, 'REJECTED.json'), fmt(r.rejected));
    await writeFile(join(root, 'staging', family, 'MATCHES.json'), fmt(r.matches));
  }
}
