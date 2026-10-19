// Schema constants and validators for the open data-broker dataset.
// Validators return arrays of error strings; empty means valid.

export const KINDS = Object.freeze(['people-search', 'marketing', 'risk-identity', 'location', 'financial', 'health', 'automotive', 'identity-resolution', 'data-marketplace', 'ad-network', 'buyer']);
export const OPT_OUT_METHODS = Object.freeze(['web-form', 'email', 'mail', 'portal', 'sweep-only', 'none']);
export const LINK_TYPES = Object.freeze(['owns', 'supplies', 'buys', 'matches-identity']);
export const TIERS = Object.freeze(['A', 'B', 'C']);
export const OPT_OUT_STATUSES = Object.freeze(['verified', 'suspect', 'dead', 'blocked', 'unchecked']);
export const REGISTRY_KEYS = Object.freeze(['CA', 'VT', 'TX', 'OR']);

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isStr = (x) => typeof x === 'string' && x.trim() !== '';
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

export function validateSource(id, s) {
  const p = `source ${id}`;
  if (!isObj(s)) return [`${p}: must be an object`];
  const errs = [];
  if (!isStr(s.url)) errs.push(`${p}: url is required`);
  if (!isStr(s.archived)) errs.push(`${p}: archived copy is required`);
  else if (!s.archived.startsWith('https://web.archive.org/')) errs.push(`${p}: archived must be an https://web.archive.org/ URL`);
  if (!isStr(s.kind)) errs.push(`${p}: kind is required`);
  if (!isStr(s.title)) errs.push(`${p}: title is required`);
  if (!isStr(s.accessed) || !DATE.test(s.accessed)) errs.push(`${p}: accessed must be YYYY-MM-DD`);
  return errs;
}

function validateOptOut(o, p, sourceIds) {
  if (o === null) return [];
  if (!isObj(o)) return [`${p}: optOut must be an object or null`];
  const errs = [];
  if (!OPT_OUT_METHODS.includes(o.method)) {
    errs.push(`${p}: optOut.method must be one of ${OPT_OUT_METHODS.join('|')}`);
    return errs;
  }
  if (o.method === 'web-form' || o.method === 'portal') {
    if (!isStr(o.url)) errs.push(`${p}: optOut.url is required for ${o.method}`);
  } else if (o.method === 'email') {
    if (!isStr(o.url) && !isStr(o.email)) errs.push(`${p}: optOut needs url (mailto:) or email for email method`);
  }
  if (o.status !== undefined && !OPT_OUT_STATUSES.includes(o.status)) errs.push(`${p}: optOut.status must be one of ${OPT_OUT_STATUSES.join('|')}`);
  if (o.verifiedAt !== undefined && o.verifiedAt !== null && !(isStr(o.verifiedAt) && DATE.test(o.verifiedAt))) errs.push(`${p}: optOut.verifiedAt must be YYYY-MM-DD`);
  // Other opt-out routes a source documents (a DBA site's own form, a newer page) beside the main one.
  if (o.alternates !== undefined) {
    if (!Array.isArray(o.alternates)) errs.push(`${p}: optOut.alternates must be an array`);
    else for (const [i, a] of o.alternates.entries()) {
      if (!isObj(a) || !isStr(a.site)) errs.push(`${p}: optOut.alternates[${i}] needs site`);
      if (!isStr(a?.url) || !/^https?:\/\/\S+$/i.test(a.url)) errs.push(`${p}: optOut.alternates[${i}].url must be an http(s) URL`);
      if (!sourceIds.has(a?.source)) errs.push(`${p}: optOut.alternates[${i}] source "${a?.source}" not in sources.json`);
    }
  }
  return errs;
}

export function validateBroker(b, { sourceIds = new Set() } = {}) {
  if (!isObj(b)) return ['broker: must be an object'];
  const p = `broker ${b.id ?? '(no id)'}`;
  const errs = [];
  if (!isStr(b.id)) errs.push(`${p}: id is required`);
  if (!isStr(b.name)) errs.push(`${p}: name is required`);
  if (!Array.isArray(b.aliases) || !b.aliases.every(isStr)) errs.push(`${p}: aliases must be an array of strings`);
  if (b.parent !== null && !isStr(b.parent)) errs.push(`${p}: parent must be a broker id or null`);
  // An empty kind list is allowed: the registry import flags unknown categories that way.
  if (!Array.isArray(b.kind)) errs.push(`${p}: kind must be an array`);
  else for (const k of b.kind) if (!KINDS.includes(k)) errs.push(`${p}: unknown kind "${k}"`);
  if (!isObj(b.registries)) errs.push(`${p}: registries must be an object`);
  else {
    for (const [k, v] of Object.entries(b.registries)) {
      if (!REGISTRY_KEYS.includes(k)) errs.push(`${p}: unknown registry "${k}"`);
      else if (v !== null && !isStr(v)) errs.push(`${p}: registries.${k} must be a year string or null`);
    }
  }
  if (!Array.isArray(b.sells) || !b.sells.every(isStr)) errs.push(`${p}: sells must be an array of strings`);
  if (b.optOut === undefined) errs.push(`${p}: optOut is required (use null if unknown)`);
  else errs.push(...validateOptOut(b.optOut, p, sourceIds));
  if (b.missions !== undefined && !(Array.isArray(b.missions) && b.missions.every(isStr))) errs.push(`${p}: missions must be an array of strings`);

  if (!isObj(b.size) || typeof b.size.known !== 'boolean' || !Array.isArray(b.size.signals)) errs.push(`${p}: size must be {known:boolean, signals:[]}`);
  else {
    if (!b.size.known && b.size.signals.length) errs.push(`${p}: size.known false must have empty signals`);
    for (const [i, s] of b.size.signals.entries()) {
      if (!isObj(s) || !isStr(s.kind) || !isStr(s.value)) errs.push(`${p}: size.signals[${i}] needs kind and value`);
      else if (!sourceIds.has(s.source)) errs.push(`${p}: size.signals[${i}] source "${s.source}" not in sources.json`);
    }
  }

  if (!Array.isArray(b.sources)) errs.push(`${p}: sources must be an array`);
  else {
    for (const s of b.sources) {
      const id = typeof s === 'string' ? s : s?.id;
      if (!sourceIds.has(id)) errs.push(`${p}: source "${id}" not in sources.json`);
    }
  }
  return errs;
}

export function validateLink(l, { brokerIds = new Set(), sourceIds = new Set() } = {}) {
  if (!isObj(l)) return ['link: must be an object'];
  const p = `link ${l.from}->${l.to}`;
  const errs = [];
  if (!brokerIds.has(l.from)) errs.push(`${p}: unknown from broker "${l.from}"`);
  if (!brokerIds.has(l.to)) errs.push(`${p}: unknown to broker "${l.to}"`);
  if (!LINK_TYPES.includes(l.type)) errs.push(`${p}: type must be one of ${LINK_TYPES.join('|')}`);
  if (!TIERS.includes(l.tier)) errs.push(`${p}: tier must be one of ${TIERS.join('|')}`);
  if (!isStr(l.claim)) errs.push(`${p}: claim is required`);
  if (!Array.isArray(l.sources) || l.sources.length === 0) errs.push(`${p}: at least one source is required`);
  else for (const s of l.sources) if (!sourceIds.has(s)) errs.push(`${p}: source "${s}" not in sources.json`);
  if (l.published !== undefined && typeof l.published !== 'boolean') errs.push(`${p}: published must be boolean`);
  if (l.published === true && l.tier !== 'A') errs.push(`${p}: only tier A may be published`);
  return errs;
}

async function readJson(path, errors, fallback) {
  const { readFile } = await import('node:fs/promises');
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    errors.push(`${path}: ${e.message}`);
    return fallback;
  }
}

// Reads only brokers/*.json, links.json and sources.json under `dir`; staging/ is never touched.
export async function validateDataset(dir) {
  const { readdir } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const errors = [];

  const sources = await readJson(join(dir, 'sources.json'), errors, {});
  const links = await readJson(join(dir, 'links.json'), errors, []);
  const sourceIds = new Set();
  if (!isObj(sources)) errors.push('sources.json: must be an object');
  else for (const [id, s] of Object.entries(sources)) { sourceIds.add(id); errors.push(...validateSource(id, s)); }
  if (!Array.isArray(links)) errors.push('links.json: must be an array');

  let files = [];
  try { files = (await readdir(join(dir, 'brokers'))).filter((f) => f.endsWith('.json')).sort(); }
  catch (e) { if (e.code !== 'ENOENT') errors.push(`brokers/: ${e.message}`); }

  const brokers = [];
  const seen = new Map();
  for (const f of files) {
    const b = await readJson(join(dir, 'brokers', f), errors, null);
    if (!b) continue;
    brokers.push(b);
    if (b.id !== f.slice(0, -5)) errors.push(`brokers/${f}: id "${b.id}" does not match filename`);
    if (seen.has(b.id)) errors.push(`duplicate broker id "${b.id}" (${seen.get(b.id)} and ${f})`);
    else seen.set(b.id, f);
    errors.push(...validateBroker(b, { sourceIds }));
  }
  const brokerIds = new Set(seen.keys());
  for (const b of brokers) {
    if (isStr(b.parent) && !brokerIds.has(b.parent)) errors.push(`broker ${b.id}: parent "${b.parent}" does not exist`);
  }
  const linkList = Array.isArray(links) ? links : [];
  for (const l of linkList) errors.push(...validateLink(l, { brokerIds, sourceIds }));

  return {
    errors,
    counts: { brokers: brokers.length, links: linkList.length, published: linkList.filter((l) => l?.published === true).length, sources: sourceIds.size },
  };
}
