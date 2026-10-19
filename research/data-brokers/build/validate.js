// CLI: validate the whole dataset. Exits 1 on any error.
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateDataset } from './schema.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { errors, counts } = await validateDataset(root);
for (const e of errors) console.error(e);
console.log(`brokers: ${counts.brokers} links: ${counts.links} published: ${counts.published} sources: ${counts.sources}`);
if (errors.length) {
  console.error(`${errors.length} error(s)`);
  process.exit(1);
}
