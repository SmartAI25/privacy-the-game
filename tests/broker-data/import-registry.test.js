import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCsv } from '../../research/data-brokers/build/csv.js';
import { validateBroker } from '../../research/data-brokers/build/schema.js';
import { COLUMN_MAPS, importRows } from '../../research/data-brokers/build/import-registry.js';

const fx = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'registries');
const rows = (s) => parseCsv(readFileSync(join(fx, `${s}.csv`), 'utf8'));
const SRC = { CA: 'registry-ca-2026-10-18', TX: 'registry-tx-2026-10-18', OR: 'registry-or-2026-10-18' };
const run = (state, existing = new Map()) => importRows(state, rows(state.toLowerCase()), existing, SRC[state]);
const byName = (m, name) => [...m.values()].find((b) => b.name === name);

describe('COLUMN_MAPS', () => {
  it('names a real header for every obtained registry', () => {
    for (const s of ['CA', 'TX', 'OR']) expect(COLUMN_MAPS[s].name).toBeTruthy();
    for (const s of ['ca', 'tx', 'or']) {
      const all = rows(s).flat();
      expect(all).toContain(COLUMN_MAPS[s.toUpperCase()].name);
    }
  });
});

describe('importRows', () => {
  it('CA row becomes broker with registries.CA', () => {
    const m = run('CA');
    const b = m.get('acxiom');
    expect(b).toBeDefined();
    expect(b.name).toBe('Acxiom LLC');
    expect(b.registries).toEqual({ CA: '2026', VT: null, TX: null, OR: null });
    expect(b.optOut).toEqual({ method: 'web-form', url: 'https://isapps.acxiom.com/optout/optout.aspx', status: 'unchecked' });
    expect(b.sources).toEqual([SRC.CA]);
    expect(b.website).toBe('https://www.acxiom.com');
    const sourceIds = new Set([SRC.CA]);
    for (const r of m.values()) expect(validateBroker(r, { sourceIds })).toEqual([]);
  });

  it('dedupe merges case/suffix variants', () => {
    // "Acxiom LLC" (CA) and "ACXIOM CORPORATION" (TX) are one broker.
    const m = run('TX', run('CA'));
    const matches = [...m.values()].filter((b) => b.name === 'Acxiom LLC' || b.aliases.includes('ACXIOM CORPORATION'));
    expect(matches).toHaveLength(1);
    const b = matches[0];
    expect(b.registries.CA).toBe('2026');
    expect(b.registries.TX).toBe('2026');
    expect(b.aliases).toContain('ACXIOM CORPORATION');
    expect(b.sources).toEqual([SRC.CA, SRC.TX]);
    // The first opt-out route wins; a later registry never overwrites it.
    expect(b.optOut.url).toBe('https://isapps.acxiom.com/optout/optout.aspx');
  });

  it('DBA matches existing record', () => {
    // Oregon lists "Geo Parent Holdings Inc" doing business as "Example Location": the DBA matches CA's "Example Location Co.".
    const m = run('OR', run('CA'));
    const b = m.get('example-location');
    expect(b.registries.OR).toBe('2026');
    expect(b.aliases).toContain('Geo Parent Holdings Inc');
    expect([...m.values()].filter((r) => r.name === 'Geo Parent Holdings Inc')).toHaveLength(0);
  });

  it('blank opt-out stays unknown', () => {
    expect(byName(run('CA'), 'Example Location Co.').optOut).toBeNull();
    expect(byName(run('TX'), 'Freetext Brokers LLC').optOut).toBeNull();
  });

  it('email opt-out sets method email', () => {
    expect(byName(run('CA'), 'Mailbox Data Inc.').optOut).toEqual({ method: 'email', email: 'optout@mailbox.test' });
    expect(byName(run('OR'), 'Email Only Data LLC').optOut).toEqual({ method: 'email', email: 'optout@emailonly.test' });
  });

  it('a contact email is not an opt-out route', () => {
    // CA/TX "primary contact email" columns are general contacts, not opt-out routes.
    expect(byName(run('CA'), 'Example Location Co.').optOut).toBeNull();
  });

  it('bare-domain opt-out website becomes an https URL', () => {
    expect(byName(run('OR'), 'Bare Domain Data Inc').optOut).toEqual({ method: 'web-form', url: 'https://BareDomain.test', status: 'unchecked' });
  });

  it('a field listing only URLs uses the first; prose is never mined', () => {
    const m = run('CA');
    expect(byName(m, 'Two Links LLC').optOut).toEqual({ method: 'web-form', url: 'https://twolinks.test/opt-out', status: 'unchecked' });
    expect(byName(m, 'Prose Optout LLC').optOut).toBeNull();
  });

  it('placeholder DBA answers are not aliases', () => {
    expect(byName(run('CA'), 'Placeholder Dba Corp').aliases).toEqual([]);
  });

  it('unknown category gives empty kind', () => {
    expect(byName(run('TX'), 'Freetext Brokers LLC').kind).toEqual([]);
    expect(run('CA').get('acxiom').kind).toEqual([]);
  });

  it('CA geolocation and reproductive-health flags map to location and health', () => {
    expect(byName(run('CA'), 'Example Location Co.').kind).toEqual(['location', 'health']);
  });

  it('a row whose name and DBA match two records merges them into one', () => {
    // CA "AdeptID, Inc." and TX "Adept ID, Inc." normalise differently; OR's "ADEPT ID INC" dba "AdeptID" bridges them.
    const ca = [['Data broker name:', 'Doing Business As (DBA), if applicable:'], ['AdeptID, Inc.', '']];
    const tx = [['Full Legal Name'], ['Adept ID, Inc.']];
    const or = [['FACILITY NAME', 'DOING BUSINESS AS'], ['ADEPT ID INC', 'AdeptID']];
    let m = importRows('CA', ca, new Map(), SRC.CA);
    m = importRows('TX', tx, m, SRC.TX);
    expect(m.size).toBe(2);
    m = importRows('OR', or, m, SRC.OR);
    expect(m.size).toBe(1);
    const [b] = m.values();
    expect(b.registries).toEqual({ CA: '2026', VT: null, TX: '2026', OR: '2026' });
    expect(new Set([b.name, ...b.aliases])).toEqual(new Set(['AdeptID, Inc.', 'Adept ID, Inc.', 'ADEPT ID INC', 'AdeptID']));
    expect(new Set(b.sources)).toEqual(new Set([SRC.CA, SRC.TX, SRC.OR]));
    // Running the whole sequence again changes nothing.
    const again = importRows('OR', or, importRows('TX', tx, importRows('CA', ca, m, SRC.CA), SRC.TX), SRC.OR);
    expect(Object.fromEntries(again)).toEqual(Object.fromEntries(m));
  });

  it('re-import is idempotent', () => {
    const once = run('OR', run('TX', run('CA')));
    const snapshot = structuredClone(Object.fromEntries(once));
    const twice = run('OR', run('TX', run('CA', once)));
    expect(Object.fromEntries(twice)).toEqual(snapshot);
  });

  it('does not mutate its input map, and rejects states without a column map', () => {
    const before = run('CA');
    const copy = structuredClone(Object.fromEntries(before));
    run('TX', before);
    expect(Object.fromEntries(before)).toEqual(copy);
    expect(() => importRows('ZZ', [['x']], new Map(), 'registry-zz')).toThrow();
  });
});
