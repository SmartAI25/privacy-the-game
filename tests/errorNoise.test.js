import { describe, it, expect } from 'vitest';
import {
  eventHasOnlyThirdPartyFrames,
  frameIsOpaqueOrForeign,
} from '../src/utils/errorNoise.js';

const PAGE = 'https://play.multiversegames.ai';

const ev = (...frameNamesPerException) => ({
  exception: {
    values: frameNamesPerException.map((frames) => ({
      type: 'Error',
      value: 'boom',
      stacktrace: { frames: frames.map((filename) => ({ filename })) },
    })),
  },
});

describe('frameIsOpaqueOrForeign', () => {
  it('keeps same-origin and studio-CDN http frames', () => {
    expect(frameIsOpaqueOrForeign('https://play.multiversegames.ai/src/app.js', PAGE)).toBe(false);
    expect(frameIsOpaqueOrForeign('https://cdn.multiversegames.ai/lib/x.js', PAGE)).toBe(false);
    expect(frameIsOpaqueOrForeign('https://analytics.multiversestudios.xyz/u.js', PAGE)).toBe(false);
  });
  it('keeps scheme-less / build-tool frames (our bundles)', () => {
    expect(frameIsOpaqueOrForeign('/src/utils/errors.js', PAGE)).toBe(false);
    expect(frameIsOpaqueOrForeign('webpack://reclaim-city/src/app.js', PAGE)).toBe(false);
  });
  it('drops opaque extension frames', () => {
    expect(frameIsOpaqueOrForeign('webkit-masked-url://hidden/', PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign('about:srcdoc', PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign('', PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign(undefined, PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign('user-script:42', PAGE)).toBe(true);
  });
  it('drops extension and foreign-origin frames', () => {
    expect(frameIsOpaqueOrForeign('chrome-extension://abcdef/content.js', PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign('moz-extension://abcdef/content.js', PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign('safari-web-extension://abcdef/script.js', PAGE)).toBe(true);
    expect(frameIsOpaqueOrForeign('https://evil.example/inject.js', PAGE)).toBe(true);
  });
  it('attributes blob: URLs via their embedded origin', () => {
    expect(frameIsOpaqueOrForeign('blob:' + PAGE + '/uuid', PAGE)).toBe(false);
    expect(frameIsOpaqueOrForeign('blob:https://evil.example/uuid', PAGE)).toBe(true);
  });
});

describe('eventHasOnlyThirdPartyFrames', () => {
  it('(a) keeps an event with our own bundled frame', () => {
    expect(eventHasOnlyThirdPartyFrames(ev([`${PAGE}/src/app.js`]), PAGE)).toBe(false);
  });
  it('(b) drops an event whose only frame is webkit-masked-url://hidden/', () => {
    expect(eventHasOnlyThirdPartyFrames(ev(['webkit-masked-url://hidden/']), PAGE)).toBe(true);
  });
  it('(c) keeps a mixed event (ours + third-party)', () => {
    expect(
      eventHasOnlyThirdPartyFrames(
        ev([`${PAGE}/src/app.js`, 'chrome-extension://abcdef/content.js']),
        PAGE,
      ),
    ).toBe(false);
    expect(
      eventHasOnlyThirdPartyFrames(
        ev(['https://evil.example/x.js'], [`${PAGE}/src/main.js`]),
        PAGE,
      ),
    ).toBe(false);
  });
  it('drops all-extension stacks even across multiple exception values', () => {
    expect(
      eventHasOnlyThirdPartyFrames(
        ev(['webkit-masked-url://hidden/'], ['about:blank', 'safari-web-extension://a/b.js']),
        PAGE,
      ),
    ).toBe(true);
  });
  it('is conservative: keeps events with no frames to attribute', () => {
    expect(eventHasOnlyThirdPartyFrames({ message: 'hi' }, PAGE)).toBe(false);
    expect(eventHasOnlyThirdPartyFrames({ exception: { values: [] } }, PAGE)).toBe(false);
    expect(eventHasOnlyThirdPartyFrames({ exception: { values: [{ type: 'Error' }] } }, PAGE)).toBe(false);
    expect(eventHasOnlyThirdPartyFrames({ exception: { values: [{ stacktrace: { frames: [] } }] } }, PAGE)).toBe(false);
  });
  it('prefers abs_path over filename when present', () => {
    const event = {
      exception: {
        values: [
          { stacktrace: { frames: [{ filename: 'eval at <anonymous>', abs_path: `${PAGE}/src/app.js` }] } },
        ],
      },
    };
    expect(eventHasOnlyThirdPartyFrames(event, PAGE)).toBe(false);
  });
});

describe('private breadcrumbs (interiors, saints)', () => {
  it('drops ui breadcrumbs that name devices, buildings or candles', async () => {
    const { scrubBreadcrumb } = await import('../src/utils/errorNoise.js');
    const cases = [
      { category: 'ui.click', message: 'div.devices > ul.devices-list > li.device > button.device-x[aria-label="Remove Mom’s iPad"]' },
      { category: 'ui.click', message: 'div.district-buildings > a.building-link[aria-label="Gmail: see inside"]' },
      { category: 'ui.click', message: 'section.saint-card > button.candle-btn[aria-label="Light a candle for Saint Aaron Swartz"]' },
      { category: 'ui.input', message: 'div.devices-add > input.devices-input[aria-label="Add a device"]' },
      { category: 'ui.input', message: 'input.device-input' },
      { category: 'ui.click', message: 'div.interior > details.floor > summary.floor-head' },
    ];
    for (const b of cases) expect(scrubBreadcrumb(b)).toBeNull();
  });
  it('lets unrelated breadcrumbs through untouched', async () => {
    const { scrubBreadcrumb } = await import('../src/utils/errorNoise.js');
    const nav = { category: 'navigation', data: { from: '/', to: '/#/city' } };
    const click = { category: 'ui.click', message: 'div.hud > a.btn-secondary' };
    const log = { category: 'console', message: 'hello' };
    expect(scrubBreadcrumb(nav)).toBe(nav);
    expect(scrubBreadcrumb(click)).toBe(click);
    expect(scrubBreadcrumb(log)).toBe(log);
  });
  it('errors.js wires it as beforeBreadcrumb and in beforeSend, and keeps scrubEventUrls', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/utils/errors.js', 'utf8');
    expect(src).toMatch(/beforeBreadcrumb:\s*scrubBreadcrumb/);
    expect(src).toMatch(/isPrivateBreadcrumb\(b\)/);
    expect(src).toMatch(/return scrubEventUrls\(event\)/);
  });
});
