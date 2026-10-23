#!/usr/bin/env node
// Bounty guard: closes karma-farming PRs and protects bounty issues.
//
// Bounty issues (label `bounty`) pay karma for evidence a person gathered by
// hand. In October 2026 two accounts opened 23 generated PRs that invented
// data files, auto-closed issues with "Fixes #N", and rewrote the nightly job
// that deletes opted-out players' data. This script applies CONTRIBUTING.md
// to every open PR and bounty issue.
//
// It runs on Liz's Mac from launchd (no CI runner ever executes fork code),
// talks to GitHub only through the `gh` CLI, and never reads git state.
// install.sh copies this file from origin/main into
// ~/Library/Application Support/bounty-guard/ and runs it from there; state
// (markers, evidence-request times) and a one-line status file live beside it.
//
//   node guard.mjs                 # dry run: print decisions, change nothing
//   node guard.mjs --apply         # act on them
//   --repo owner/name              # default lizTheDeveloper/privacy-the-game
//
// The decision functions are pure and exported for tests/bounty-guard.test.js.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_REPO = 'lizTheDeveloper/privacy-the-game';
export const MARKER = '<!-- bounty-guard -->';
export const MAINTAINER_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
export const EVIDENCE_GRACE_MS = 72 * 3600 * 1000;
/** Net lines a PR may remove from existing tests before it counts as gutting them. */
export const TEST_NET_REMOVAL_LIMIT = 20;
/** A run planning more than this many writes is aborted untouched: something is off. */
export const WRITE_CAP = { closes: 10, comments: 20 };
export const LOG_MAX_BYTES = 1024 * 1024;
export const LABELS = {
  karmaFarming: 'karma-farming',
  karmaApproved: 'karma-approved',
  guardSkip: 'guard-skip',
  needsEvidence: 'needs-evidence',
  needsMaintainer: 'needs-maintainer',
  refsNotFixes: 'refs-not-fixes',
};
const CONTRIBUTING = `https://github.com/${DEFAULT_REPO}/blob/main/CONTRIBUTING.md`;

export const isMaintainer = (association) => MAINTAINER_ASSOCIATIONS.has(String(association || '').toUpperCase());

// ---------------------------------------------------------------------------
// Issue references. A bare "#N" in prose is not a claim; these are:
// GitHub's closing keywords, "Refs #N", a #N in the title, a full issue URL,
// or owner/repo#N.

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function refToken(repo) {
  const r = esc(repo);
  return `(?:https?://github\\.com/${r}/(?:issues|pull)/(\\d+)|${r}#(\\d+)|(?<![\\w/])#(\\d+))`;
}
const tokenNums = (m, first) => Number(m[first] || m[first + 1] || m[first + 2]);

/** #N after a keyword, including lists like "Refs #1, #2 and #3". */
function keywordRefs(text, keywordRe, repo) {
  const tok = refToken(repo);
  const re = new RegExp(`\\b(?:${keywordRe})\\b:?\\s+(${tok}(?:\\s*(?:,|and|&)\\s*${tok})*)`, 'gi');
  const one = new RegExp(tok, 'gi');
  const out = [];
  for (const m of String(text || '').matchAll(re)) {
    for (const t of m[1].matchAll(one)) out.push(tokenNums(t, 1));
  }
  return [...new Set(out)];
}

/** Issue numbers GitHub would auto-close: close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved. */
export const closingKeywordRefs = (text, repo = DEFAULT_REPO) =>
  keywordRefs(text, 'close[sd]?|fix(?:e[sd])?|resolve[sd]?', repo);

/** Explicit references: Refs/Ref/References #N. */
export const refsKeywordRefs = (text, repo = DEFAULT_REPO) => keywordRefs(text, 'refs?|references', repo);

/** Full issue URLs and owner/repo#N anywhere in the text. */
export function qualifiedRefs(text, repo = DEFAULT_REPO) {
  const r = esc(repo);
  const re = new RegExp(`https?://github\\.com/${r}/(?:issues|pull)/(\\d+)|${r}#(\\d+)`, 'gi');
  return [...new Set([...String(text || '').matchAll(re)].map((m) => Number(m[1] || m[2])))];
}

/** Any #N (bare or qualified) in a short string such as a PR title. */
export function anyRefs(text, repo = DEFAULT_REPO) {
  return [...new Set([...String(text || '').matchAll(new RegExp(refToken(repo), 'gi'))].map((m) => tokenNums(m, 1)))];
}

/** The issue numbers a PR claims, before filtering to bounty issues. */
export function claimedIssues(pr, repo = DEFAULT_REPO) {
  return [
    ...new Set([
      ...(pr.closingIssues || []),
      ...closingKeywordRefs(pr.body, repo),
      ...refsKeywordRefs(pr.body, repo),
      ...qualifiedRefs(pr.body, repo),
      ...anyRefs(pr.title, repo),
    ]),
  ];
}

/** A real capture URL (web.archive.org/web/... or /save/...), not just the word. */
export const hasWaybackLink = (text) => /https?:\/\/web\.archive\.org\/(?:web|save)\/\S+/i.test(String(text || ''));

// ---------------------------------------------------------------------------
// Paths.

export const isAllowedBountyPath = (p) => /^research\/data-brokers\/build\/[^/]+\.json$/.test(p);
export const isProtectedPath = (p) => p === 'collective' || p.startsWith('collective/');
export const isTestPath = (p) =>
  !/(^|\/)tests?\/fixtures\//.test(p) &&
  (/(^|\/)tests?\//.test(p) || /\.test\.[^/]+$/.test(p) || /(^|\/)test_[^/]*\.py$/.test(p));
export const isGeneratedPath = (p) =>
  p.startsWith('research/data-brokers/brokers/') ||
  /^research\/data-brokers\/(?:.*\/)?(?:links|sources)\.json$/.test(p) ||
  p === 'src/data/broker-map.json';

/** Every path a file entry touches: the new one and, for renames, the old one. */
export const filePaths = (f) => [...new Set([f.path, f.previousPath].filter(Boolean))];

/** Make an attacker-chosen path safe to quote in a Markdown code block. */
export const sanitizePath = (p) => {
  const s = String(p).replace(/[\u0000-\u001f\u007f`<>]/g, '').slice(0, 200);
  return s || '(unprintable path)';
};

/** Test files deleted, renamed away from a test path, or net lines removed past the limit. */
export function testDamage(files) {
  const touched = files.filter((f) => filePaths(f).some(isTestPath));
  const deleted = touched.filter(
    (f) => f.changeType === 'DELETED' || (f.changeType === 'RENAMED' && isTestPath(f.previousPath || '') && !isTestPath(f.path)),
  );
  const net = touched.reduce((n, f) => n + (Number(f.deletions) || 0) - (Number(f.additions) || 0), 0);
  const paths = [...new Set(touched.filter((f) => f.changeType !== 'ADDED').flatMap(filePaths).filter(isTestPath))];
  if (deleted.length) return { reason: 'Deletes or renames away existing tests.', paths };
  if (net > TEST_NET_REMOVAL_LIMIT) return { reason: `Removes ${net} net lines from existing tests.`, paths };
  return null;
}

const issueInfo = (bounty, n) => (bounty instanceof Map ? bounty.get(n) : null) || { labels: [], comments: [] };

// ---------------------------------------------------------------------------

/**
 * Decide what to do with one PR.
 * pr:  {number, title, body, author, authorAssociation, isBot?, createdAt, labels?,
 *       files: [{path, previousPath?, additions, deletions, changeType}], filesError?,
 *       closingIssues: [n], comments?: [{author, body}],
 *       maintainerUnlabeled?: [label], maintainerReopened?: bool}
 * ctx: {bountyIssues: Set<n> | Map<n, {labels, comments}>, flaggedAuthors: Set<lowercase login>,
 *       now: Date, evidenceRequestedAt?: ISO, repo?}
 * Returns {action: 'close'|'flag'|'ok', reasons, paths, karmaFarming, labels,
 *          needsEvidence, needsMaintainer, closingKeyword, bountyRefs}.
 */
export function assessPr(pr, ctx) {
  const repo = ctx.repo || DEFAULT_REPO;
  const prLabels = pr.labels || [];
  const unlabeled = new Set(pr.maintainerUnlabeled || []);
  const result = (action, extra = {}) => ({
    action, reasons: [], paths: [], karmaFarming: false, labels: [], needsEvidence: false,
    needsMaintainer: false, closingKeyword: [], bountyRefs: [], ...extra,
  });

  // Collaborators are trusted. GitHub Apps (dependabot) are installed by a
  // maintainer and can't claim karma. Maintainer overrides win.
  if (isMaintainer(pr.authorAssociation) || pr.isBot) return result('ok');
  if (prLabels.includes(LABELS.karmaApproved) || prLabels.includes(LABELS.guardSkip)) return result('ok', { reasons: ['maintainer override label'] });

  const bounty = ctx.bountyIssues || new Set();
  const bountyRefs = claimedIssues(pr, repo).filter((n) => bounty.has(n));
  const isBountyPr = bountyRefs.length > 0;
  const closingKeyword = [...new Set([...closingKeywordRefs(pr.body, repo), ...(pr.closingIssues || [])])].filter((n) => bounty.has(n));
  const base = { bountyRefs, closingKeyword };

  // Without a trustworthy file list nothing can be decided either way.
  if (pr.filesError) {
    return result('flag', { ...base, reasons: [`Couldn't read the full file list (${pr.filesError}); a maintainer will review this PR by hand.`], needsMaintainer: true, labels: [LABELS.needsMaintainer] });
  }

  const files = pr.files || [];
  const karma = [];
  const close = [];
  const flags = [];
  const paths = new Set();
  const note = (list) => list.forEach((p) => paths.add(sanitizePath(p)));
  let needsMaintainer = false;

  if ((ctx.flaggedAuthors || new Set()).has(String(pr.author || '').toLowerCase())) {
    karma.push(`@${sanitizePath(pr.author)} was already labelled \`${LABELS.karmaFarming}\` on an earlier PR, so later claims are closed automatically.`);
  }

  const protectedFiles = files.flatMap(filePaths).filter(isProtectedPath);
  if (protectedFiles.length) {
    note(protectedFiles);
    karma.push("Touches `collective/`, which runs the nightly job that deletes opted-out players' data. Changes there need a maintainer and their own issue.");
  }

  const damage = testDamage(files);
  if (damage) {
    note(damage.paths);
    if (isBountyPr) karma.push(damage.reason);
    else {
      needsMaintainer = true;
      flags.push(`${damage.reason} A maintainer will review this PR.`);
    }
  }

  if (isBountyPr) {
    const outside = files.flatMap(filePaths).filter((p) => !isAllowedBountyPath(p) && !isProtectedPath(p));
    if (outside.length) {
      note(outside);
      karma.push('A bounty PR may only edit `research/data-brokers/build/*.json`; this one changes other files. Nothing reads files like these.');
    }
  }

  const generated = files.flatMap(filePaths).filter(isGeneratedPath);
  if (generated.length) {
    note(generated);
    close.push('Hand-edits generated files. They are rebuilt from `research/data-brokers/build/`; see "How to rebuild" in research/data-brokers/README.md.');
  }

  let needsEvidence = false;
  if (isBountyPr && !unlabeled.has(LABELS.needsEvidence) && !hasEvidence(pr, bountyRefs, bounty)) {
    needsEvidence = true;
    const asked = ctx.evidenceRequestedAt ? new Date(ctx.evidenceRequestedAt).getTime() : null;
    if (asked !== null && (ctx.now || new Date()).getTime() - asked >= EVIDENCE_GRACE_MS) {
      close.push('Still no Wayback capture (`https://web.archive.org/...`) 72 hours after evidence was requested.');
    } else {
      flags.push('No Wayback capture (`https://web.archive.org/save/<url>`) in the PR description or in your comment on the issue.');
    }
  }

  if (closingKeyword.length && !unlabeled.has(LABELS.refsNotFixes)) {
    flags.push(`Uses a closing keyword on bounty issue ${closingKeyword.map((n) => `#${n}`).join(', ')}; please write \`Refs #N\` instead. A maintainer closes bounty issues after checking the evidence.`);
  }

  const outPaths = [...paths].sort();
  const flagLabels = () => {
    const l = [];
    if (needsEvidence) l.push(LABELS.needsEvidence);
    if (needsMaintainer) l.push(LABELS.needsMaintainer);
    if (closingKeyword.length && !unlabeled.has(LABELS.refsNotFixes)) l.push(LABELS.refsNotFixes);
    return l.filter((x) => !unlabeled.has(x));
  };

  if (karma.length || close.length) {
    // A maintainer who reopened the PR or took the karma-farming label off has decided.
    if (pr.maintainerReopened || unlabeled.has(LABELS.karmaFarming)) {
      return result('ok', { ...base, reasons: ['maintainer reopened or unlabelled this PR; not re-closing'], paths: outPaths });
    }
    const karmaFarming = karma.length > 0;
    return result('close', { ...base, reasons: [...karma, ...close], paths: outPaths, karmaFarming, labels: karmaFarming ? [LABELS.karmaFarming] : [], needsEvidence });
  }
  if (flags.length) return result('flag', { ...base, reasons: flags, paths: outPaths, labels: flagLabels(), needsEvidence, needsMaintainer });
  return result('ok', base);
}

/** Wayback evidence in the PR body, or in a comment by the PR author on the PR or a referenced bounty issue. */
function hasEvidence(pr, bountyRefs, bounty) {
  if (hasWaybackLink(pr.body)) return true;
  const mine = (c) => String(c.author || '').toLowerCase() === String(pr.author || '').toLowerCase() && hasWaybackLink(c.body);
  if ((pr.comments || []).some(mine)) return true;
  return bountyRefs.some((n) => (issueInfo(bounty, n).comments || []).some(mine));
}

/**
 * Decide whether a closed bounty issue should be reopened.
 * issue: {number, labels?, actor, actorAssociation,
 *         closer: null | {type: 'PullRequest', number, authorAssociation, labels: [name]} | {type: 'Commit'}}
 */
export function assessIssueClose(issue) {
  const labels = issue.labels || [];
  if (labels.includes(LABELS.karmaApproved) || labels.includes(LABELS.guardSkip)) return { action: 'ok', reasons: [] };
  const c = issue.closer;
  if (c && c.type === 'PullRequest') {
    if ((c.labels || []).includes(LABELS.karmaApproved)) return { action: 'ok', reasons: [] };
    if (isMaintainer(c.authorAssociation)) return { action: 'ok', reasons: [] };
    return {
      action: 'reopen',
      reasons: [`Auto-closed by PR #${c.number}, which has no \`${LABELS.karmaApproved}\` label. Bounty issues close only after a maintainer verifies the evidence.`],
    };
  }
  if (!isMaintainer(issue.actorAssociation)) {
    return { action: 'reopen', reasons: [`Closed by @${sanitizePath(issue.actor)}, who isn't a maintainer.`] };
  }
  return { action: 'ok', reasons: [] };
}

/** Kinds of guard comment already posted -> first createdAt (only comments written by `viewer` count). */
export function guardComments(comments, viewer) {
  const kinds = new Map();
  for (const c of comments || []) {
    if (String(c.author || '').toLowerCase() !== String(viewer || '').toLowerCase()) continue;
    if (!String(c.body || '').includes(MARKER)) continue;
    for (const m of String(c.body).matchAll(/<!-- bounty-guard:([\w:.-]+) -->/g)) {
      if (!kinds.has(m[1])) kinds.set(m[1], c.createdAt);
    }
  }
  return kinds;
}

/** Flagged authors on this bounty issue who haven't been told their claims are ineligible. */
export function assessIssueComments(issue, flaggedAuthors, viewer, stateMarkers = []) {
  const done = guardComments(issue.comments, viewer);
  for (const m of stateMarkers) if (!done.has(m)) done.set(m, null);
  const out = [];
  const seen = new Set();
  for (const c of issue.comments || []) {
    const login = String(c.author || '');
    const key = login.toLowerCase();
    if (!flaggedAuthors.has(key) || seen.has(key)) continue;
    seen.add(key);
    if (!done.has(`ineligible:${key}`)) out.push(login);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Comment bodies. Each carries MARKER plus a kind marker so reruns are idempotent.

const sign = (kind) => `\n\n${MARKER}\n<!-- bounty-guard:${kind} -->`;
const fileBlock = (paths) => (paths && paths.length ? `\n\nFiles:\n\n\`\`\`\n${paths.slice(0, 20).map(sanitizePath).join('\n')}${paths.length > 20 ? `\n… and ${paths.length - 20} more` : ''}\n\`\`\`` : '');

export function closeComment(decision) {
  const lead = decision.karmaFarming
    ? `Thanks for your interest in Reclaim City. This PR is being closed and labelled \`${LABELS.karmaFarming}\`, so it earns no karma:`
    : 'Thanks for your interest in Reclaim City. This PR is being closed:';
  return `${lead}\n\n${decision.reasons.map((r) => `- ${r}`).join('\n')}${fileBlock(decision.paths)}\n\nBounty evidence goes in a comment on the issue: the final URL, a one-line verdict, what the form asks for, and a Wayback capture of every page you used, from a check you did yourself in a normal browser. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('close')}`;
}

export function needsEvidenceComment() {
  return `Thanks for this. Bounty claims need evidence a maintainer can check: the final URL, a one-line verdict, what the form asks for, and a Wayback capture (\`https://web.archive.org/save/<url>\`) of every page you used. Please add the captures to the PR description or your comment on the issue. Without them this PR closes automatically in 72 hours. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('needs-evidence')}`;
}

export function needsMaintainerComment(decision) {
  return `Thanks for this. A maintainer needs to look at it before it goes further:\n\n${decision.reasons.filter((r) => /maintainer/.test(r)).map((r) => `- ${r}`).join('\n')}${fileBlock(decision.paths)}\n\nSee [CONTRIBUTING.md](${CONTRIBUTING}).${sign('needs-maintainer')}`;
}

export function refsComment(nums) {
  const refs = nums.map((n) => `#${n}`).join(', ');
  return `Please change \`Fixes\`/\`Closes\`/\`Resolves\` ${refs} to \`Refs ${nums.map((n) => `#${n}`).join(' ')}\` in the description. Bounty issues stay open until a maintainer has checked the evidence; if this PR closes one anyway it will be reopened. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('refs')}`;
}

export function reopenComment(reasons, closedAt) {
  return `Reopening. ${reasons.join(' ')} See [CONTRIBUTING.md](${CONTRIBUTING}).${sign(`reopen:${closedAt}`)}`;
}

export function ineligibleComment(login) {
  const safe = sanitizePath(login);
  return `@${safe}, this account's earlier submissions were labelled \`${LABELS.karmaFarming}\` (fabricated or AI-generated evidence), so claims from it aren't eligible for karma. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign(`ineligible:${safe.toLowerCase()}`)}`;
}

// ---------------------------------------------------------------------------
// Planning: pure, over already-fetched data plus the state file.

/**
 * prs, issues as fetched; state = {prs: {N: {markers, evidenceRequestedAt}}, issues: {N: {markers}}}.
 * Returns {actions, errors}. One bad PR or issue becomes an error (or a
 * needs-maintainer flag), never an aborted run.
 */
export function plan({ prs, issues, flaggedAuthors, maintainers, viewer, now, state = {}, repo = DEFAULT_REPO }) {
  const bountyIssues = new Map(issues.map((i) => [i.number, i]));
  const actions = [];
  const errors = [];

  for (const pr of prs) {
    const ref = `PR #${pr.number} (@${pr.author}, ${pr.authorAssociation})`;
    try {
      const st = state.prs?.[pr.number] || {};
      const done = guardComments(pr.comments, viewer);
      for (const m of st.markers || []) if (!done.has(m)) done.set(m, null);
      const asked = [st.evidenceRequestedAt, done.get('needs-evidence')].filter(Boolean).sort()[0] || null;
      const d = assessPr(pr, { bountyIssues, flaggedAuthors, now, evidenceRequestedAt: asked, repo });
      const unlabeled = new Set(pr.maintainerUnlabeled || []);
      const newLabels = d.labels.filter((l) => !(pr.labels || []).includes(l) && !unlabeled.has(l));
      if (d.action === 'close') {
        actions.push({ kind: 'close-pr', number: pr.number, ref, reasons: d.reasons, paths: d.paths, labels: newLabels, comments: done.has('close') ? [] : [{ marker: 'close', body: closeComment(d) }] });
      } else if (d.action === 'flag') {
        const comments = [];
        if (d.needsEvidence && !done.has('needs-evidence')) comments.push({ marker: 'needs-evidence', body: needsEvidenceComment() });
        if (d.needsMaintainer && !done.has('needs-maintainer')) comments.push({ marker: 'needs-maintainer', body: needsMaintainerComment(d) });
        if (d.closingKeyword.length && !unlabeled.has(LABELS.refsNotFixes) && !done.has('refs')) comments.push({ marker: 'refs', body: refsComment(d.closingKeyword) });
        if (comments.length || newLabels.length) actions.push({ kind: 'flag-pr', number: pr.number, ref, reasons: d.reasons, paths: d.paths, labels: newLabels, comments });
      }
      // Evidence or Refs added since we flagged it: take the stale labels off.
      const stale = [];
      if ((pr.labels || []).includes(LABELS.needsEvidence) && !d.needsEvidence) stale.push(LABELS.needsEvidence);
      if ((pr.labels || []).includes(LABELS.refsNotFixes) && !d.closingKeyword.length) stale.push(LABELS.refsNotFixes);
      if (stale.length && d.action !== 'close') actions.push({ kind: 'unlabel', number: pr.number, ref, reasons: ['resolved'], labels: stale, comments: [] });
    } catch (err) {
      errors.push(`${ref}: ${err.message}`);
    }
  }

  for (const issue of issues) {
    const ref = `issue #${issue.number}`;
    try {
      const st = state.issues?.[issue.number] || {};
      if (issue.state === 'CLOSED' && issue.closedEvent) {
        const ev = issue.closedEvent;
        const d = assessIssueClose({
          number: issue.number,
          labels: issue.labels,
          actor: ev.actor,
          actorAssociation: maintainers.has(String(ev.actor).toLowerCase()) ? 'COLLABORATOR' : 'NONE',
          closer: ev.closer,
        });
        if (d.action === 'reopen') {
          const marker = `reopen:${ev.createdAt}`;
          const done = guardComments(issue.comments, viewer);
          const posted = done.has(marker) || (st.markers || []).includes(marker);
          actions.push({ kind: 'reopen-issue', number: issue.number, ref, reasons: d.reasons, labels: [], comments: posted ? [] : [{ marker, body: reopenComment(d.reasons, ev.createdAt) }] });
        }
      }
      if (!(issue.labels || []).includes(LABELS.guardSkip)) {
        for (const login of assessIssueComments(issue, flaggedAuthors, viewer, st.markers || [])) {
          const body = ineligibleComment(login);
          actions.push({ kind: 'ineligible-reply', number: issue.number, ref, reasons: [`comment from flagged @${sanitizePath(login)}`], labels: [], comments: [{ marker: `ineligible:${sanitizePath(login).toLowerCase()}`, body }] });
        }
      }
    } catch (err) {
      errors.push(`${ref}: ${err.message}`);
    }
  }
  return { actions, errors };
}

/** Writes a plan would make; if over WRITE_CAP the whole --apply run is refused. */
export function writeCount(actions) {
  const closes = actions.filter((a) => a.kind === 'close-pr' || a.kind === 'reopen-issue').length;
  const comments = actions.reduce((n, a) => n + (a.comments || []).length, 0);
  return { closes, comments, exceeded: closes > WRITE_CAP.closes || comments > WRITE_CAP.comments };
}

// ---------------------------------------------------------------------------
// State, status and log files (beside guard.mjs unless BOUNTY_GUARD_HOME is set).

export function loadState(file) {
  if (!existsSync(file)) return { prs: {}, issues: {} };
  const text = readFileSync(file, 'utf8').trim();
  if (!text) return { prs: {}, issues: {} };
  const s = JSON.parse(text);
  return { prs: s.prs || {}, issues: s.issues || {} };
}

/** Written in place, not renamed, so the install directory can stay read-only. */
export function saveState(file, state) {
  writeFileSync(file, `${JSON.stringify(state, null, 1)}\n`);
}

export function recordMarker(state, a, marker, now) {
  const bucket = a.kind.endsWith('-pr') || a.kind === 'unlabel' ? 'prs' : 'issues';
  const entry = (state[bucket][a.number] ||= { markers: [] });
  entry.markers ||= [];
  if (!entry.markers.includes(marker)) entry.markers.push(marker);
  if (marker === 'needs-evidence' && !entry.evidenceRequestedAt) entry.evidenceRequestedAt = now.toISOString();
}

/** Keep the launchd log bounded: past LOG_MAX_BYTES it becomes <log>.1 (one generation). */
export function rotateLog(file, max = LOG_MAX_BYTES) {
  if (!file || !existsSync(file) || statSync(file).size <= max) return false;
  renameSync(file, `${file}.1`);
  return true;
}

// ---------------------------------------------------------------------------
// GitHub I/O through the gh CLI.

function gh(args, input) {
  return execFileSync('gh', args, { encoding: 'utf8', input, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}

function graphql(query, vars) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [k, v] of Object.entries(vars)) {
    if (v === null || v === undefined) continue;
    args.push(typeof v === 'number' ? '-F' : '-f', `${k}=${v}`);
  }
  const res = JSON.parse(gh(args));
  if (res.errors) throw new Error(JSON.stringify(res.errors));
  return res.data;
}

const jsonLines = (out) => out.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));

/** Every issue and PR conversation comment in the repo, fully paged, grouped by number. */
function fetchAllComments(repo) {
  const rows = jsonLines(gh(['api', '--paginate', `repos/${repo}/issues/comments?per_page=100`, '--jq', '.[] | {n: (.issue_url | split("/") | last | tonumber), author: .user.login, body, createdAt: .created_at}']));
  const by = new Map();
  for (const r of rows) {
    if (!by.has(r.n)) by.set(r.n, []);
    by.get(r.n).push({ author: r.author, body: r.body, createdAt: r.createdAt });
  }
  return by;
}

const STATUS = { added: 'ADDED', removed: 'DELETED', modified: 'MODIFIED', renamed: 'RENAMED', copied: 'COPIED', changed: 'CHANGED', unchanged: 'UNCHANGED' };

function fetchPrFiles(repo, number, expected) {
  try {
    const rows = jsonLines(gh(['api', '--paginate', `repos/${repo}/pulls/${number}/files?per_page=100`, '--jq', '.[] | {filename, previous_filename, status, additions, deletions}']));
    const files = rows.map((r) => ({ path: r.filename, previousPath: r.previous_filename || null, additions: r.additions, deletions: r.deletions, changeType: STATUS[r.status] || String(r.status).toUpperCase() }));
    if (files.length !== expected) return { files, filesError: `got ${files.length} of ${expected} files` };
    return { files };
  } catch (err) {
    return { files: [], filesError: `fetch failed: ${String(err.stderr || err.message).split('\n')[0].slice(0, 200)}` };
  }
}

function fetchOpenPrs(owner, name, maintainers, comments) {
  const q = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){
    pullRequests(states:OPEN, first:25, after:$after){ pageInfo{hasNextPage endCursor} nodes{
      number title body createdAt changedFiles authorAssociation author{__typename login}
      labels(first:50){nodes{name}}
      closingIssuesReferences(first:20){nodes{number}}
      timelineItems(itemTypes:[UNLABELED_EVENT, REOPENED_EVENT], first:100){nodes{
        __typename ... on UnlabeledEvent{actor{login} label{name}} ... on ReopenedEvent{actor{login}} }}
    }}}}`;
  const repo = `${owner}/${name}`;
  const out = [];
  let after = null;
  do {
    const page = graphql(q, { owner, name, after }).repository.pullRequests;
    for (const n of page.nodes) {
      const byMaintainer = (e) => maintainers.has(String(e.actor?.login || '').toLowerCase());
      const tl = n.timelineItems.nodes;
      out.push({
        number: n.number,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        author: n.author?.login || 'ghost',
        isBot: n.author?.__typename === 'Bot',
        authorAssociation: n.authorAssociation,
        labels: n.labels.nodes.map((l) => l.name),
        closingIssues: n.closingIssuesReferences.nodes.map((i) => i.number),
        comments: comments.get(n.number) || [],
        maintainerUnlabeled: tl.filter((e) => e.__typename === 'UnlabeledEvent' && byMaintainer(e)).map((e) => e.label?.name).filter(Boolean),
        maintainerReopened: tl.some((e) => e.__typename === 'ReopenedEvent' && byMaintainer(e)),
        ...fetchPrFiles(repo, n.number, n.changedFiles),
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return out;
}

function fetchBountyIssues(owner, name, comments) {
  const q = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){
    issues(labels:["bounty"], first:50, after:$after){ pageInfo{hasNextPage endCursor} nodes{
      number state labels(first:50){nodes{name}}
      timelineItems(itemTypes:[CLOSED_EVENT], last:1){ nodes{ ... on ClosedEvent{
        createdAt actor{login}
        closer{ __typename ... on PullRequest{ number authorAssociation labels(first:50){nodes{name}} } }
      }}}}}}}`;
  const out = [];
  let after = null;
  do {
    const page = graphql(q, { owner, name, after }).repository.issues;
    for (const n of page.nodes) {
      const ev = n.timelineItems.nodes[0];
      out.push({
        number: n.number,
        state: n.state,
        labels: n.labels.nodes.map((l) => l.name),
        comments: comments.get(n.number) || [],
        closedEvent: ev
          ? {
              createdAt: ev.createdAt,
              actor: ev.actor?.login || 'ghost',
              closer: ev.closer
                ? ev.closer.__typename === 'PullRequest'
                  ? { type: 'PullRequest', number: ev.closer.number, authorAssociation: ev.closer.authorAssociation, labels: ev.closer.labels.nodes.map((l) => l.name) }
                  : { type: ev.closer.__typename }
                : null,
            }
          : null,
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return out;
}

function fetchFlaggedAuthors(repo) {
  const rows = JSON.parse(gh(['pr', 'list', '-R', repo, '--state', 'all', '--label', LABELS.karmaFarming, '--limit', '1000', '--json', 'author']));
  return new Set(rows.filter((r) => !r.author?.is_bot).map((r) => String(r.author?.login || '').toLowerCase()).filter(Boolean));
}

function fetchMaintainers(repo) {
  const rows = jsonLines(gh(['api', '--paginate', `repos/${repo}/collaborators?per_page=100`, '--jq', '.[] | {login}']));
  return new Set(rows.map((r) => r.login.toLowerCase()));
}

function fetchLabels(repo) {
  const rows = jsonLines(gh(['api', '--paginate', `repos/${repo}/labels?per_page=100`, '--jq', '.[] | {name}']));
  return new Set(rows.map((r) => r.name));
}

const LABEL_DEFS = {
  [LABELS.karmaFarming]: ['B60205', 'Bounty claim with fabricated or no evidence; no karma'],
  [LABELS.karmaApproved]: ['0E8A16', 'Maintainer verified the evidence; karma is paid'],
  [LABELS.guardSkip]: ['C5DEF5', 'Bounty guard leaves this alone'],
  [LABELS.needsEvidence]: ['FBCA04', 'Bounty PR without Wayback captures; closes after 72h'],
  [LABELS.needsMaintainer]: ['FBCA04', 'Bounty guard wants a human to look'],
  [LABELS.refsNotFixes]: ['FBCA04', 'Uses Fixes/Closes on a bounty issue; use Refs #N'],
};

function apply(repo, a, state, now, save) {
  const comment = (c) => {
    gh(['api', `repos/${repo}/issues/${a.number}/comments`, '-F', 'body=@-'], c.body);
    recordMarker(state, a, c.marker, now);
    save();
  };
  const addLabels = (labels) => {
    if (labels.length) gh(['api', `repos/${repo}/issues/${a.number}/labels`, ...labels.flatMap((l) => ['-f', `labels[]=${l}`])]);
  };
  switch (a.kind) {
    case 'close-pr':
      a.comments.forEach(comment);
      addLabels(a.labels);
      gh(['api', '-X', 'PATCH', `repos/${repo}/pulls/${a.number}`, '-f', 'state=closed']);
      break;
    case 'flag-pr':
      addLabels(a.labels);
      a.comments.forEach(comment);
      break;
    case 'unlabel':
      for (const l of a.labels) gh(['api', '-X', 'DELETE', `repos/${repo}/issues/${a.number}/labels/${encodeURIComponent(l)}`]);
      break;
    case 'reopen-issue':
      // Comment first: if it fails, the next run retries both.
      a.comments.forEach(comment);
      gh(['api', '-X', 'PATCH', `repos/${repo}/issues/${a.number}`, '-f', 'state=open']);
      break;
    case 'ineligible-reply':
      a.comments.forEach(comment);
      break;
    default:
      throw new Error(`unknown action ${a.kind}`);
  }
}

export function describeAction(a) {
  const extra = [];
  if (a.labels?.length) extra.push(`labels: ${a.labels.join(', ')}`);
  extra.push(`${(a.comments || []).length} comment(s)`);
  const lines = [`${a.kind.padEnd(16)} ${a.ref} [${extra.join('; ')}]`, ...a.reasons.map((r) => `    - ${r}`)];
  if (a.paths?.length) lines.push(`    files: ${a.paths.slice(0, 10).join(', ')}${a.paths.length > 10 ? ' …' : ''}`);
  return lines.join('\n');
}

async function main(argv) {
  const doApply = argv.includes('--apply');
  const ri = argv.indexOf('--repo');
  const repo = ri >= 0 ? argv[ri + 1] : DEFAULT_REPO;
  const [owner, name] = repo.split('/');
  const home = process.env.BOUNTY_GUARD_HOME || dirname(fileURLToPath(import.meta.url));
  const stateFile = join(home, 'state.json');
  const statusFile = join(home, 'status.txt');
  const stamp = () => new Date().toISOString();
  const status = (line) => {
    if (doApply) writeFileSync(statusFile, `${stamp()} ${line}\n`);
  };

  if (doApply && rotateLog(process.env.BOUNTY_GUARD_LOG)) console.log(`${stamp()} rotated log`);
  console.log(`${stamp()} bounty-guard ${doApply ? 'APPLY' : 'dry run'} on ${repo}`);

  try {
    const viewer = gh(['api', 'user', '--jq', '.login']).trim();
    const maintainers = fetchMaintainers(repo);
    const flaggedAuthors = fetchFlaggedAuthors(repo);
    const comments = fetchAllComments(repo);
    const issues = fetchBountyIssues(owner, name, comments);
    const prs = fetchOpenPrs(owner, name, maintainers, comments);
    const state = loadState(stateFile);
    console.log(`${stamp()} ${prs.length} open PRs, ${issues.length} bounty issues, ${[...comments.values()].flat().length} comments, flagged authors: ${[...flaggedAuthors].join(', ') || 'none'}`);

    const now = new Date();
    const { actions, errors } = plan({ prs, issues, flaggedAuthors, maintainers, viewer, now, state, repo });
    for (const e of errors) console.error(`${stamp()} ERROR assessing ${e}`);
    for (const a of actions) console.log(describeAction(a));
    const w = writeCount(actions);

    if (!doApply) {
      console.log(`${stamp()} ${actions.length} action(s), ${w.closes} close/reopen, ${w.comments} comment(s), ${errors.length} error(s) (dry run; pass --apply to act)`);
      if (errors.length) process.exitCode = 1;
      return;
    }
    if (w.exceeded) {
      const msg = `ABORTED: plan has ${w.closes} closes/reopens and ${w.comments} comments (cap ${WRITE_CAP.closes}/${WRITE_CAP.comments}); nothing done`;
      console.error(`${stamp()} ${msg}`);
      status(msg);
      process.exitCode = 2;
      return;
    }

    const have = fetchLabels(repo);
    for (const l of new Set(actions.flatMap((a) => (a.kind === 'unlabel' ? [] : a.labels)))) {
      if (have.has(l)) continue;
      const [color, description] = LABEL_DEFS[l] || ['EDEDED', ''];
      gh(['api', `repos/${repo}/labels`, '-f', `name=${l}`, '-f', `color=${color}`, '-f', `description=${description}`]);
    }
    let failed = 0;
    for (const a of actions) {
      try {
        apply(repo, a, state, now, () => saveState(stateFile, state));
      } catch (err) {
        failed++;
        console.error(`${stamp()} FAILED ${a.kind} ${a.ref}: ${String(err.stderr || err.message).trim()}`);
      }
    }
    const summary = `${actions.length} action(s), ${failed} failed, ${errors.length} assessment error(s)`;
    console.log(`${stamp()} ${summary}`);
    status(`${failed || errors.length ? 'FAILED' : 'ok'} ${summary}`);
    if (failed || errors.length) process.exitCode = 1;
  } catch (err) {
    const msg = String(err.stderr || err.stack || err).trim();
    console.error(`${stamp()} bounty-guard crashed: ${msg}`);
    status(`CRASHED ${msg.split('\n')[0].slice(0, 300)}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) main(process.argv.slice(2));
