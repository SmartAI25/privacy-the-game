// Registry import: turns a state data-broker registry snapshot (CSV) into broker records.
// CLI: node import-registry.js <STATE> <csvPath> <snapshotDate> [archivedUrl]
import { normalizeName, slugify } from './ids.js';
import { parseCsv } from './csv.js';
import { KINDS, REGISTRY_KEYS, validateDataset } from './schema.js';

// Header names copied verbatim from each registry's real download (see sources/registries/SOURCES.md).
// `email` is mapped only where the registry labels it an opt-out address (OR). CA and TX publish a
// general contact email, which is not an opt-out route, so it is left out.
// `flags` are yes/no columns that map unambiguously onto one kind.
// VT is absent: its registry could not be obtained (login-gated bulk download, reCAPTCHA search).
export const COLUMN_MAPS = Object.freeze({
  CA: {
    name: 'Data broker name:',
    dba: 'Doing Business As (DBA), if applicable:',
    website: 'Data broker primary website:',
    optOutUrl: "Data broker's primary website that contains details on how consumers can exercise their CA Consumer Privacy rights:",
    flags: {
      "Data broker collects consumers' precise geolocation": 'location',
      'Data broker collects consumers’ reproductive health care data:': 'health',
    },
  },
  TX: {
    name: 'Full Legal Name',
    website: 'Website',
    optOutUrl: 'Consumer Rights Link',
    // Free text written by each broker; it has no fixed labels to map, so every value is "unknown".
    category: 'Categories of Data Processed and Transferred',
  },
  OR: {
    name: 'FACILITY NAME',
    dba: 'DOING BUSINESS AS',
    optOutUrl: 'OPT OUT WEBSITE',
    email: 'OPT OUT EMAIL',
  },
});

// Exact (lower-cased, trimmed) registry category labels → kind. Only unambiguous labels belong here.
// No obtained registry has fixed category labels yet, so the map is empty and categories give kind: [].
export const CATEGORY_MAP = Object.freeze({ CA: {}, TX: {}, OR: {} });

// Registry pages, for the sources.json entry.
export const REGISTRY_META = Object.freeze({
  CA: { url: 'https://cppa.ca.gov/data_broker_registry/registry.csv', title: 'California Privacy Protection Agency, California Data Broker Registry (2026 registrations)' },
  TX: { url: 'https://texas-sos.appianportalsgov.com/data-broker-registry', title: 'Texas Secretary of State, Registry of Registered Data Brokers (Export to Excel)' },
  OR: { url: 'https://www4.cbs.state.or.us/ex/shared/downtemp/dfcs_db_optout.csv', title: 'Oregon DCBS Division of Financial Regulation, Data Broker Opt Out Methods report' },
});

const BLANK = /^(|n\/?a\.?|none\.?|null|not applicable|-+)$/i;
// Yes/no answers typed into a DBA box are form noise, not trade names.
const NOT_A_DBA = /^(yes|no|same|same as above)\.?$/i;
const URL_RE = /^https?:\/\/[^\s]+$/i;
const BARE_DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?$/i;
const EMAIL_RE = /^(?:mailto:)?([^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,})$/i;

const clean = (v) => {
  const s = String(v ?? '').trim();
  return BLANK.test(s) ? '' : s;
};

// A field "holds a URL" only when the whole value is one: free text is never mined for links.
export function asUrl(v) {
  const s = clean(v).replace(/[.,;]+$/, '');
  if (URL_RE.test(s)) return s;
  if (BARE_DOMAIN.test(s) && !s.includes('@')) return `https://${s}`;
  return null;
}

export function asEmail(v) {
  const m = clean(v).match(EMAIL_RE);
  return m ? m[1] : null;
}

// CA joins several answers with "; ". A field made only of URLs gives its first URL.
export function firstUrl(v) {
  const whole = asUrl(v);
  if (whole) return whole;
  const parts = clean(v).split(/\s*[;,]\s*|\s+/).filter(Boolean);
  const urls = parts.map(asUrl);
  return parts.length > 1 && urls.every(Boolean) ? urls[0] : null;
}

function optOutFrom(row, col) {
  const field = row(col.optOutUrl);
  const url = firstUrl(field);
  if (url) return { method: 'web-form', url, status: 'unchecked' };
  const email = asEmail(field) ?? (col.email ? asEmail(row(col.email)) : null);
  if (email) return { method: 'email', email };
  return null;
}

function newBroker(id, name) {
  return {
    id, name, aliases: [], parent: null, kind: [],
    registries: Object.fromEntries(REGISTRY_KEYS.map((k) => [k, null])),
    sells: [], optOut: null, size: { known: false, signals: [] }, sources: [],
  };
}

const addUnique = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };
const sortKinds = (ks) => KINDS.filter((k) => ks.includes(k));

// Fold record `b` into record `a` (one broker that two records described). Additive: `a` keeps its scalars.
function absorb(a, b) {
  for (const n of [b.name, ...b.aliases]) if (n !== a.name) addUnique(a.aliases, n);
  for (const [k, v] of Object.entries(b.registries ?? {})) {
    const cur = a.registries[k] ?? null;
    a.registries[k] = cur === null ? v : (v !== null && v > cur ? v : cur);
  }
  a.kind = sortKinds([...new Set([...a.kind, ...b.kind])]);
  for (const key of ['sells', 'sources', 'missions']) {
    if (!Array.isArray(b[key])) continue;
    a[key] = a[key] ?? [];
    for (const v of b[key]) addUnique(a[key], v);
  }
  for (const key of ['optOut', 'website', 'parent']) if ((a[key] ?? null) === null && (b[key] ?? null) !== null) a[key] = b[key];
  if (!a.size?.known && b.size?.known) a.size = b.size;
  for (const [k, v] of Object.entries(b)) if (!(k in a)) a[k] = v;
}

// Merge one registry's rows into a copy of `existing`. Pure: the input map and records are not mutated.
export function importRows(state, rows, existing, sourceId) {
  const col = COLUMN_MAPS[state];
  if (!col) throw new Error(`no column map for registry "${state}"`);
  const year = String(sourceId).match(/(\d{4})-\d{2}-\d{2}$/)?.[1];
  if (!year) throw new Error(`sourceId "${sourceId}" must end in a YYYY-MM-DD snapshot date`);

  const out = new Map([...existing].map(([id, b]) => [id, structuredClone(b)]));
  const index = new Map(); // normalizeName → id (first record to claim a spelling keeps it)
  const indexRecord = (b) => { for (const n of [b.name, ...b.aliases]) { const k = normalizeName(n); if (k && !index.has(k)) index.set(k, b.id); } };
  const reindex = () => { index.clear(); for (const b of out.values()) indexRecord(b); };
  reindex();

  // Some exports carry metadata rows above the header (TX); find the real header row.
  const h = rows.findIndex((r) => r.map((c) => c.trim()).includes(col.name));
  if (h === -1) throw new Error(`${state}: header "${col.name}" not found`);
  const header = rows[h].map((c) => c.trim());
  const at = (r) => (name) => { const i = name ? header.indexOf(name) : -1; return i === -1 ? '' : (r[i] ?? ''); };

  for (const r of rows.slice(h + 1)) {
    const row = at(r);
    const name = clean(row(col.name)).replace(/\s+/g, ' ');
    if (!name) continue;
    const dbas = col.dba ? clean(row(col.dba)).split(/[;\n]/).map((s) => clean(s).replace(/\s+/g, ' ')).filter((s) => s && !NOT_A_DBA.test(s)) : [];

    // The legal name's match comes first, so it becomes the surviving record.
    const ids = [...new Set([name, ...dbas].map((n) => index.get(normalizeName(n))).filter(Boolean))];
    let id = ids[0];
    let b = id && out.get(id);
    if (ids.length > 1) {
      // One row names two records (e.g. legal name matches one, DBA another): they are the same broker.
      for (const other of ids.slice(1)) { absorb(b, out.get(other)); out.delete(other); }
      reindex();
    }
    if (!b) {
      const base = slugify(name);
      if (!base) continue;
      id = base;
      for (let i = 2; out.has(id); i++) id = `${base}-${i}`;
      b = newBroker(id, name);
      out.set(id, b);
    }
    for (const n of [name, ...dbas]) if (n !== b.name) addUnique(b.aliases, n);
    indexRecord(b);

    b.registries = { ...Object.fromEntries(REGISTRY_KEYS.map((k) => [k, null])), ...b.registries, [state]: year };
    if (b.optOut === null || b.optOut === undefined) b.optOut = optOutFrom(row, col);
    if (!b.website && col.website) { const w = firstUrl(row(col.website)); if (w) b.website = w; }

    const kinds = new Set(b.kind);
    for (const [hdr, kind] of Object.entries(col.flags ?? {})) if (/^yes$/i.test(clean(row(hdr)))) kinds.add(kind);
    if (col.category) {
      const k = CATEGORY_MAP[state]?.[clean(row(col.category)).toLowerCase()];
      if (k) kinds.add(k);
    }
    b.kind = sortKinds([...kinds]);
    addUnique(b.sources, sourceId);
  }
  return out;
}

// ---------- CLI ----------
async function main(argv) {
  const { readFile, writeFile, readdir, mkdir, unlink } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join, resolve } = await import('node:path');
  const [state, csvPath, date, archived] = argv;
  if (!COLUMN_MAPS[state] || !csvPath || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? '')) {
    console.error('usage: node import-registry.js <CA|TX|OR> <csvPath> <YYYY-MM-DD> [archivedUrl]');
    process.exit(2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const brokersDir = join(root, 'brokers');
  await mkdir(brokersDir, { recursive: true });

  const sourceId = `registry-${state.toLowerCase()}-${date}`;
  const sourcesPath = join(root, 'sources.json');
  const sources = JSON.parse(await readFile(sourcesPath, 'utf8'));
  if (!sources[sourceId]) {
    if (!archived) { console.error(`${sourceId} is not in sources.json yet: pass its Wayback capture as archivedUrl`); process.exit(2); }
    sources[sourceId] = { ...REGISTRY_META[state], archived, kind: 'registry', accessed: date };
  } else if (archived) sources[sourceId].archived = archived;
  await writeFile(sourcesPath, `${JSON.stringify(sources, null, 2)}\n`);

  const existing = new Map();
  for (const f of (await readdir(brokersDir)).filter((f) => f.endsWith('.json')).sort()) {
    const b = JSON.parse(await readFile(join(brokersDir, f), 'utf8'));
    existing.set(b.id, b);
  }
  const rows = parseCsv(await readFile(resolve(csvPath), 'utf8'));
  const merged = importRows(state, rows, existing, sourceId);
  let written = 0;
  for (const [id, b] of merged) {
    const text = `${JSON.stringify(b, null, 2)}\n`;
    if (existing.has(id) && JSON.stringify(existing.get(id), null, 2) + '\n' === text) continue;
    await writeFile(join(brokersDir, `${id}.json`), text);
    written++;
  }
  let removed = 0;
  for (const id of existing.keys()) if (!merged.has(id)) { await unlink(join(brokersDir, `${id}.json`)); removed++; }
  const touched = [...merged.values()].filter((b) => b.sources.includes(sourceId)).length;
  console.log(`${state} ${date}: ${touched} brokers in registry, ${merged.size - existing.size} new, ${written} files written, ${removed} merged away`);

  const { errors, counts } = await validateDataset(root);
  for (const e of errors) console.error(e);
  console.log(`brokers: ${counts.brokers} links: ${counts.links} published: ${counts.published} sources: ${counts.sources}`);
  if (errors.length) process.exit(1);
}

const { fileURLToPath: f2p } = await import('node:url');
if (process.argv[1] && f2p(import.meta.url) === (await import('node:path')).resolve(process.argv[1])) await main(process.argv.slice(2));
