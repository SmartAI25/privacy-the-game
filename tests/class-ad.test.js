import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLASS_AD, classAdActive, classAdHtml, classTimeLabel } from '../src/components/class-ad.js';

afterEach(() => vi.unstubAllGlobals());

describe('class 240 banner', () => {
  it('shows before the class starts and stops at 6pm PT / 9pm ET on 10/28', () => {
    expect(CLASS_AD.start).toBe(Date.parse('2026-10-28T18:00:00-07:00'));
    expect(CLASS_AD.start).toBe(Date.parse('2026-10-28T21:00:00-04:00'));
    expect(classAdActive(CLASS_AD.start - 1)).toBe(true);
    expect(classAdActive(CLASS_AD.start)).toBe(false);
    expect(classAdActive(Date.parse('2026-11-01T00:00:00Z'))).toBe(false);
  });

  it('gives the time in the viewer\'s time zone', () => {
    expect(classTimeLabel(CLASS_AD, 'America/Los_Angeles')).toBe('WED, 10/28, 6:00 PM PDT');
    expect(classTimeLabel(CLASS_AD, 'America/New_York')).toBe('WED, 10/28, 9:00 PM EDT');
  });

  it('links to the class page in a new tab, tagged as from the game', () => {
    const html = classAdHtml(CLASS_AD, 'America/New_York');
    expect(html).toContain('href="https://themultiverse.school/classes/240?utm_source=reclaim-city&utm_medium=game&utm_content=class-ad" target="_blank" rel="noopener"');
    expect(html).toContain('Consumer Device Rescue &amp; Defense'.replace('&amp;', '&'));
    expect(html).toContain('data-class-ad-dismiss');
  });

  it('is skipped in the campus cabinet and counted only through analytics.js', () => {
    const src = readFileSync(new URL('../src/components/class-ad.js', import.meta.url), 'utf8');
    expect(src).toContain('isCabinetMode()');
    expect(src).not.toMatch(/umami/i);
    const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
    expect(app).toContain('mountClassAd();');
  });
});
