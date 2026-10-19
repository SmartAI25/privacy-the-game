// Broken broker steps found 2026-10-18/19 (research/data-brokers/staging/policies/NOTES.md):
// Radaris's domain was transferred by court order, FindPeopleSearch's domain is parked and
// PrivateEye has no removal form left. Each step stays as an honest note (old saves keep
// the mission and its step count), and nothing still sends the player there.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { MISSIONS } from '../src/data/missions.js';

const mission = (id) => {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m) throw new Error(`no mission ${id}`);
  return m;
};
const everything = (id) => JSON.stringify(mission(id));
const stepFor = (id, name) => mission(id).steps.find((s) => s.text.startsWith(name));

function allSteps() {
  return MISSIONS.flatMap((m) => [m.steps || [], ...Object.values(m.stepsByManager || {}), ...Object.values(m.reportSteps || {})].flat()
    .map((s) => ({ id: m.id, ...s })));
}

const BROKERS_DIR = new URL('../research/data-brokers/brokers/', import.meta.url);
const brokers = readdirSync(BROKERS_DIR).filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(new URL(f, BROKERS_DIR), 'utf8')));
const norm = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').toLowerCase();
const host = (u) => norm(u).replace(/\/.*/, '');

describe('broker dataset vs mission steps', () => {
  it('no step links to an opt-out the dataset records as dead or suspect', () => {
    const bad = brokers.filter((b) => b.optOut?.url && ['dead', 'suspect'].includes(b.optOut.status)).map((b) => norm(b.optOut.url));
    const hits = allSteps().filter((s) => s.url && bad.includes(norm(s.url))).map((s) => `${s.id}: ${s.url}`);
    expect(hits).toEqual([]);
  });

  it('no step links to a broker whose opt-out the dataset records as gone (method "none")', () => {
    const gone = new Set(brokers.filter((b) => b.optOut?.url && b.optOut.method === 'none').map((b) => host(b.optOut.url)));
    expect(gone.has('radaris.com')).toBe(true);
    const hits = allSteps().filter((s) => s.url && gone.has(host(s.url))).map((s) => `${s.id}: ${s.url}`);
    expect(hits).toEqual([]);
  });
});

describe('Radaris (domain transferred by court order)', () => {
  const id = 'people_search-fortify-privacy-portals';
  it('the step stays, as a note with no link', () => {
    const s = stepFor(id, 'Radaris');
    expect(s).toBeTruthy();
    expect(s.url).toBeUndefined();
    expect(s.text).toMatch(/court order/);
    expect(s.text).toMatch(/no opt-out/);
  });
  it('the briefing no longer says Radaris has a privacy control center, or lists Nuwber here', () => {
    expect(mission(id).briefing).not.toContain('Radaris has a privacy control center');
    expect(mission(id).briefing).not.toContain('Nuwber');
  });
  it('the removal-links briefing no longer sends players to a Radaris portal', () => {
    expect(mission('people_search-fortify-removal-links').briefing).not.toMatch(/Radaris have/);
  });
  it('Scout does not count brokers that can no longer be cleared', () => {
    expect(everything(id)).not.toContain('Ten brokers cleared');
    expect(everything('people_search-reclaim-stragglers')).not.toContain('Thirteen individual opt-outs');
    expect(mission(id).scoutDialog.briefing).toMatch(/Radaris/);
  });
});

describe('PrivateEye (no removal form) and FindPeopleSearch (parked)', () => {
  it('PrivateEye is a note with no link', () => {
    const s = stepFor('people_search-fortify-extended-sweep-1', 'PrivateEye');
    expect(s).toBeTruthy();
    expect(s.url).toBeUndefined();
    expect(s.text).toMatch(/no removal form/);
    expect(everything('people_search-fortify-extended-sweep-1')).not.toContain('Five more brokers cleared');
  });
  it('FindPeopleSearch is a note with no link, and the briefing says so', () => {
    const m = mission('people_search-fortify-extended-sweep-3');
    const s = stepFor(m.id, 'FindPeopleSearch');
    expect(s).toBeTruthy();
    expect(s.url).toBeUndefined();
    expect(s.text).toMatch(/parked/);
    expect(m.briefing).not.toContain('FindPeopleSearch and Findpeoplesearch');
  });
});

describe('opt-out links moved to the page that has the request', () => {
  it('Lotame points at its privacy-choices page, not the policy redirect', () => {
    const urls = allSteps().filter((s) => /lotame\.com/.test(s.url || '')).map((s) => s.url);
    expect(urls).toEqual(['https://www.lotame.com/privacy/information-privacy-choices-services/']);
  });
  it('Placer.ai points at its consumer policy, which has the contact', () => {
    const urls = allSteps().filter((s) => /placer\.ai/.test(s.url || '')).map((s) => s.url);
    expect(urls).toEqual(['https://www.placer.ai/privacy-policy/consumer-privacy-policy']);
  });
});
