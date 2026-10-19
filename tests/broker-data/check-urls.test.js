import { describe, it, expect } from 'vitest';
import { classifyResponse, registrableDomain } from '../../research/data-brokers/build/check-urls.js';

const c = (requestedUrl, finalUrl, status) => classifyResponse({ requestedUrl, finalUrl, status });

describe('classifyResponse', () => {
  it('404 is dead', () => {
    expect(c('https://a.com/optout', 'https://a.com/optout', 404)).toBe('dead');
  });
  it('network error is dead', () => {
    expect(c('https://a.com/optout', null, null)).toBe('dead');
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
