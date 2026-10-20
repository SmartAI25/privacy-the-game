import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { MISSIONS } from '../src/data/missions.js';
import { applyRecheck } from '../src/utils/debrief.js';
import { createInitialState } from '../src/state.js';
import { renderDebrief } from '../src/screens/debrief.js';

vi.mock('../src/utils/analytics.js', () => ({
  track: vi.fn(), trackNow: vi.fn(), trackPageview: vi.fn(), trackThenStop: vi.fn(), waitForTracker: vi.fn(),
}));
import * as analytics from '../src/utils/analytics.js';

beforeEach(() => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  vi.clearAllMocks();
});

const mission = MISSIONS.find((m) => m.id === 'gmail-recon-login');
const answersWith = (pick) => {
  const a = {};
  for (const q of mission.debriefQs) if (!q.showIf) a[q.id] = pick(q);
  return a;
};
const first = (q) => q.options.find((o) => o.severity !== 'skip' && o.value !== 'skip' && o.value !== 'later').value;
const good = () => {
  const a = answersWith(first);
  // answer follow-ups made visible
  for (let i = 0; i < 3; i++) {
    for (const q of mission.debriefQs) if (q.showIf && a[q.id] === undefined) a[q.id] = first(q);
  }
  return a;
};
const completedState = (extra = {}) => {
  const s = createInitialState();
  s.missions = { ...s.missions, [mission.id]: { status: 'completed', completedAt: '2026-01-01T00:00:00.000Z', finding: 'old', ...extra } };
  return s;
};

describe('applyRecheck', () => {
  it('keeps status and completedAt, merges answers, sets rechecked', () => {
    const state = completedState();
    const next = applyRecheck(state, mission, good(), '2026-10-20T00:00:00.000Z');
    const rec = next.missions[mission.id];
    expect(rec.status).toBe('completed');
    expect(rec.completedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(rec.rechecked).toBe('2026-10-20T00:00:00.000Z');
    for (const q of mission.debriefQs) if (good()[q.id] !== undefined) expect(rec[q.id]).toBe(good()[q.id]);
    expect(state.missions[mission.id].rechecked).toBeUndefined();
  });

  it('returns null for skipped, not-needed, and unfiled missions', () => {
    for (const status of ['skipped', 'not-needed']) {
      const s = completedState();
      s.missions[mission.id] = { status };
      expect(applyRecheck(s, mission, good())).toBeNull();
    }
    const s = createInitialState();
    delete s.missions[mission.id];
    expect(applyRecheck(s, mission, good())).toBeNull();
  });

  it('returns null for incomplete answers or a skip answer, leaving the record alone', () => {
    const state = completedState();
    expect(applyRecheck(state, mission, {})).toBeNull();
    const skipQ = mission.debriefQs.find((q) => !q.showIf);
    const skipOpt = skipQ.options.find((o) => o.value === 'skip' || o.value === 'later' || o.severity === 'skip');
    if (skipOpt) expect(applyRecheck(state, mission, { ...good(), [skipQ.id]: skipOpt.value })).toBeNull();
  });

  it('never reaches analytics: no track calls, and the action path has no track or filing tail', () => {
    applyRecheck(completedState(), mission, good());
    for (const fn of Object.values(analytics)) expect(fn).not.toHaveBeenCalled();
    const util = readFileSync('src/utils/debrief.js', 'utf8');
    expect(util).not.toMatch(/analytics/);
    const app = readFileSync('src/app.js', 'utf8');
    const body = app.slice(app.indexOf('function submitRecheck'), app.indexOf('function readAnswers'));
    expect(body.length).toBeGreaterThan(100);
    expect(body).not.toMatch(/track|afterMissionRecorded|updateMission|fileDebrief/);
  });
});

describe('recheck screen', () => {
  it('shows an editable, prefilled form with RE-CHECK and submit-recheck for a completed mission', () => {
    const answers = good();
    const state = completedState(answers);
    const html = renderDebrief(state, mission.id, { recheck: true });
    expect(html).toContain('RE-CHECK');
    expect(html).toContain('data-action="submit-recheck"');
    expect(html).not.toContain('data-action="submit-debrief"');
    expect(html).not.toContain('SECURED');
    const q = mission.debriefQs[0];
    expect(html).toMatch(new RegExp(`name="q_${q.id}" value="${answers[q.id]}" checked`));
  });

  it('renders the normal briefing link, not a form, for non-completed missions', () => {
    for (const rec of [{ status: 'skipped' }, { status: 'not-needed' }, undefined]) {
      const s = createInitialState();
      s.missions = { ...s.missions };
      if (rec) s.missions[mission.id] = rec; else delete s.missions[mission.id];
      const html = renderDebrief(s, mission.id, { recheck: true });
      expect(html).toContain(`#/mission/${mission.id}/briefing`);
      expect(html).not.toContain('submit-recheck');
      expect(html).not.toContain('type="radio"');
    }
  });

  it('plain debrief of a completed mission is unchanged (SECURED, no form)', () => {
    const html = renderDebrief(completedState(good()), mission.id);
    expect(html).toContain('SECURED');
    expect(html).not.toContain('submit-recheck');
  });
});
