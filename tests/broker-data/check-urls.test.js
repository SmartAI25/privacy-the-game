import { describe, it, expect } from 'vitest';
import { classifyResponse, localDate, matchesOnly, registrableDomain } from '../../research/data-brokers/build/check-urls.js';

const c = (requestedUrl, finalUrl, status, error) => classifyResponse({ requestedUrl, finalUrl, status, error });

describe('classifyResponse', () => {
  it('404 is dead', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 404)).toBe('dead');
  });
  it('410 is dead', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 410)).toBe('dead');
  });
  it('403 is blocked', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 403)).toBe('blocked');
  });
  it('429 is blocked', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 429)).toBe('blocked');
  });
  it('500 is blocked', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 500)).toBe('blocked');
  });
  it('DNS failure is dead', () => {
    expect(c('https://a.com/optout', null, null, 'ENOTFOUND')).toBe('dead');
  });
  it('timeout is blocked', () => {
    expect(c('https://a.com/optout', null, null, 'TimeoutError')).toBe('blocked');
  });
  it('redirect to root is suspect', () => {
    expect(c('https://a.com/privacy/optout', 'https://a.com/', 200)).toBe('suspect');
  });
  it('cross-domain redirect is suspect', () => {
    expect(c('https://a.com/optout', 'https://other.org/optout', 200)).toBe('suspect');
  });
  it('same-path 200 is verified', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 200)).toBe('verified');
  });
  it('www vs apex is same domain', () => {
    expect(c('https://a.com/optout', 'https://www.a.com/optout', 200)).toBe('verified');
  });
  it('a requested root stays verified at root', () => {
    expect(c('https://a.com/', 'https://a.com/', 200)).toBe('verified');
  });
});

describe('registrableDomain', () => {
  it('strips www and subdomains', () => {
    expect(registrableDomain('https://www.a.com/x')).toBe('a.com');
    expect(registrableDomain('https://privacy.shop.a.com')).toBe('a.com');
  });
  it('handles multi-part suffixes', () => {
    expect(registrableDomain('https://www.foo.co.uk/')).toBe('foo.co.uk');
    expect(registrableDomain('https://x.foo.com.au/')).toBe('foo.com.au');
    expect(registrableDomain('https://foo.co.jp/')).toBe('foo.co.jp');
  });
});

describe('localDate', () => {
  it('uses local calendar fields, zero-padded', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDate(new Date(2026, 9, 18, 0, 1))).toBe('2026-10-18');
  });
});

describe('matchesOnly', () => {
  const b = (optOut) => ({ id: 'x', optOut });
  it('no filter matches everything', () => expect(matchesOnly(b(null), undefined)).toBe(true));
  it('--only=unchecked matches a literal unchecked and a missing status', () => {
    expect(matchesOnly(b({ method: 'web-form', url: 'https://a.com/o', status: 'unchecked' }), 'unchecked')).toBe(true);
    expect(matchesOnly(b({ method: 'web-form', url: 'https://a.com/o' }), 'unchecked')).toBe(true);
    expect(matchesOnly(b({ method: 'web-form', url: 'https://a.com/o', status: 'verified' }), 'unchecked')).toBe(false);
  });
  it('other filters match only that status', () => {
    expect(matchesOnly(b({ method: 'web-form', url: 'https://a.com/o', status: 'blocked' }), 'blocked')).toBe(true);
    expect(matchesOnly(b({ method: 'web-form', url: 'https://a.com/o' }), 'blocked')).toBe(false);
  });
  it('a record with no opt-out never matches a filter', () => expect(matchesOnly(b(null), 'unchecked')).toBe(false));
});
