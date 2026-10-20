// Building Interiors, task 1: the content model. Every threat has a name and
// every claim has a source (spec: docs/superpowers/specs/2026-10-20-building-interiors-design.md).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { INTERIORS, hasInterior, getInterior } from '../src/data/interiors/index.js';
import { SAINTS, saintsForAccount } from '../src/data/interiors/saints.js';
import { MISSIONS } from '../src/data/missions.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/verified-urls.json', import.meta.url), 'utf8'));

const RULES = new Set(['password-unique', 'sim-swap', 'phishing', 'devices', 'reglock', 'beyond']);
const METAPHORS = new Set(['front-door', 'phone-line', 'mail-slot', 'back-room', 'vents', 'number']);
const interiors = Object.values(INTERIORS);
const saints = Object.values(SAINTS);

function strings(value, path = '', out = []) {
  if (typeof value === 'string') out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) strings(v, `${path}.${k}`, out);
  return out;
}

function everySourced() {
  const out = [];
  for (const i of interiors) {
    for (const l of i.desk) out.push([`${i.accountId} desk ${l.id}`, l.sources]);
    for (const e of i.entries) out.push([`${i.accountId} entry ${e.id}`, e.sources]);
  }
  for (const s of saints) out.push([`saint ${s.id}`, s.sources]);
  return out;
}

describe('interior content', () => {
  it('every interior has a desk, entries, and only known rules', () => {
    expect(interiors.length).toBeGreaterThan(0);
    for (const i of interiors) {
      expect(INTERIORS[i.accountId], i.accountId).toBe(i);
      expect(typeof i.company).toBe('string');
      expect(i.deskIntro.length).toBeGreaterThan(0);
      expect(i.desk.length, i.accountId).toBeGreaterThan(0);
      expect(i.entries.length, i.accountId).toBeGreaterThan(0);
      for (const l of i.desk) for (const k of ['id', 'actor', 'tool', 'gets']) expect(typeof l[k] === 'string' && l[k].length > 0, `${l.id}.${k}`).toBe(true);
      for (const e of i.entries) {
        expect(RULES.has(e.rule), `${i.accountId}/${e.id} rule ${e.rule}`).toBe(true);
        expect(METAPHORS.has(e.metaphor), `${i.accountId}/${e.id} metaphor ${e.metaphor}`).toBe(true);
        for (const k of ['id', 'actor', 'how']) expect(typeof e[k] === 'string' && e[k].length > 0, `${e.id}.${k}`).toBe(true);
      }
      expect(new Set(i.entries.map((e) => e.id)).size).toBe(i.entries.length);
      expect(new Set(i.desk.map((l) => l.id)).size).toBe(i.desk.length);
    }
    expect(hasInterior('gmail')).toBe(true);
    expect(hasInterior('netflix')).toBe(false);
    expect(getInterior('netflix')).toBe(null);
    expect(getInterior('gmail')).toBe(INTERIORS.gmail);
  });

  it('every lane, entry and saint has at least one source', () => {
    for (const [where, sources] of everySourced()) {
      expect(Array.isArray(sources) && sources.length > 0, where).toBe(true);
      for (const s of sources) {
        expect(typeof s.label === 'string' && s.label.length > 0, `${where} label`).toBe(true);
        expect(s.url, where).toMatch(/^https:\/\//);
      }
    }
  });

  it('every source url is in verified-urls.json', () => {
    const missing = everySourced().flatMap(([where, sources]) => sources.filter((s) => !Object.hasOwn(fixture.urls, s.url)).map((s) => `${where}: ${s.url}`));
    expect(missing).toEqual([]);
  });

  it('no interior or saint copy says "they"', () => {
    const hits = [...strings(INTERIORS, 'INTERIORS'), ...strings(SAINTS, 'SAINTS')].filter(([, s]) => /\bthey\b/i.test(s)).map(([p]) => p);
    expect(hits).toEqual([]);
  });

  it('no actor is an unnamed group', () => {
    const vague = /^(the )?(government|hackers?|someone|attackers?|criminals?)$/i;
    for (const i of interiors) {
      for (const x of [...i.desk, ...i.entries]) expect(vague.test(x.actor.trim()), `${i.accountId}/${x.id}: ${x.actor}`).toBe(false);
    }
  });

  it('fixMission ids exist in MISSIONS and belong to the same account', () => {
    const byId = new Map(MISSIONS.map((m) => [m.id, m]));
    for (const i of interiors) {
      for (const e of i.entries) {
        if (!e.fixMission) continue;
        expect(byId.has(e.fixMission), `${i.accountId}/${e.id}: ${e.fixMission}`).toBe(true);
        expect(byId.get(e.fixMission).accountId, e.fixMission).toBe(i.accountId);
      }
    }
  });

  it('saint ids referenced by interiors exist, and Swartz is spelled Swartz', () => {
    for (const i of interiors) {
      for (const id of i.saints) {
        expect(SAINTS[id], `${i.accountId}: ${id}`).toBeTruthy();
        expect(SAINTS[id].accounts, id).toContain(i.accountId);
      }
      expect(saintsForAccount(i.accountId).map((s) => s.id).sort()).toEqual([...i.saints].sort());
    }
    for (const s of saints) {
      expect(SAINTS[s.id]).toBe(s);
      for (const k of ['name', 'title', 'years', 'tribute', 'story']) expect(typeof s[k] === 'string' && s[k].length > 0, `${s.id}.${k}`).toBe(true);
    }
    const all = JSON.stringify([INTERIORS, SAINTS]);
    expect(all).not.toMatch(/Schwartz/i);
    expect(SAINTS.swartz.name).toMatch(/Aaron Swartz/);
    expect(saints.map((s) => s.id)).toEqual(['swartz', 'snowden', 'klein', 'zimmermann', 'ellsberg', 'manning', 'drake', 'binney', 'poitras']);
    expect(SAINTS.snowden.accounts.sort()).toEqual(['apple_id', 'facebook', 'gmail', 'google', 'icloud', 'microsoft', 'outlook', 'yahoo']);
    expect(SAINTS.zimmermann.accounts.sort()).toEqual(['protonmail', 'signal']);
    for (const s of saints) if (!['snowden', 'zimmermann'].includes(s.id)) expect(s.accounts, s.id).toEqual([]);
    expect(saintsForAccount('gmail').map((s) => s.id)).toEqual(['snowden']);
    expect(saintsForAccount('netflix')).toEqual([]);
  });

  it('gmail interior has the five named desk lanes and five entries', () => {
    expect(getInterior('gmail').desk.map((l) => l.id)).toEqual(['local-police', 'fbi', 'nsa-702', 'ice-hsi', 'uk-cloud-act']);
    expect(getInterior('gmail').entries.map((e) => e.metaphor)).toEqual(['front-door', 'phone-line', 'mail-slot', 'back-room', 'vents']);
    expect(getInterior('gmail').entries.map((e) => e.rule)).toEqual(['password-unique', 'sim-swap', 'phishing', 'devices', 'beyond']);
  });

  it('gmail vents name the CIA, Chinese state hackers (Aurora) and a Pegasus customer, each sourced', () => {
    const vents = getInterior('gmail').entries.filter((e) => e.metaphor === 'vents');
    const text = JSON.stringify(vents);
    expect(text).toMatch(/CIA/);
    expect(text).toMatch(/Aurora/);
    expect(text).toMatch(/Pegasus/);
    const urls = vents.flatMap((e) => e.sources.map((s) => s.url));
    expect(urls).toContain('https://wikileaks.org/ciav7p1/');
    expect(urls).toContain('https://en.wikipedia.org/wiki/Vault_7');
    expect(urls).toContain('https://googleblog.blogspot.com/2010/01/new-approach-to-china.html');
    expect(urls).toContain('https://en.wikipedia.org/wiki/Operation_Aurora');
    expect(urls).toContain('https://citizenlab.ca/tag/nso-group/');
    expect(urls).toContain('https://en.wikipedia.org/wiki/Pegasus_(spyware)');
  });

  it('the NSA lane words 702 as "has let", never as settled law in 2026', () => {
    const nsa = getInterior('gmail').desk.find((l) => l.id === 'nsa-702');
    expect(nsa.gets).toMatch(/has let/);
    expect(JSON.stringify(nsa)).toMatch(/PRISM/);
    for (const agency of ['GCHQ', 'CSE', 'ASD', 'GCSB']) expect(JSON.stringify(nsa), agency).toContain(agency);
  });
});
