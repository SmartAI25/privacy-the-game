// Writes trim-text-before.json: every text node the screens in trim-text-screens.mjs drew
// before the phone trim pass (2026-10-24). tests/trim-text.test.js checks each one still
// reaches the page. Run once, from the repo root, on the old code: node tests/fixtures/make-trim-text.mjs
import { writeFileSync } from 'node:fs';
import { textNodes, screens } from './trim-text-screens.mjs';

const out = {};
for (const [key, html] of screens()) out[key] = textNodes(html);
writeFileSync(new URL('./trim-text-before.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(Object.keys(out).length, 'screens', Object.values(out).reduce((n, t) => n + t.length, 0), 'text nodes');
