// Writes city-explainer-text-before.json: every text node The Whole City and Your
// City drew before the phone-slides change (2026-10-24). tests/city-explainer-slides.test.js
// checks each one still reaches the page.
// Run once, from the repo root, on the old code: node tests/fixtures/make-city-explainer-text.mjs
import { writeFileSync } from 'node:fs';
import { textNodes, screens } from './city-explainer-text-screens.mjs';

const out = {};
for (const [key, html] of screens()) out[key] = textNodes(html);
writeFileSync(new URL('./city-explainer-text-before.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.keys(out).length, 'screens', Object.values(out).reduce((n, t) => n + t.length, 0), 'text nodes');
