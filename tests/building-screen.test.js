import { describe, it, expect } from 'vitest';
import { createInitialState, updateMission, toggleAccount } from '../src/state.js';
import { renderBuildingInterior } from '../src/screens/building.js';
import { renderDistrict } from '../src/screens/district.js';
import { renderBuilding } from '../src/components/building.js';
import { renderHud } from '../src/components/hud.js';
import { parseRoute } from '../src/router.js';
import { getInterior } from '../src/data/interiors/index.js';

const NOW = new Date('2026-10-20T00:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 864e5).toISOString();
function file(state, id, update, at = daysAgo(3)) {
  const s = updateMission(state, id, { status: 'completed', ...update });
  if (at === null) delete s.missions[id].completedAt;
  else s.missions[id].completedAt = at;
  return s;
}
const render = (s, id = 'gmail') => renderBuildingInterior(s, id, { now: NOW });
// The entry block for one metaphor, e.g. data-entry="sim-swap".
const entryHtml = (html, id) => {
  const m = html.match(new RegExp(`<div class="entry[^"]*" data-entry="${id}"[\\s\\S]*?<!-- /entry -->`));
  return m ? m[0] : '';
};
const rowHtml = (html, id) => {
  const m = html.match(new RegExp(`<div class="ant-row" data-row="${id}"[\\s\\S]*?<!-- /row -->`));
  return m ? m[0] : '';
};

describe('building screen', () => {
  it('routes #/building/<id>', () => {
    expect(parseRoute('#/building/gmail')).toEqual({ screen: 'building', params: { id: 'gmail' } });
  });

  it('renders four floors for gmail with the five desk actors named', () => {
    const html = render(createInitialState());
    expect(html.match(/<details class="floor/g)).toHaveLength(4);
    expect(html.match(/<details class="floor[^"]*" open/g)).toHaveLength(4);
    expect(html).toContain('Roof · Signal check');
    expect(html).toContain('Records desk · Google’s');
    expect(html).toContain('Ground floor · Entries');
    expect(html).toContain('Alcove · Saint Edward Snowden');
    for (const actor of ['Your local police department', 'FBI', 'NSA', 'ICE / HSI', 'UK investigators, through the Home Office']) {
      expect(html).toContain(actor);
    }
    expect(html).toContain('GMAIL');
    expect(html).toContain('The Master Keys');
  });

  it('meter reads NO ENTRIES CHECKED YET on a fresh save and ENTRIES SEALED 1/3 after sms 2FA + unique password (front door sealed; phone line, mail slot open; back room not-checked)', () => {
    expect(render(createInitialState())).toContain('NO ENTRIES CHECKED YET');
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' }, daysAgo(23));
    s = file(s, 'gmail-fortify-password', { action: 'reset-password' }, daysAgo(30));
    const html = render(s);
    expect(html).toContain('ENTRIES SEALED <b>1/3</b>');
    expect(html).toContain('LAST SWEEP <b');
    expect(html).toMatch(/LAST SWEEP <b[^>]*>23d<\/b>/);
    expect(entryHtml(html, 'stuffing')).toContain('data-state="sealed"');
    expect(entryHtml(html, 'sim-swap')).toContain('data-state="open"');
    expect(entryHtml(html, 'phishing')).toContain('data-state="open"');
    expect(entryHtml(html, 'near-you')).toContain('data-state="not-checked"');
    expect(entryHtml(html, 'state')).toContain('data-state="beyond"');
  });

  it('open entry links SEAL IT to its fixMission briefing; not-checked shows START', () => {
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' });
    let html = render(s);
    expect(entryHtml(html, 'sim-swap')).toContain('SEAL IT');
    // gmail-fortify-2fa is filed (sms), so the upgrade is unlocked.
    expect(entryHtml(html, 'sim-swap')).toContain('href="#/mission/gmail-fortify-2fa-upgrade/briefing"');
    expect(entryHtml(html, 'near-you')).toContain('START');
    expect(entryHtml(html, 'near-you')).toContain('href="#/mission/gmail-recon-login/briefing"');
    expect(entryHtml(html, 'near-you')).not.toContain('SEAL IT');

    // Open front door (pm flagged, no reset) seals through the password mission.
    s = { ...createInitialState(), pmFlagged: ['gmail'] };
    html = render(s);
    expect(entryHtml(html, 'stuffing')).toContain('data-state="open"');
    expect(entryHtml(html, 'stuffing')).toContain('href="#/mission/gmail-fortify-password/briefing"');
    // Not-checked 2FA entries START at the base 2FA mission, not the locked upgrade.
    expect(entryHtml(html, 'sim-swap')).toContain('href="#/mission/gmail-fortify-2fa/briefing"');
    expect(entryHtml(html, 'sim-swap')).not.toContain('gmail-fortify-2fa-upgrade');
  });

  it('SEAL IT falls back to the base 2FA mission when the base record is not completed', () => {
    // A 2FA method known only from the upgrade mission (base never filed): base is not done.
    const s = file(createInitialState(), 'gmail-fortify-2fa-upgrade', { method: 'sms' });
    const html = render(s);
    expect(entryHtml(html, 'sim-swap')).toContain('data-state="open"');
    expect(entryHtml(html, 'sim-swap')).toContain('href="#/mission/gmail-fortify-2fa/briefing"');
    expect(entryHtml(html, 'phishing')).toContain('href="#/mission/gmail-fortify-2fa/briefing"');
    // Authenticator: the upgrade stays locked, so the open mail slot points at the base mission.
    const auth = render(file(createInitialState(), 'gmail-fortify-2fa', { method: 'authenticator' }));
    expect(entryHtml(auth, 'phishing')).toContain('data-state="open"');
    expect(entryHtml(auth, 'phishing')).toContain('href="#/mission/gmail-fortify-2fa/briefing"');
  });

  it('sealed entries show the evaluator note; beyond shows what narrows it; vents actors wrap', () => {
    const s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'authenticator' });
    const html = render(s);
    expect(entryHtml(html, 'sim-swap')).toContain('Sealed once text-message backup is off.');
    const vents = entryHtml(html, 'state');
    expect(vents).toContain('Advanced Protection');
    expect(vents).toContain('NSO Group’s Pegasus');
    expect(vents).not.toMatch(/nowrap/);
  });

  it('roof rows: SWEEP re-checks a filed mission, START briefs an unfiled one; bars by status', () => {
    const s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' });
    const html = render(s);
    const tf = rowHtml(html, 'two-factor');
    expect(tf).toContain('SWEEP');
    expect(tf).toContain('href="#/mission/gmail-fortify-2fa/recheck"');
    expect(tf.match(/class="bar on"/g)).toHaveLength(2);
    const dev = rowHtml(html, 'devices');
    expect(dev).toContain('START');
    expect(dev).toContain('href="#/mission/gmail-recon-login/briefing"');
    expect(dev).not.toContain('/recheck');
  });

  it('a stale filing shows date unknown / dim bars, never fresh', () => {
    // An old save: the filing has no completedAt.
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' }, null);
    let tf = rowHtml(render(s), 'two-factor');
    expect(tf).toContain('date unknown');
    expect(tf).toContain('opacity: 0.35');
    expect(tf).not.toContain('data-fresh="fresh"');
    s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' }, daysAgo(120));
    tf = rowHtml(render(s), 'two-factor');
    expect(tf).toContain('opacity: 0.35');
    expect(tf).toContain('data-fresh="stale"');
    s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' }, daysAgo(45));
    expect(rowHtml(render(s), 'two-factor')).toContain('opacity: 0.6');
    s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' }, daysAgo(2));
    expect(rowHtml(render(s), 'two-factor')).toContain('opacity: 1;');
  });

  it('#/building/netflix, #/building/nope, and disabled gmail render the calm no-floor-plan page', () => {
    const s = createInitialState();
    const netflix = render(s, 'netflix');
    expect(netflix).toContain('No floor plan for this building yet');
    expect(netflix).toMatch(/href="#\/district\/[a-z-]+"/);
    const nope = render(s, 'nope');
    expect(nope).toContain('No floor plan for this building yet');
    expect(nope).toContain('href="#/city"');
    const off = render(toggleAccount(s, 'gmail', false), 'gmail');
    expect(off).toContain('No floor plan for this building yet');
    expect(off).toContain('href="#/district/master-keys"');
    expect(off).not.toContain('Records desk');
  });

  it('escapes the id on the no-floor-plan page', () => {
    expect(render(createInitialState(), '<img src=x>')).not.toContain('<img src=x>');
  });

  it('no rendered interior contains white-space: nowrap or a fixed width over 360px', () => {
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' });
    s = file(s, 'gmail-recon-login', { finding: '1-2-breaches' });
    for (const st of [createInitialState(), s]) {
      // The shared HUD is not part of the interior.
      const html = render(st).replace(renderHud(st), '');
      expect(html).not.toMatch(/white-space:\s*nowrap/);
      for (const m of html.matchAll(/(?:min-)?width:\s*(\d{3,4})px/g)) {
        if (!/max-width/.test(html.slice(Math.max(0, m.index - 4), m.index))) expect(Number(m[1])).toBeLessThanOrEqual(360);
      }
    }
  });

  it('not-checked entries show the fix beside START; the state icon has a readable label', () => {
    const html = render(createInitialState());
    const fix = getInterior('gmail').entries.find((e) => e.id === 'near-you').fix;
    expect(entryHtml(html, 'near-you')).toContain(fix.replace(/’/g, '’'));
    expect(entryHtml(html, 'near-you')).toContain('aria-label="Not checked yet"');
    expect(entryHtml(html, 'state')).toContain('aria-label="Beyond your control"');
    const s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' });
    expect(entryHtml(render(s), 'sim-swap')).toContain('aria-label="Open"');
    const p = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' });
    expect(entryHtml(render(p), 'phishing')).toContain('aria-label="Sealed"');
  });

  it('no rendered state says "they", including notes and narrows', () => {
    const passkey = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' });
    const auth = file(createInitialState(), 'gmail-fortify-2fa', { method: 'authenticator' });
    let mixed = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' });
    mixed = file(mixed, 'gmail-recon-login', { finding: '1-2-breaches' });
    for (const st of [createInitialState(), passkey, auth, mixed, { ...createInitialState(), pmFlagged: ['gmail'] }]) {
      const html = render(st);
      const text = html.replace(renderHud(st), '').replace(/<[^>]+>/g, ' ');
      expect(text).not.toMatch(/\bthey\b/i);
    }
    // The states above do reach the note and narrows copy.
    expect(render(auth)).toContain('Sealed once text-message backup is off.');
    expect(render(passkey)).toContain('Advanced Protection Program');
  });

  it('source links open in a new tab with noopener; no "they" in the static labels', () => {
    const html = render(createInitialState());
    const links = [...html.matchAll(/<a [^>]*href="https?:[^"]*"[^>]*>/g)].map((m) => m[0]);
    expect(links.length).toBeGreaterThan(10);
    for (const a of links) {
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener"');
    }
    const text = html.replace(renderHud(createInitialState()), '').replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\bthey\b/i);
  });

  it('the desk lanes and entry sources all appear', () => {
    const html = render(createInitialState());
    const interior = getInterior('gmail');
    for (const lane of interior.desk) for (const src of lane.sources) expect(html).toContain(src.url.replace(/&/g, '&amp;'));
    for (const e of interior.entries) for (const src of e.sources) expect(html).toContain(src.url.replace(/&/g, '&amp;'));
  });
});

describe('tappable buildings', () => {
  it('glow 0 and no href leave the markup byte-identical', () => {
    for (const st of ['occupied', 'in-progress', 'liberated', 'liberated-scarred']) {
      expect(renderBuilding('gmail', st, 64, {})).toBe(renderBuilding('gmail', st, 64));
      expect(renderBuilding('gmail', st, 64, { glow: 0 })).toBe(renderBuilding('gmail', st));
    }
  });

  it('href wraps the building in a link; glow adds a drop-shadow', () => {
    const linked = renderBuilding('gmail', 'occupied', 64, { href: '#/building/gmail' });
    expect(linked).toMatch(/^\s*<a class="building-link" href="#\/building\/gmail"/);
    expect(linked).toContain(renderBuilding('gmail', 'occupied', 64).trim());
    const glowing = renderBuilding('gmail', 'occupied', 64, { glow: 0.5 });
    expect(glowing).toContain('drop-shadow(0 0 10px rgba(0,229,255,0.3))');
  });

  it('district strip links enabled buildings with interiors, and only those', () => {
    const s = createInitialState();
    const html = renderDistrict(s, 'master-keys', 'survey');
    const links = [...html.matchAll(/class="building-link" href="([^"]+)"/g)].map((m) => m[1]);
    expect(links).toEqual(['gmail', 'outlook', 'icloud', 'yahoo', 'protonmail', 'apple_id', 'google', 'microsoft', 'facebook'].map((id) => `#/building/${id}`));
    const off = renderDistrict(toggleAccount(s, 'gmail', false), 'master-keys', 'survey');
    expect(off).not.toContain('href="#/building/gmail"');
    const square = [...renderDistrict(s, 'square', 'survey').matchAll(/class="building-link" href="([^"]+)"/g)].map((m) => m[1]);
    expect(square).toEqual(['#/building/signal']);
    expect(renderDistrict(s, 'vault', 'survey')).not.toContain('building-link');
  });
});

describe('the single-lane desk (task 7)', () => {
  it('signal desk is a single lane and renders as a note', () => {
    let s = createInitialState();
    if (!s.accounts.signal?.enabled) s = toggleAccount(s, 'signal', true);
    const html = renderBuildingInterior(s, 'signal', { now: NOW });
    expect(html).toContain('desk--note');
    expect(html.match(/class="slip[ "]/g)).toHaveLength(1);
    expect(html).toContain('Any agency, any legal process');
  });

  it('a desk with several lanes is not a note', () => {
    const html = renderBuildingInterior(createInitialState(), 'gmail', { now: NOW });
    expect(html).not.toContain('desk--note');
  });
});

describe('signal roof (fix round 1)', () => {
  it('has a registration-lock row with START, and no password or two-factor rows', () => {
    const s = toggleAccount(createInitialState(), 'signal', true);
    const html = renderBuildingInterior(s, 'signal', { now: NOW });
    expect(rowHtml(html, 'password')).toBe('');
    expect(rowHtml(html, 'two-factor')).toBe('');
    const lock = rowHtml(html, 'reglock');
    expect(lock).toContain('Registration lock');
    expect(lock).toContain('START');
    expect(lock).toContain('#/mission/signal-fortify-reglock/briefing');
  });
});
