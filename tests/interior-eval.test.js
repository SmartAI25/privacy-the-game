import { describe, it, expect } from 'vitest';
import { createInitialState, updateMission } from '../src/state.js';
import { getInterior } from '../src/data/interiors/index.js';
import {
  freshness, recordDate, currentTwoFactor, entryState, checkupRows, sealedCount, isFullySealed,
} from '../src/utils/interior.js';

const NOW = new Date('2026-10-20T00:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 864e5).toISOString();
function file(state, id, update, at) {
  const s = updateMission(state, id, { status: 'completed', ...update });
  if (at) s.missions[id].completedAt = at;
  return s;
}
const gmail = () => getInterior('gmail');
const byRule = (rule) => gmail().entries.find((e) => e.rule === rule);

describe('freshness', () => {
  it('10d fresh, 45d aging, 120d stale, missing/invalid unknown', () => {
    expect(freshness(daysAgo(10), NOW)).toBe('fresh');
    expect(freshness(daysAgo(30), NOW)).toBe('fresh');
    expect(freshness(daysAgo(45), NOW)).toBe('aging');
    expect(freshness(daysAgo(90), NOW)).toBe('aging');
    expect(freshness(daysAgo(120), NOW)).toBe('stale');
    expect(freshness(undefined, NOW)).toBe('unknown');
    expect(freshness('garbage', NOW)).toBe('unknown');
  });
  it('recordDate prefers rechecked over completedAt', () => {
    expect(recordDate({ rechecked: 'a', completedAt: 'b' })).toBe('a');
    expect(recordDate({ completedAt: 'b' })).toBe('b');
    expect(recordDate(undefined)).toBeUndefined();
  });
});

describe('entryState on gmail', () => {
  it('a fresh save: every controllable entry is not-checked, 0/0, not fully sealed', () => {
    const s = createInitialState();
    for (const e of gmail().entries) {
      expect(entryState(s, 'gmail', e).state).toBe(e.rule === 'beyond' ? 'beyond' : 'not-checked');
    }
    expect(sealedCount(s, 'gmail')).toEqual({ sealed: 0, total: 0 });
    expect(isFullySealed(s, 'gmail')).toBe(false);
  });

  it('sms: phone line and mail slot open; authenticator: phone sealed with note, mail open; passkey both sealed', () => {
    const sim = byRule('sim-swap'); const ph = byRule('phishing');
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' });
    expect(entryState(s, 'gmail', sim).state).toBe('open');
    expect(entryState(s, 'gmail', ph).state).toBe('open');
    s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'authenticator' });
    const r = entryState(s, 'gmail', sim);
    expect(r.state).toBe('sealed');
    expect(r.note).toBe('Sealed once text-message backup is off. Check under recovery options.');
    expect(entryState(s, 'gmail', ph).state).toBe('open');
    s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' });
    expect(entryState(s, 'gmail', sim).state).toBe('sealed');
    expect(entryState(s, 'gmail', ph).state).toBe('sealed');
  });

  it('2FA upgrade filed later wins over the original', () => {
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' }, daysAgo(50));
    s = file(s, 'gmail-fortify-2fa-upgrade', { method: 'passkey' }, daysAgo(5));
    expect(currentTwoFactor(s, 'gmail')).toMatchObject({ method: 'passkey', missionId: 'gmail-fortify-2fa-upgrade' });
    expect(entryState(s, 'gmail', byRule('phishing')).state).toBe('sealed');
  });

  it('legacy 2FA record with no method is not-checked, never open', () => {
    const s = file(createInitialState(), 'gmail-fortify-2fa', { action: 'enabled-2fa' });
    expect(currentTwoFactor(s, 'gmail').method).toBeNull();
    expect(entryState(s, 'gmail', byRule('sim-swap')).state).toBe('not-checked');
    expect(entryState(s, 'gmail', byRule('phishing')).state).toBe('not-checked');
  });

  it('already-strong seals the front door; pm flag without reset opens it', () => {
    const pw = byRule('password-unique');
    let s = file(createInitialState(), 'gmail-fortify-password', { action: 'already-strong' });
    expect(entryState(s, 'gmail', pw).state).toBe('sealed');
    s = { ...createInitialState(), pmFlagged: ['gmail'] };
    expect(entryState(s, 'gmail', pw).state).toBe('open');
    s = file(s, 'gmail-fortify-password', { action: 'reset-password' });
    expect(entryState(s, 'gmail', pw).state).toBe('sealed');
  });

  it('pw-clean evidence seals', () => {
    const s = file(createInitialState(), 'gmail-recon-password', { pw_status: 'pw-clean' });
    expect(entryState(s, 'gmail', byRule('password-unique')).state).toBe('sealed');
  });

  it('isFullySealed ignores not-checked and beyond', () => {
    let s = file(createInitialState(), 'gmail-fortify-password', { action: 'reset-password' });
    expect(sealedCount(s, 'gmail')).toEqual({ sealed: 1, total: 1 });
    expect(isFullySealed(s, 'gmail')).toBe(true);
    s = file(s, 'gmail-fortify-2fa', { method: 'sms' });
    expect(isFullySealed(s, 'gmail')).toBe(false);
  });
});

describe('devices and reglock (synthetic entries)', () => {
  const dev = { rule: 'devices' }; const reg = { rule: 'reglock' };
  it('devices', () => {
    expect(entryState(createInitialState(), 'signal', dev).state).toBe('not-checked');
    let s = file(createInitialState(), 'signal-recon-devices', { finding: 'no-breaches' });
    expect(entryState(s, 'signal', dev).state).toBe('sealed');
    s = file(createInitialState(), 'signal-recon-devices', { finding: '3plus-breaches' });
    expect(entryState(s, 'signal', dev).state).toBe('open');
    s = file(createInitialState(), 'gmail-recon-login', { finding: '1-2-breaches' });
    expect(entryState(s, 'gmail', dev).state).toBe('open');
  });
  it('reglock', () => {
    expect(entryState(createInitialState(), 'signal', reg).state).toBe('not-checked');
    for (const [a, st] of [['enabled-2fa', 'sealed'], ['already-enabled', 'sealed'], ['later', 'open']]) {
      const s = file(createInitialState(), 'signal-fortify-reglock', { action: a });
      expect(entryState(s, 'signal', reg).state).toBe(st);
    }
  });
});

describe('checkupRows', () => {
  it('leak row only for email-address accounts', () => {
    const s = createInitialState();
    expect(checkupRows(s, 'gmail', NOW).map((r) => r.id)).toEqual(['password', 'leak', 'two-factor', 'devices']);
    expect(checkupRows(s, 'facebook', NOW).map((r) => r.id)).toEqual(['password', 'two-factor', 'devices']);
    expect(checkupRows(s, 'gmail', NOW).every((r) => r.status === 'not-checked')).toBe(true);
  });
  it('facebook with only the replaced recon record reads without throwing', () => {
    const s = file(createInitialState(), 'facebook-recon-breach', { finding: 'no-breaches' });
    expect(() => checkupRows(s, 'facebook', NOW)).not.toThrow();
  });
  it('a completed record without completedAt has freshness unknown', () => {
    const s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'passkey' });
    delete s.missions['gmail-fortify-2fa'].completedAt;
    const row = checkupRows(s, 'gmail', NOW).find((r) => r.id === 'two-factor');
    expect(row.status).toBe('ok');
    expect(row.freshness).toBe('unknown');
  });
  it('statuses map filings', () => {
    let s = file(createInitialState(), 'gmail-fortify-2fa', { method: 'sms' }, daysAgo(10));
    s = file(s, 'gmail-recon-breach', { finding: '3plus-breaches', password_exposed: 'yes' });
    const rows = Object.fromEntries(checkupRows(s, 'gmail', NOW).map((r) => [r.id, r]));
    expect(rows['two-factor']).toMatchObject({ status: 'warn', freshness: 'fresh', missionId: 'gmail-fortify-2fa' });
    expect(rows.leak.status).toBe('crit');
  });
});

describe('checkupRows only shows rows a mission can fill (fix round 1)', () => {
  it('signal: no password or two-factor rows; a registration-lock row instead', () => {
    const s = createInitialState();
    const rows = checkupRows(s, 'signal', NOW);
    expect(rows.map((r) => r.id)).toEqual(['reglock', 'devices']);
    const lock = rows.find((r) => r.id === 'reglock');
    expect(lock).toMatchObject({ status: 'not-checked', missionId: 'signal-fortify-reglock' });
    expect(lock.label).not.toMatch(/\bthey\b/i);
  });

  it('registration-lock row status follows the filed action', () => {
    const st = (action) => checkupRows(file(createInitialState(), 'signal-fortify-reglock', { action }, daysAgo(3)), 'signal', NOW).find((r) => r.id === 'reglock');
    expect(st('enabled-2fa')).toMatchObject({ status: 'ok', freshness: 'fresh' });
    expect(st('already-enabled').status).toBe('ok');
    expect(st('later').status).toBe('crit');
  });

  it('gmail rows are unchanged and have no registration-lock row', () => {
    expect(checkupRows(createInitialState(), 'gmail', NOW).map((r) => r.id)).toEqual(['password', 'leak', 'two-factor', 'devices']);
  });
});
