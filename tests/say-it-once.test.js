import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderTimeline } from '../src/screens/timeline.js';
import { renderDistrict } from '../src/screens/district.js';
import { renderStats } from '../src/screens/stats.js';
import { DISTRICTS } from '../src/data/districts.js';
import { ACCOUNTS } from '../src/data/accounts.js';
import { createInitialState } from '../src/state.js';

beforeEach(() => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
});

const count = (s, sub) => s.split(sub).length - 1;
const css = readFileSync('src/style.css', 'utf8');

describe('Social Timeline', () => {
  it('the set-up sentence appears once, above the list', () => {
    const s = createInitialState();
    for (const id of ['instagram', 'facebook', 'twitter', 'tiktok', 'linkedin']) s.accounts[id] = { ...(s.accounts[id] || {}), enabled: true };
    const html = renderTimeline(s);
    const line = 'Tell us about your history here to plan your review.';
    expect(count(html, 'data-action="edit-social-profile"')).toBe(5);
    expect(count(html, line)).toBe(1);
    expect(html.indexOf(line)).toBeLessThan(html.indexOf('data-action="edit-social-profile"'));
  });

  it('with every platform set up, it is not shown', () => {
    const s = createInitialState();
    for (const id of ['facebook', 'twitter', 'tiktok', 'linkedin']) if (s.accounts[id]) s.accounts[id] = { ...s.accounts[id], enabled: false };
    s.accounts.instagram = { ...(s.accounts.instagram || {}), enabled: true };
    s.socialHistory = { instagram: { joinYear: 2015, eras: [] } };
    expect(renderTimeline(s)).not.toContain('Tell us about your history here');
  });
});

describe('district survey grammar', () => {
  it('every survey question has the right article and says "account" once', () => {
    for (const d of DISTRICTS) {
      if (!d.surveyQuestion) continue;
      for (const a of Object.values(ACCOUNTS).filter((x) => x.district === d.id)) {
        const q = d.surveyQuestion(a.name);
        expect(q, q).not.toMatch(/\baccount account\b/i);
        expect(q, q).not.toMatch(/\ba [aeiou]/i);
      }
    }
    const vault = DISTRICTS.find((d) => d.id === 'vault');
    expect(vault.surveyQuestion('Investment Account')).toBe('Do you have an Investment Account?');
    expect(vault.surveyQuestion('PayPal')).toBe('Do you have a PayPal account?');
  });

  it('the Vault survey on the page reads right', () => {
    const s = createInitialState();
    const html = renderDistrict(s, 'vault', 'survey');
    expect(html).not.toContain('a Investment Account account');
    expect(html).toContain('Do you have an Investment Account?');
  });
});

describe('Stats draws it tighter on phones', () => {
  it('three dials share a row and the four findings make a 2×2 grid, with the same words', () => {
    const html = renderStats(createInitialState());
    expect(html).toContain('class="stats-dials"');
    expect(html).toContain('class="stats-findings"');
    for (const w of ['INTEGRITY', 'EXPOSURE', 'STREAK', 'BEST', 'ADDRESSES IN A BREACH', 'PASSWORDS RESET', '2FA ENABLED', 'OPT-OUTS FILED']) expect(html).toContain(w);
    const phone = css.slice(css.indexOf('/* stats: start */'), css.indexOf('/* stats: end */'));
    expect(phone).toMatch(/@media \(max-width: 899px\)/);
    expect(phone).toMatch(/\.stats-dials \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(phone).toMatch(/\.stats-findings \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
    expect(phone).not.toMatch(/white-space:\s*nowrap/);
  });
});
