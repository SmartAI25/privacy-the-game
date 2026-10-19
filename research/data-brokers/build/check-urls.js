// Opt-out URL checker: GETs every http(s) optOut.url and records whether it still lands on the same page.
// CLI: node check-urls.js [--only=<status>]   (writes optOut.status and optOut.verifiedAt; never deletes a URL)
const MULTI = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.jp', 'co.nz', 'co.za', 'com.br', 'com.mx', 'co.in', 'com.cn']);

// Small eTLD+1 helper: enough for this dataset, not the full Public Suffix List.
export function registrableDomain(url) {
  const host = new URL(url).hostname.toLowerCase().replace(/\.$/, '');
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const tail2 = parts.slice(-2).join('.');
  return parts.slice(MULTI.has(tail2) ? -3 : -2).join('.');
}

// Local calendar date as YYYY-MM-DD (not UTC).
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const isRoot = (url) => { const p = new URL(url).pathname; return p === '' || p === '/'; };

const DNS_ERRORS = new Set(['ENOTFOUND', 'EAI_AGAIN']);

// 'blocked' means "could not verify" (bot walls, rate limits, transient or network trouble), not "page is gone".
export function classifyResponse({ requestedUrl, finalUrl, status, error }) {
  if (!finalUrl || status == null) return DNS_ERRORS.has(error) ? 'dead' : 'blocked';
  if (status === 404 || status === 410) return 'dead';
  if (status >= 400) return 'blocked';
  if (isRoot(finalUrl) && !isRoot(requestedUrl)) return 'suspect';
  if (registrableDomain(finalUrl) !== registrableDomain(requestedUrl)) return 'suspect';
  return 'verified';
}

// --only=<status> filter. A record with an opt-out but no status has never been checked, so it counts as 'unchecked'.
export function matchesOnly(b, only) {
  if (!only) return true;
  if (!b?.optOut) return false;
  return (b.optOut.status ?? 'unchecked') === only;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function fetchOnce(url) {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000), headers: { 'user-agent': UA, accept: 'text/html,*/*' } });
    res.body?.cancel().catch(() => {});
    return { requestedUrl: url, finalUrl: res.url, status: res.status };
  } catch (e) {
    return { requestedUrl: url, finalUrl: null, status: null, error: e.cause?.code ?? e.name };
  }
}

// One retry (after a short delay) on network errors, 429 and 5xx.
async function check(url) {
  const first = await fetchOnce(url);
  if (first.finalUrl && first.status !== 429 && first.status < 500) return first;
  await new Promise((r) => setTimeout(r, 2000));
  return fetchOnce(url);
}

async function main() {
  const { readFile, writeFile, readdir } = await import('node:fs/promises');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join, resolve } = await import('node:path');
  const dir = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'brokers');
  const today = localDate();
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
  const jobs = [];
  for (const f of files) {
    const b = JSON.parse(await readFile(join(dir, f), 'utf8'));
    if (!matchesOnly(b, only)) continue;
    if (b.optOut?.url && /^https?:\/\//i.test(b.optOut.url)) jobs.push({ f, b });
  }
  const counts = { verified: 0, suspect: 0, blocked: 0, dead: 0 };
  const bad = [];
  let next = 0, written = 0;
  async function worker() {
    while (next < jobs.length) {
      const { f, b } = jobs[next++];
      const r = await check(b.optOut.url);
      const status = classifyResponse(r);
      counts[status]++;
      if (status !== 'verified') bad.push({ id: b.id, status, url: b.optOut.url, final: r.finalUrl ?? r.error, code: r.status });
      if (b.optOut.status === status && b.optOut.verifiedAt === today) continue;
      b.optOut.status = status;
      b.optOut.verifiedAt = today;
      await writeFile(join(dir, f), `${JSON.stringify(b, null, 2)}\n`);
      written++;
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.table(bad.sort((a, c) => a.status.localeCompare(c.status) || a.id.localeCompare(c.id)));
  console.log(`checked ${jobs.length}: verified ${counts.verified}, suspect ${counts.suspect}, blocked ${counts.blocked}, dead ${counts.dead}; ${written} files written`);
}

const { fileURLToPath: f2p } = await import('node:url');
if (process.argv[1] && f2p(import.meta.url) === (await import('node:path')).resolve(process.argv[1])) await main();
