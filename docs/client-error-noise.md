# Client-side third-party frame guard (MUL-13)

Extension / content-blocker scripts injected into our pages throw errors that
land in GlitchTip looking like our crashes — `webkit-masked-url://hidden/`
(iOS content blockers), `chrome-extension://…`, `Can't find variable:
__gCrWeb`, `contentScriptData.init_ts`, `Invalid call to
runtime.sendMessage(). Tab not found.`, `Response was undefined`, bare
`Script error.` Closing each filing with the `noise` label only suppresses one
fingerprint in one repo, so we filter the whole class client-side instead.

## Rule

`beforeSend` (`src/utils/errors.js` + `src/utils/errorNoise.js`) drops an event
iff **every** frame of **every** exception has a filename that is:

- opaque: `webkit-masked-url://…`, `about:…`, `data:…`, missing/empty filename,
  `user-script:…`, or
- hosted outside the page origin and outside studio domains
  (`*.multiversegames.ai`, `*.multiversestudios.xyz`, `*.themultiverse.school`):
  `chrome-extension://`, `moz-extension://`, `safari-web-extension://`,
  `chrome://`, foreign http(s) origins, and `blob:` URLs whose embedded origin
  is foreign.

Kept (never dropped by this guard): any event with at least one same-origin or
studio-host frame, events with no stacktrace or no frames (conservative),
relative / build-tool paths (`webpack://…`), and `blob:` from our own origin.
Network-layer noise rules (server-side tier-2/tier-3 suppression and each app's
message filters) are unchanged and complementary.

## In-app browser and wallet bridges (by message)

In-app browsers and wallets run their code in our page, so the frames carry our
page URL and the rule above keeps them. `isInjectedScriptNoise` drops an event
when **every** exception's message names a foreign global or bridge that no
file in `src/` uses: `window._META` / `IABInnerFrame` (Instagram, Facebook),
`window.webkit.messageHandlers`, `Script message handler is unavailable`,
`WKErrorDomain`, `WKWebView API client did not respond` (iOS WebViews),
`Java object is gone` / `Java exception was raised during method invocation`
(Android WebViews), `__firefox__` (Firefox iOS), `window.ethereum`, `MetaMask`,
`Invalid call to runtime.sendMessage()` (extensions), and Sentry's report of a
script-dispatched `CustomEvent('unhandledrejection')`. A test fails if any
file in `src/` other than the filter starts naming one of them.

The game's own `unhandledrejection` listener (`errors.js`) skips untrusted
events and non-Error reasons: Sentry's GlobalHandlers already files those once.

## Tests

```
npm test            # full suite
npx vitest run tests/errorNoise.test.js
```

Fixtures cover the three cases triage needs to trust the filter:
our own frame → kept; only `webkit-masked-url://hidden/` → dropped;
mixed ours + third-party → kept.
