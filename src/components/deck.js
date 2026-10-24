// A slide deck for phones. Under 900px the deck is a horizontal scroll-snap row
// with BACK / NEXT, dots and a "2 of 5" count; at 900px and up the slides are
// ordinary stacked blocks and the controls are hidden (all in style.css).
// The deck changes no hash and sends nothing to track().

// ---------------------------------------------------------------------------
// splitWords: whole sentences, grouped into chunks of at most `max` words.

const TOKEN = /<[^<>]*>|&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);|\s+|[^<&\s]+|[<&]/g;
const ENTITY = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Quote entities stand for their characters when reading a word; any other entity is opaque.
const QUOTE_ENTITY = { rdquo: '”', rsquo: '’', raquo: '»', ldquo: '“', lsquo: '‘', laquo: '«', quot: '"', apos: "'", '#39': "'", '#8217': '’', '#8221': '”' };
// A stop after these is not a sentence end. Initials (U.S., e.g., i.e., J.) are caught by pattern.
const ABBREVIATIONS = new Set(['vs', 'inc', 'no', 'mr', 'mrs', 'ms', 'dr', 'st', 'jr', 'sr', 'ltd', 'co', 'corp', 'ch', 'approx', 'fig', 'vol', 'dept', 'govt', 'mt', 'ft', 'jan', 'feb', 'mar', 'apr', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec']);

const tokenKind = (t) => {
  if (/^\s/.test(t)) return 'ws';
  if (t.length > 1 && t[0] === '<' && t.at(-1) === '>') return 'tag';
  if (t.length > 2 && t[0] === '&' && t.at(-1) === ';') return 'ent';
  return 'text';
};

// +1 for an opening element, -1 for a closing one, 0 for void/self-closing/comments.
function tagDepth(tag) {
  if (/^<[!?]/.test(tag) || /\/>$/.test(tag)) return 0;
  const m = tag.match(/^<(\/?)([a-zA-Z][\w-]*)/);
  if (!m || VOID.has(m[2].toLowerCase())) return 0;
  return m[1] ? -1 : 1;
}

// What a reader sees of a token: tags vanish, quote entities are quotes, other entities a placeholder.
function visible(t) {
  const kind = tokenKind(t);
  if (kind === 'tag') return '';
  if (kind === 'ent') return QUOTE_ENTITY[t.slice(1, -1)] ?? '\u0001';
  return t;
}

function endsSentence(word) {
  if (!/[.!?]["'”’»)\]]*$/.test(word)) return false;
  const core = word.replace(/["'”’»)\]]+$/, '').replace(/^["'“‘«(\[]+/, '');
  if (!core.endsWith('.')) return true; // ! and ? always end one.
  if (/^(?:[a-zA-Z]\.)+$/.test(core)) return false; // U.S., e.g., J.
  return !ABBREVIATIONS.has(core.slice(0, -1).toLowerCase());
}

export function countWords(html) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(ENTITY, '')
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function splitWords(html, max = 35) {
  const text = String(html ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const tokens = text.match(TOKEN);
  // Cut points: after a space that follows a sentence end, outside any element.
  const sentences = [];
  let start = 0;
  let depth = 0;
  let wordStart = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const kind = tokenKind(t);
    if (kind === 'tag') depth = Math.max(0, depth + tagDepth(t));
    if (kind !== 'ws') continue;
    const word = tokens.slice(wordStart, i).map(visible).join('');
    wordStart = i + 1;
    if (depth > 0 || !endsSentence(word)) continue;
    // A lowercase start is the same sentence ("just... so", "etc. and").
    const next = tokens.slice(i + 1).map(visible).join('').replace(/^[\s"'“‘«(\[\u0001]+/, '');
    if (/^\p{Ll}/u.test(next)) continue;
    sentences.push(tokens.slice(start, i + 1).join(''));
    start = i + 1;
  }
  if (start < tokens.length) sentences.push(tokens.slice(start).join(''));

  const chunks = [];
  let chunk = '';
  let n = 0;
  for (const s of sentences) {
    const w = countWords(s);
    if (chunk && n + w > max) {
      chunks.push(chunk);
      chunk = '';
      n = 0;
    }
    chunk += s;
    n += w;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

// ---------------------------------------------------------------------------
// deck: the markup.

const attr = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const headingHtml = (heading) => (heading ? `<h3 class="slide-heading">${heading}</h3>` : '');

export function deck(slides, { label, className = '' } = {}) {
  const list = (slides || []).filter(Boolean);
  if (list.length === 0) return '';
  // One slide needs no deck: its content, as it is.
  if (list.length === 1) return headingHtml(list[0].heading) + list[0].html;
  const m = list.length;
  const cls = ['deck', className].filter(Boolean).join(' ');
  const sections = list
    .map((s, i) => `<section class="slide" aria-roledescription="slide" aria-label="${i + 1} of ${m}" tabindex="-1">${headingHtml(s.heading)}${s.html}</section>`)
    .join('');
  const dots = list.map((_, i) => `<span class="deck-dot${i === 0 ? ' is-current' : ''}"></span>`).join('');
  return `<div class="${attr(cls)}" data-deck aria-roledescription="carousel" aria-label="${attr(label)}">${sections}</div>`
    + '<div class="deck-controls" data-deck-controls>'
    + '<button type="button" class="deck-btn" data-deck-prev disabled>BACK</button>'
    + `<span class="deck-dots" aria-hidden="true">${dots}</span>`
    + `<span class="deck-count" aria-live="polite">1 of ${m}</span>`
    + '<button type="button" class="deck-btn" data-deck-next>NEXT</button>'
    + '</div>';
}

// ---------------------------------------------------------------------------
// initDecks: the behaviour. Pure helpers first, so they test without a DOM.

export function slideIndex(scrollLeft, width, count) {
  if (!(width > 0) || !(count > 0)) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(scrollLeft / width)));
}

export function deckStep(key) {
  return key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0;
}

export function controlState(index, count) {
  return { prevDisabled: index <= 0, nextDisabled: index >= count - 1, count: `${index + 1} of ${count}` };
}

const reducedMotion = () => {
  try {
    return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const typing = (el) => !!el?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]');

// Where each deck under root is, by label: a re-draw of the same screen keeps its slide.
export function deckPositions(root) {
  const out = new Map();
  for (const d of root?.querySelectorAll?.('[data-deck]') ?? []) {
    const label = d.getAttribute?.('aria-label');
    const n = d.querySelectorAll(':scope > .slide').length;
    if (label) out.set(label, slideIndex(d.scrollLeft, d.clientWidth, n));
  }
  return out;
}

export function initDecks(root, positions = null) {
  if (!root?.querySelectorAll) return;
  for (const d of root.querySelectorAll('[data-deck]')) {
    if (d.dataset.deckReady) continue;
    d.dataset.deckReady = '1';
    const slides = [...d.querySelectorAll(':scope > .slide')];
    const controls = d.nextElementSibling?.hasAttribute?.('data-deck-controls') ? d.nextElementSibling : null;
    if (!controls || slides.length < 2) continue;
    const n = slides.length;
    const prev = controls.querySelector('[data-deck-prev]');
    const next = controls.querySelector('[data-deck-next]');
    const count = controls.querySelector('[aria-live]');
    const dots = [...controls.querySelectorAll('.deck-dot')];
    let current = -1;

    const show = (i) => {
      if (i === current) return;
      current = i;
      const s = controlState(i, n);
      if (prev) prev.disabled = s.prevDisabled;
      if (next) next.disabled = s.nextDisabled;
      if (count) count.textContent = s.count;
      dots.forEach((dot, k) => dot.classList.toggle('is-current', k === i));
    };
    // Only a phone-width deck is a row; at desktop width the slides are blocks and keys do nothing.
    const isRow = () => d.scrollWidth > d.clientWidth + 1;
    const go = (i) => {
      const to = Math.min(n - 1, Math.max(0, i));
      if (to === current) return;
      d.scrollTo?.({ left: to * d.clientWidth, behavior: reducedMotion() ? 'auto' : 'smooth' });
      show(to);
      const slide = slides[to];
      const target = slide.querySelector('h1, h2, h3, h4, h5, h6') || slide;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus?.({ preventScroll: true });
    };

    prev?.addEventListener('click', () => go(current - 1));
    next?.addEventListener('click', () => go(current + 1));
    const onKey = (e) => {
      const step = deckStep(e.key);
      if (!step || e.altKey || e.ctrlKey || e.metaKey || typing(e.target) || !isRow()) return;
      e.preventDefault();
      go(current + step);
    };
    d.addEventListener('keydown', onKey);
    controls.addEventListener('keydown', onKey);
    let frame = 0;
    d.addEventListener('scroll', () => {
      if (frame) return;
      const raf = globalThis.requestAnimationFrame || ((f) => setTimeout(f, 16));
      frame = raf(() => {
        frame = 0;
        show(slideIndex(d.scrollLeft, d.clientWidth, n));
      });
    }, { passive: true });

    const kept = positions?.get?.(d.getAttribute?.('aria-label'));
    if (kept > 0) d.scrollLeft = Math.min(kept, n - 1) * d.clientWidth;
    show(slideIndex(d.scrollLeft, d.clientWidth, n));
  }
}
