import { telemetry } from './telemetry.js';

const STORAGE_KEY = 'reclaim-city-state';

const DEFAULT_STATE = {
  surveyDone: false,
  accounts: {},
  missions: {},
  firstVisit: null,
  lastVisit: null,
};

let state = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
      return true;
    }
  } catch (e) {
    telemetry.storageError('read');
  }
  return false;
}

function save() {
  try {
    state.lastVisit = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    telemetry.storageError('write');
  }
}

export function initState() {
  const existed = load();
  if (!existed) {
    state = { ...DEFAULT_STATE, firstVisit: Date.now(), lastVisit: Date.now() };
    save();
    telemetry.gameStart();
  } else {
    const pct = getLiberationPct();
    telemetry.gameReturn(pct);
  }
  return state;
}

export function getState() {
  return state;
}

export function setSurvey(accountMap) {
  state.surveyDone = true;
  state.accounts = { ...accountMap };
  save();
}

export function hasAccount(accountId) {
  return state.accounts[accountId] === true;
}

export function getMission(missionId) {
  return state.missions[missionId] || null;
}

export function startMission(missionId) {
  state.missions[missionId] = { status: 'started', startedAt: Date.now() };
  save();
}

export function completeMission(missionId, answers) {
  state.missions[missionId] = {
    status: 'complete',
    answers,
    completedAt: Date.now(),
  };
  save();
}

export function skipMission(missionId) {
  state.missions[missionId] = { status: 'skipped', skippedAt: Date.now() };
  save();
}

export function isMissionDone(missionId) {
  const m = state.missions[missionId];
  return m && m.status === 'complete';
}

export function isMissionSkipped(missionId) {
  const m = state.missions[missionId];
  return m && m.status === 'skipped';
}

export function getDistrictMissions(districtId, allMissions) {
  return allMissions.filter(m => {
    if (m.district !== districtId) return false;
    if (m.phase !== 'survey' && m.accountId && !hasAccount(m.accountId)) return false;
    return true;
  });
}

export function getDistrictProgress(districtId, allMissions) {
  const missions = getDistrictMissions(districtId, allMissions);
  if (missions.length === 0) return { total: 0, done: 0, pct: 0 };
  const done = missions.filter(m => isMissionDone(m.id)).length;
  return { total: missions.length, done, pct: Math.round((done / missions.length) * 100) };
}

export function getLiberationPct() {
  const total = Object.values(state.missions).length;
  if (total === 0) return 0;
  const done = Object.values(state.missions).filter(m => m.status === 'complete').length;
  return Math.round((done / Math.max(total, 1)) * 100);
}

export function getTimeSinceLastVisit() {
  if (!state.lastVisit) return 0;
  return Date.now() - state.lastVisit;
}

export function getFindingCounts() {
  const counts = { clean: 0, minor: 0, major: 0, resets: 0, tfaEnabled: 0 };
  for (const m of Object.values(state.missions)) {
    if (m.status !== 'complete' || !m.answers) continue;
    const f = m.answers.finding;
    if (f === 'clean') counts.clean++;
    else if (f === 'minor') counts.minor++;
    else if (f === 'major') counts.major++;
    if (m.answers.action === 'reset') counts.resets++;
    if (m.answers.action === 'tfa-enabled') counts.tfaEnabled++;
  }
  return counts;
}
