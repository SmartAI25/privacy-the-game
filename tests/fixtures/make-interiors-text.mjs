// Writes interiors-text-before.json: every text node the saints gallery and each
// building interior drew before the phone-slides change (2026-10-24). The test
// tests/interiors-slides.test.js checks each one still reaches the page.
// Run once, from the repo root, on the old code: node tests/fixtures/make-interiors-text.mjs
import { writeFileSync } from 'node:fs';
import { textNodes, screens } from './interiors-text-screens.mjs';

const out = {};
for (const [key, html] of screens()) out[key] = textNodes(html);
writeFileSync(new URL('./interiors-text-before.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.keys(out).length, 'screens', Object.values(out).reduce((n, t) => n + t.length, 0), 'text nodes');
