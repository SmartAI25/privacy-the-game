// Building Interiors evaluator: save state + interior content -> checkup rows,
// entry seal states, counts and freshness. Pure; never fabricates state:
// anything unfiled or unreadable is 'not-checked'. Seals lean strict.
import { getInterior } from '../data/interiors/index.js';
import { MISSIONS } from '../data/missions.js';
import { EMAIL_ACCOUNT_IDS } from './calc.js';
import { isMissionDoneIn } from './mission-status.js';
import { twoFactorMethod, STRONG_METHODS } from './two-factor.js';
import { passwordResetNeed, passwordEvidence, emailBreachRecord } from './password-need.js';

const DAY = 864e5;
const SIM_NOTE = 'Sealed once text-message backup is off. Check under recovery options.';
const BREACHED = new Set(['1-2-breaches', '3plus-breaches']);

export function freshness(iso, now = new Date()) {
  if (!iso) return 'unknown';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 'unknown';
  const days = (now.getTime() - t) / DAY;
  if (days <= 30) return 'fresh';
  if (days <= 90) return 'aging';
  return 'stale';
}

export function recordDate(record) {
  return record?.rechecked ?? record?.completedAt;
}

// The completed record for a mission id (or the old one it replaces), else null.
function doneRecord(state, id) {
  const mission = MISSIONS.find((m) => m.id === id) || { id };
  if (!isMissionDoneIn(state, mission)) return null;
  const own = state?.missions?.[id];
  if (own?.status === 'completed') return own;
  const old = mission.replaces ? state?.missions?.[mission.replaces] : null;
  return old?.status === 'completed' ? old : null;
}

const time = (iso) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

export function currentTwoFactor(state, accountId) {
  const ids = [`${accountId}-fortify-2fa`, `${accountId}-fortify-2fa-upgrade`];
  let best = null;
  for (const id of ids) {
    const r = doneRecord(state, id);
    if (!r) continue;
    // Later date wins; a tie goes to the upgrade (listed last).
    if (!best || time(recordDate(r)) >= time(recordDate(best.r))) best = { id, r };
  }
  if (!best) return { method: null, missionId: null, date: undefined };
  const method = twoFactorMethod(best.r) ?? null;
  return { method, missionId: best.id, date: recordDate(best.r) };
}

function devicesMissionId(accountId) {
  return accountId === 'signal' ? 'signal-recon-devices' : `${accountId}-recon-login`;
}

function passwordSeal(state, accountId) {
  const rec = doneRecord(state, `${accountId}-fortify-password`);
  if (rec && ['reset-password', 'already-strong'].includes(rec.action)) {
    return { sealed: true, missionId: `${accountId}-fortify-password`, date: recordDate(rec) };
  }
  if (passwordEvidence(state, accountId).pw === 'pw-clean') return { sealed: true, missionId: null, date: undefined };
  return { sealed: false };
}

export function entryState(state, accountId, entry) {
  const nc = { state: 'not-checked', missionId: null, date: undefined };
  switch (entry?.rule) {
    case 'beyond':
      return { state: 'beyond', missionId: null, date: undefined };
    case 'password-unique': {
      const seal = passwordSeal(state, accountId);
      if (seal.sealed) return { state: 'sealed', missionId: seal.missionId, date: seal.date };
      if (passwordResetNeed(state, accountId) === 'needed') {
        return { state: 'open', missionId: `${accountId}-fortify-password`, date: undefined };
      }
      return nc;
    }
    case 'sim-swap':
    case 'phishing': {
      const { method, missionId, date } = currentTwoFactor(state, accountId);
      if (!method) return nc;
      if (entry.rule === 'phishing') {
        return { state: method === 'passkey' ? 'sealed' : 'open', missionId, date };
      }
      if (STRONG_METHODS.includes(method)) return { state: 'sealed', missionId, date, note: SIM_NOTE };
      if (['sms', 'email', 'none'].includes(method)) return { state: 'open', missionId, date };
      return nc;
    }
    case 'devices': {
      const id = devicesMissionId(accountId);
      const rec = doneRecord(state, id);
      if (!rec) return nc;
      const date = recordDate(rec);
      if (rec.finding === 'no-breaches') return { state: 'sealed', missionId: id, date };
      if (BREACHED.has(rec.finding)) return { state: 'open', missionId: id, date };
      return nc;
    }
    case 'reglock': {
      const id = 'signal-fortify-reglock';
      const rec = doneRecord(state, id);
      if (!rec) return nc;
      const date = recordDate(rec);
      if (['enabled-2fa', 'already-enabled'].includes(rec.action)) return { state: 'sealed', missionId: id, date };
      if (rec.action === 'later') return { state: 'open', missionId: id, date };
      return nc;
    }
    default:
      return nc;
  }
}

export function checkupRows(state, accountId, now = new Date()) {
  const row = (id, status, label, missionId, date) => ({
    id, status, label, missionId: missionId ?? null, freshness: freshness(date, now),
  });
  const rows = [];

  const pwId = `${accountId}-fortify-password`;
  const seal = passwordSeal(state, accountId);
  if (seal.sealed) rows.push(row('password', 'ok', 'Password is unique', pwId, seal.date));
  else if (passwordResetNeed(state, accountId) === 'needed') rows.push(row('password', 'crit', 'Password needs a reset', pwId));
  else rows.push(row('password', 'not-checked', 'Password not checked', pwId));

  if (EMAIL_ACCOUNT_IDS.has(accountId)) {
    const id = `${accountId}-recon-breach`;
    const rec = emailBreachRecord(state, accountId);
    const date = recordDate(rec);
    if (rec?.finding === 'no-breaches') rows.push(row('leak', 'ok', 'No known leaks', id, date));
    else if (rec && BREACHED.has(rec.finding)) {
      rows.push(row('leak', rec.password_exposed === 'no' ? 'warn' : 'crit', 'Address found in a leak', id, date));
    } else rows.push(row('leak', 'not-checked', 'Leaks not checked', id));
  }

  const tf = currentTwoFactor(state, accountId);
  const tfId = tf.missionId ?? `${accountId}-fortify-2fa`;
  if (!tf.method) rows.push(row('two-factor', 'not-checked', 'Two-step sign-in not checked', tfId));
  else if (STRONG_METHODS.includes(tf.method)) rows.push(row('two-factor', 'ok', 'Strong two-step sign-in', tfId, tf.date));
  else if (tf.method === 'none') rows.push(row('two-factor', 'crit', 'No two-step sign-in', tfId, tf.date));
  else rows.push(row('two-factor', 'warn', 'Two-step sign-in by code only', tfId, tf.date));

  const dId = devicesMissionId(accountId);
  const dRec = doneRecord(state, dId);
  const dDate = recordDate(dRec);
  if (dRec?.finding === 'no-breaches') rows.push(row('devices', 'ok', 'Sign-ins look like yours', dId, dDate));
  else if (dRec?.finding === '1-2-breaches') rows.push(row('devices', 'warn', 'A sign-in was not yours', dId, dDate));
  else if (dRec?.finding === '3plus-breaches') rows.push(row('devices', 'crit', 'Several sign-ins were not yours', dId, dDate));
  else rows.push(row('devices', 'not-checked', 'Sign-ins not checked', dId));
  return rows;
}

export function sealedCount(state, accountId) {
  let sealed = 0;
  let open = 0;
  for (const e of getInterior(accountId)?.entries ?? []) {
    const s = entryState(state, accountId, e).state;
    if (s === 'sealed') sealed += 1;
    else if (s === 'open') open += 1;
  }
  return { sealed, total: sealed + open };
}

export function isFullySealed(state, accountId) {
  const { sealed, total } = sealedCount(state, accountId);
  return total > 0 && sealed === total;
}
