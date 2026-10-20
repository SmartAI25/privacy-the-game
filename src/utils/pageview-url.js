// What a pageview (or an error report) may say about where the player is.
// A building interior names an account, and a re-check names a mission on
// one: those stay on the device. Every other route goes out unchanged.
import { parseRoute } from '../router.js';

const PRIVATE_HASH = { building: '#/building', recheck: '#/mission/recheck' };

function withHash(href, hash) {
  const i = href.indexOf('#');
  return (i === -1 ? href : href.slice(0, i)) + hash;
}

export function pageviewUrl(route, href) {
  const hash = PRIVATE_HASH[route?.screen];
  return hash && typeof href === 'string' ? withHash(href, hash) : href;
}

// The same rule when only the URL is known (error reports, breadcrumbs).
export function sanitizeHref(href) {
  if (typeof href !== 'string') return href;
  const i = href.indexOf('#');
  if (i === -1) return href;
  return pageviewUrl(parseRoute(href.slice(i)), href);
}

// The error-report context for a screen: private screens send no params.
export function errorContext(route) {
  return PRIVATE_HASH[route?.screen] ? { screen: route.screen } : { screen: route?.screen, params: route?.params };
}

// An error report carries the page URL and navigation breadcrumbs: the same
// rule applies to each of them before the report leaves the device.
export function scrubEventUrls(event) {
  if (!event || typeof event !== 'object') return event;
  if (event.request?.url) event.request.url = sanitizeHref(event.request.url);
  for (const b of event.breadcrumbs ?? []) {
    if (b?.category !== 'navigation' || !b.data) continue;
    if (b.data.from) b.data.from = sanitizeHref(b.data.from);
    if (b.data.to) b.data.to = sanitizeHref(b.data.to);
  }
  return event;
}
