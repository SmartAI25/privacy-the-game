// Temporary banner for one live class at The Multiverse School. It shows only
// before the class starts and removes itself at START. Delete this file and its
// one call in app.js once the date has passed.
import { isCabinetMode } from '../utils/cabinet.js';
import { track } from '../utils/analytics.js';

export const CLASS_AD = {
  id: 'class-240',
  start: Date.parse('2026-10-29T01:00:00Z'), // Wed 10/28, 6pm PT / 9pm ET
  url: 'https://themultiverse.school/classes/240?utm_source=reclaim-city&utm_medium=game&utm_content=class-ad',
  title: 'Consumer Device Rescue & Defense',
  pitch: 'A live 2-hour class: check your old phones and laptop for leaks, then fix what you find.',
};

const DISMISS_KEY = `rc-ad-dismissed:${CLASS_AD.id}`;

export function classAdActive(now = Date.now(), ad = CLASS_AD) {
  return now < ad.start;
}

// The class time in the viewer's own time zone, e.g. "WED 10/28, 6:00 PM PDT".
export function classTimeLabel(ad = CLASS_AD, timeZone) {
  const f = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    ...(timeZone ? { timeZone } : {}),
  });
  return f.format(new Date(ad.start)).toUpperCase();
}

export function classAdHtml(ad = CLASS_AD, timeZone) {
  return `<div class="class-ad" role="complementary" aria-label="Live class" style="position: fixed; left: 0; right: 0; bottom: 0; z-index: 900; display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px 40px 8px 16px; background: rgba(9,11,16,0.96); border-top: 1px solid rgba(198,255,0,0.35); font-family: var(--font-mono); font-size: 11px; line-height: 1.4; color: rgba(237,239,243,0.8);">
    <a href="${ad.url}" target="_blank" rel="noopener" data-class-ad="${ad.id}" style="color: inherit; text-decoration: none; text-align: center;">
      <span style="color: var(--lime); letter-spacing: 2px; font-weight: 600;">LIVE CLASS &middot; ${classTimeLabel(ad, timeZone)}</span>
      <span style="display: inline-block;">&nbsp;<strong style="color: var(--cyan);">${ad.title}</strong> &mdash; ${ad.pitch} Scholarships available.&nbsp;&#8599;</span>
    </a>
    <button type="button" data-class-ad-dismiss aria-label="Hide this class banner" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: 0; color: rgba(237,239,243,0.5); font-size: 18px; line-height: 1; padding: 6px; cursor: pointer;">&times;</button>
  </div>`;
}

function dismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}

// Adds the banner to the page (outside the game screen, so screens don't change).
// No banner in the campus cabinet (no paid asks there), after dismissal, or after the start.
export function mountClassAd(doc = document, now = Date.now()) {
  if (!classAdActive(now) || isCabinetMode() || dismissed()) return null;
  const wrap = doc.createElement('div');
  wrap.innerHTML = classAdHtml();
  const el = wrap.firstElementChild;
  doc.body.appendChild(el);
  const pad = () => { doc.body.style.paddingBottom = el.isConnected ? `${el.offsetHeight}px` : ''; };
  const remove = () => { el.remove(); pad(); };
  pad();
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-class-ad-dismiss]')) {
      try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* private mode: hide for this visit only */ }
      track('class-ad', { action: 'dismiss', id: CLASS_AD.id });
      remove();
    } else if (e.target.closest('a[data-class-ad]')) {
      track('class-ad', { action: 'click', id: CLASS_AD.id });
    }
  });
  setTimeout(remove, Math.min(CLASS_AD.start - now, 2 ** 31 - 1));
  return el;
}
