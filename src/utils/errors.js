import { eventHasOnlyThirdPartyFrames, isInjectedScriptNoise, scrubBreadcrumb, isPrivateBreadcrumb } from './errorNoise.js';
import { scrubEventUrls } from './pageview-url.js';

const GLITCHTIP_DSN = 'https://ba6fd2bcdb8f47f3bc15613b5ef4e419@errors.multiversegames.ai/15';

export function initErrorTracking() {
  if (typeof Sentry === 'undefined') return;

  Sentry.init({
    dsn: GLITCHTIP_DSN,
    environment: location.hostname === 'localhost' ? 'development' : 'production',
    sendDefaultPii: false,
    // No device labels, buildings or candles in click/input breadcrumbs.
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend(event) {
      if (eventHasOnlyThirdPartyFrames(event, location.origin)) return null;
      // In-app browser bridges and wallet extensions (window._META,
      // webkit.messageHandlers, __firefox__, window.ethereum, …) run in our page.
      if (isInjectedScriptNoise(event)) return null;
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(
          (b) => (b.category !== 'console' || !b.message?.includes('localStorage')) && !isPrivateBreadcrumb(b),
        );
      }
      return scrubEventUrls(event);
    },
  });

  window.addEventListener('error', (event) => {
    captureError(event.error || new Error(event.message), { type: 'window-error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!shouldReportRejection(event)) return;
    captureError(event.reason, { type: 'unhandledrejection' });
  });
}

// Sentry's own GlobalHandlers already reports every unhandled rejection, so
// this listener only adds the ones whose reason is a real Error (it carries
// the extra context). A script-dispatched CustomEvent named
// 'unhandledrejection' (isTrusted false: an extension, never the game) and a
// rejection with no Error reason gave GlitchTip #103: "Error: undefined", a
// second copy of what Sentry had already sent, with nothing to trace.
export function shouldReportRejection(event) {
  if (!event || event.isTrusted === false) return false;
  return event.reason instanceof Error;
}

export function captureError(error, context) {
  if (typeof Sentry !== 'undefined') {
    Sentry.captureException(error, { extra: context });
  }
  console.error(error);
}
