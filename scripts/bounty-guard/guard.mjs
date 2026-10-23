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
// talks to GitHub only through the `gh` CLI, and never reads git state, so it
// works from a checkout that is behind main.
//
//   node scripts/bounty-guard/guard.mjs            # dry run: print decisions
//   node scripts/bounty-guard/guard.mjs --apply    # act on them
//   --repo owner/name                              # default lizTheDeveloper/privacy-the-game
//
// The decision functions are pure and exported for tests/bounty-guard.test.js.

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MARKER = '<!-- bounty-guard -->';
export const MAINTAINER_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR']);
export const EVIDENCE_GRACE_MS = 72 * 3600 * 1000;
export const LABELS = {
  karmaFarming: 'karma-farming',
  karmaApproved: 'karma-approved',
  needsEvidence: 'needs-evidence',
  refsNotFixes: 'refs-not-fixes',
};
const CONTRIBUTING = 'https://github.com/lizTheDeveloper/privacy-the-game/blob/main/CONTRIBUTING.md';

export const isMaintainer = (association) => MAINTAINER_ASSOCIATIONS.has(String(association || '').toUpperCase());

/** Issue numbers written as #N anywhere in the text. */
export function referencedIssues(text) {
  return [...new Set([...String(text || '').matchAll(/(?<![\w/])#(\d+)\b/g)].map((m) => Number(m[1])))];
}

/** Issue numbers GitHub would auto-close: close/closes/closed, fix/fixes/fixed, resolve/resolves/resolved. */
export function closingKeywordRefs(text) {
  const re = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b:?\s+#(\d+)\b/gi;
  return [...new Set([...String(text || '').matchAll(re)].map((m) => Number(m[1])))];
}

/** A real capture URL (web.archive.org/web/... or /save/...), not just the word. */
export const hasWaybackLink = (text) => /https?:\/\/web\.archive\.org\/(?:web|save)\/\S+/i.test(String(text || ''));

export const isAllowedBountyPath = (p) => /^research\/data-brokers\/build\/[^/]+\.json$/.test(p);
export const isProtectedPath = (p) => p === 'collective' || p.startsWith('collective/');
export const isTestPath = (p) =>
  /(^|\/)tests?\//.test(p) || /\.test\.[^/]+$/.test(p) || /(^|\/)test_[^/]*\.py$/.test(p);
export const isGeneratedPath = (p) =>
  p.startsWith('research/data-brokers/brokers/') ||
  /^research\/data-brokers\/(?:.*\/)?(?:links|sources)\.json$/.test(p) ||
  p === 'src/data/broker-map.json';

/**
 * Decide what to do with one PR.
 * pr:  {number, title, body, author, authorAssociation, createdAt,
 *       isBot?, files: [{path, additions, deletions, changeType}], closingIssues: [n]}
 * ctx: {bountyIssues: Set<number>, flaggedAuthors: Set<lowercase login>,
 *       now: Date, evidenceRequestedAt?: ISO string of the guard's needs-evidence comment}
 * Returns {action: 'close'|'flag'|'ok', reasons, karmaFarming, labels,
 *          needsEvidence, closingKeyword: [bounty issue numbers]}.
 */
export function assessPr(pr, ctx) {
  const ok = { action: 'ok', reasons: [], karmaFarming: false, labels: [], needsEvidence: false, closingKeyword: [], bountyRefs: [] };
  // Collaborators are trusted. GitHub Apps (dependabot) are installed by a
  // maintainer and can't claim karma; their PRs wait for normal review.
  if (isMaintainer(pr.authorAssociation) || pr.isBot) return ok;

  const bounty = ctx.bountyIssues || new Set();
  const text = `${pr.title || ''}\n${pr.body || ''}`;
  const bountyRefs = [...new Set([...referencedIssues(text), ...(pr.closingIssues || [])])].filter((n) => bounty.has(n));
  const isBountyPr = bountyRefs.length > 0;
  const files = pr.files || [];

  const karma = [];
  const close = [];
  const flags = [];

  if ((ctx.flaggedAuthors || new Set()).has(String(pr.author || '').toLowerCase())) {
    karma.push(`@${pr.author} was already labelled \`${LABELS.karmaFarming}\` on an earlier PR, so later claims are closed automatically.`);
  }

  const protectedFiles = files.filter((f) => isProtectedPath(f.path)).map((f) => f.path);
  if (protectedFiles.length) {
    karma.push(`Touches \`collective/\` (${list(protectedFiles)}), which runs the nightly job that deletes opted-out players' data. Changes there need a maintainer and their own issue.`);
  }

  // Adding cases to a test file is normal; removing or rewriting lines is not.
  const testEdits = files
    .filter((f) => isTestPath(f.path) && f.changeType !== 'ADDED' && (f.deletions > 0 || f.changeType === 'DELETED' || f.changeType === 'RENAMED'))
    .map((f) => f.path);
  if (testEdits.length) karma.push(`Edits or deletes existing tests (${list(testEdits)}).`);

  if (isBountyPr) {
    const outside = files.filter((f) => !isAllowedBountyPath(f.path) && !isProtectedPath(f.path)).map((f) => f.path);
    if (outside.length) {
      karma.push(`A bounty PR may only edit \`research/data-brokers/build/*.json\`; this one changes ${list(outside)}. Nothing reads files like these.`);
    }
  }

  const generated = files.filter((f) => isGeneratedPath(f.path)).map((f) => f.path);
  if (generated.length) {
    close.push(`Hand-edits generated files (${list(generated)}). They are rebuilt from \`research/data-brokers/build/\`; see "How to rebuild" in research/data-brokers/README.md.`);
  }

  let needsEvidence = false;
  if (isBountyPr && !hasWaybackLink(pr.body)) {
    needsEvidence = true;
    const asked = ctx.evidenceRequestedAt ? new Date(ctx.evidenceRequestedAt).getTime() : null;
    if (asked !== null && (ctx.now || new Date()).getTime() - asked >= EVIDENCE_GRACE_MS) {
      close.push('Still no Wayback capture (`https://web.archive.org/...`) 72 hours after evidence was requested.');
    } else {
      flags.push('No Wayback capture (`https://web.archive.org/save/<url>`) in the PR description.');
    }
  }

  const closingKeyword = [...new Set([...closingKeywordRefs(text), ...(pr.closingIssues || [])])].filter((n) => bounty.has(n));
  if (closingKeyword.length) {
    flags.push(`Uses a closing keyword on bounty issue ${closingKeyword.map((n) => `#${n}`).join(', ')}; please write \`Refs #N\` instead. A maintainer closes bounty issues after checking the evidence.`);
  }

  const base = { needsEvidence, closingKeyword, bountyRefs };
  if (karma.length || close.length) {
    const karmaFarming = karma.length > 0;
    return { ...base, action: 'close', reasons: [...karma, ...close], karmaFarming, labels: karmaFarming ? [LABELS.karmaFarming] : [] };
  }
  if (flags.length) {
    const labels = [];
    if (needsEvidence) labels.push(LABELS.needsEvidence);
    if (closingKeyword.length) labels.push(LABELS.refsNotFixes);
    return { ...base, action: 'flag', reasons: flags, karmaFarming: false, labels };
  }
  return { ...ok, bountyRefs };
}

/**
 * Decide whether a closed bounty issue should be reopened.
 * issue: {number, actor, actorAssociation, closer: null | {type: 'PullRequest', number, authorAssociation, labels: [name]} | {type: 'Commit'}}
 */
export function assessIssueClose(issue) {
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
    return { action: 'reopen', reasons: [`Closed by @${issue.actor}, who isn't a maintainer.`] };
  }
  return { action: 'ok', reasons: [] };
}

/** Kinds of guard comment already posted (only comments written by `viewer` count). */
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
export function assessIssueComments(issue, flaggedAuthors, viewer) {
  const done = guardComments(issue.comments, viewer);
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

const list = (paths) => {
  const shown = paths.slice(0, 5).map((p) => `\`${p}\``).join(', ');
  return paths.length > 5 ? `${shown} and ${paths.length - 5} more` : shown;
};

// ---------------------------------------------------------------------------
// Comment bodies. Each carries MARKER plus a kind marker so reruns are idempotent.

const sign = (kind) => `\n\n${MARKER}\n<!-- bounty-guard:${kind} -->`;

export function closeComment(decision) {
  const lead = decision.karmaFarming
    ? `Thanks for your interest in Reclaim City. This PR is being closed and labelled \`${LABELS.karmaFarming}\`, so it earns no karma:`
    : 'Thanks for your interest in Reclaim City. This PR is being closed:';
  return `${lead}\n\n${decision.reasons.map((r) => `- ${r}`).join('\n')}\n\nBounty evidence goes in a comment on the issue: the final URL, a one-line verdict, what the form asks for, and a Wayback capture of every page you used, from a check you did yourself in a normal browser. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('close')}`;
}

export function needsEvidenceComment() {
  return `Thanks for this. Bounty claims need evidence a maintainer can check: the final URL, a one-line verdict, what the form asks for, and a Wayback capture (\`https://web.archive.org/save/<url>\`) of every page you used. Please add the captures to the PR description. Without them this PR closes automatically in 72 hours. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('needs-evidence')}`;
}

export function refsComment(nums) {
  const refs = nums.map((n) => `#${n}`).join(', ');
  return `Please change \`Fixes\`/\`Closes\`/\`Resolves\` ${refs} to \`Refs ${nums.map((n) => `#${n}`).join(' ')}\` in the description. Bounty issues stay open until a maintainer has checked the evidence; if this PR closes one anyway it will be reopened. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('refs')}`;
}

export function reopenComment(reasons) {
  return `Reopening. ${reasons.join(' ')} See [CONTRIBUTING.md](${CONTRIBUTING}).${sign('reopen')}`;
}

export function ineligibleComment(login) {
  return `@${login}, this account's earlier submissions were labelled \`${LABELS.karmaFarming}\` (fabricated or AI-generated evidence), so claims from it aren't eligible for karma. See [CONTRIBUTING.md](${CONTRIBUTING}).${sign(`ineligible:${login.toLowerCase()}`)}`;
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

const COMMENTS = 'comments(last: 100) { nodes { author { __typename login } body createdAt } }';

function fetchOpenPrs(owner, name) {
  const q = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){
    pullRequests(states:OPEN, first:25, after:$after){ pageInfo{hasNextPage endCursor} nodes{
      number title body createdAt authorAssociation author{__typename login}
      labels(first:50){nodes{name}}
      files(first:100){nodes{path additions deletions changeType}}
      closingIssuesReferences(first:20){nodes{number}}
      ${COMMENTS} }}}}`;
  const out = [];
  let after = null;
  do {
    const page = graphql(q, { owner, name, after }).repository.pullRequests;
    for (const n of page.nodes) {
      out.push({
        number: n.number,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        author: n.author?.login || 'ghost',
        authorAssociation: n.authorAssociation,
        isBot: n.author?.__typename === 'Bot',
        labels: n.labels.nodes.map((l) => l.name),
        files: n.files.nodes,
        closingIssues: n.closingIssuesReferences.nodes.map((i) => i.number),
        comments: n.comments.nodes.map(flatComment),
      });
    }
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);
  return out;
}

function fetchBountyIssues(owner, name) {
  const q = `query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){
    issues(labels:["bounty"], first:50, after:$after){ pageInfo{hasNextPage endCursor} nodes{
      number state ${COMMENTS}
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
        comments: n.comments.nodes.map(flatComment),
        closedEvent: ev
          ? {
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

const flatComment = (c) => ({ author: c.author?.login || 'ghost', body: c.body, createdAt: c.createdAt });

function fetchFlaggedAuthors(repo) {
  const rows = JSON.parse(gh(['pr', 'list', '-R', repo, '--state', 'all', '--label', LABELS.karmaFarming, '--limit', '1000', '--json', 'author']));
  return new Set(rows.filter((r) => !r.author?.is_bot).map((r) => String(r.author?.login || '').toLowerCase()).filter(Boolean));
}

function fetchMaintainers(repo) {
  const rows = JSON.parse(gh(['api', '--paginate', `repos/${repo}/collaborators?per_page=100`]));
  return new Set(rows.map((r) => r.login.toLowerCase()));
}

function fetchLabels(repo) {
  const rows = JSON.parse(gh(['api', '--paginate', `repos/${repo}/labels?per_page=100`]));
  return new Set(rows.map((r) => r.name));
}

const LABEL_DEFS = {
  [LABELS.karmaFarming]: ['B60205', 'Bounty claim with fabricated or no evidence; no karma'],
  [LABELS.karmaApproved]: ['0E8A16', 'Maintainer verified the evidence; karma is paid'],
  [LABELS.needsEvidence]: ['FBCA04', 'Bounty PR without Wayback captures; closes after 72h'],
  [LABELS.refsNotFixes]: ['FBCA04', 'Uses Fixes/Closes on a bounty issue; use Refs #N'],
};

// ---------------------------------------------------------------------------

export function plan({ prs, issues, flaggedAuthors, maintainers, viewer, now }) {
  const bountyIssues = new Set(issues.map((i) => i.number));
  const actions = [];

  for (const pr of prs) {
    const done = guardComments(pr.comments, viewer);
    const d = assessPr(pr, { bountyIssues, flaggedAuthors, now, evidenceRequestedAt: done.get('needs-evidence') || null });
    const ref = `PR #${pr.number} (@${pr.author}, ${pr.authorAssociation})`;
    if (d.action === 'close') {
      actions.push({ kind: 'close-pr', number: pr.number, ref, reasons: d.reasons, labels: d.labels.filter((l) => !pr.labels.includes(l)), comment: done.has('close') ? null : closeComment(d) });
    } else if (d.action === 'flag') {
      const comments = [];
      if (d.needsEvidence && !done.has('needs-evidence')) comments.push(needsEvidenceComment());
      if (d.closingKeyword.length && !done.has('refs')) comments.push(refsComment(d.closingKeyword));
      const labels = d.labels.filter((l) => !pr.labels.includes(l));
      if (comments.length || labels.length) actions.push({ kind: 'flag-pr', number: pr.number, ref, reasons: d.reasons, labels, comments });
    }
    // Evidence or Refs added since we flagged it: take the stale labels off.
    const stale = [];
    if (pr.labels.includes(LABELS.needsEvidence) && !d.needsEvidence) stale.push(LABELS.needsEvidence);
    if (pr.labels.includes(LABELS.refsNotFixes) && !d.closingKeyword.length) stale.push(LABELS.refsNotFixes);
    if (stale.length && d.action !== 'close') actions.push({ kind: 'unlabel', number: pr.number, ref, reasons: ['resolved'], labels: stale });
  }

  for (const issue of issues) {
    if (issue.state === 'CLOSED' && issue.closedEvent) {
      const ev = issue.closedEvent;
      const d = assessIssueClose({
        number: issue.number,
        actor: ev.actor,
        actorAssociation: maintainers.has(ev.actor.toLowerCase()) ? 'COLLABORATOR' : 'NONE',
        closer: ev.closer,
      });
      if (d.action === 'reopen') actions.push({ kind: 'reopen-issue', number: issue.number, ref: `issue #${issue.number}`, reasons: d.reasons, comment: reopenComment(d.reasons) });
    }
    for (const login of assessIssueComments(issue, flaggedAuthors, viewer)) {
      actions.push({ kind: 'ineligible-reply', number: issue.number, ref: `issue #${issue.number}`, reasons: [`comment from flagged @${login}`], comment: ineligibleComment(login) });
    }
  }
  return actions;
}

function apply(repo, a) {
  const comment = (body) => gh(['api', `repos/${repo}/issues/${a.number}/comments`, '-F', 'body=@-'], body);
  const addLabels = (labels) => {
    if (!labels.length) return;
    gh(['api', `repos/${repo}/issues/${a.number}/labels`, ...labels.flatMap((l) => ['-f', `labels[]=${l}`])]);
  };
  switch (a.kind) {
    case 'close-pr':
      if (a.comment) comment(a.comment);
      addLabels(a.labels);
      gh(['api', '-X', 'PATCH', `repos/${repo}/pulls/${a.number}`, '-f', 'state=closed']);
      break;
    case 'flag-pr':
      addLabels(a.labels);
      for (const c of a.comments) comment(c);
      break;
    case 'unlabel':
      for (const l of a.labels) gh(['api', '-X', 'DELETE', `repos/${repo}/issues/${a.number}/labels/${encodeURIComponent(l)}`]);
      break;
    case 'reopen-issue':
      gh(['api', '-X', 'PATCH', `repos/${repo}/issues/${a.number}`, '-f', 'state=open']);
      comment(a.comment);
      break;
    case 'ineligible-reply':
      comment(a.comment);
      break;
    default:
      throw new Error(`unknown action ${a.kind}`);
  }
}

function describe(a) {
  const extra = [];
  if (a.labels?.length) extra.push(`labels: ${a.labels.join(', ')}`);
  if (a.kind === 'close-pr' && !a.comment) extra.push('already commented');
  if (a.comments) extra.push(`${a.comments.length} comment(s)`);
  return `${a.kind.padEnd(16)} ${a.ref}${extra.length ? ` [${extra.join('; ')}]` : ''}\n${a.reasons.map((r) => `    - ${r}`).join('\n')}`;
}

async function main(argv) {
  const doApply = argv.includes('--apply');
  const ri = argv.indexOf('--repo');
  const repo = ri >= 0 ? argv[ri + 1] : 'lizTheDeveloper/privacy-the-game';
  const [owner, name] = repo.split('/');
  const stamp = () => new Date().toISOString();
  console.log(`${stamp()} bounty-guard ${doApply ? 'APPLY' : 'dry run'} on ${repo}`);

  const viewer = gh(['api', 'user', '--jq', '.login']).trim();
  const maintainers = fetchMaintainers(repo);
  const flaggedAuthors = fetchFlaggedAuthors(repo);
  const issues = fetchBountyIssues(owner, name);
  const prs = fetchOpenPrs(owner, name);
  console.log(`${stamp()} ${prs.length} open PRs, ${issues.length} bounty issues, flagged authors: ${[...flaggedAuthors].join(', ') || 'none'}`);

  const actions = plan({ prs, issues, flaggedAuthors, maintainers, viewer, now: new Date() });
  if (!actions.length) console.log(`${stamp()} nothing to do`);

  let failed = 0;
  if (doApply && actions.length) {
    const have = fetchLabels(repo);
    const needed = new Set(actions.flatMap((a) => (a.kind === 'unlabel' ? [] : a.labels || [])));
    for (const l of needed) {
      if (have.has(l)) continue;
      const [color, description] = LABEL_DEFS[l] || ['EDEDED', ''];
      gh(['api', `repos/${repo}/labels`, '-f', `name=${l}`, '-f', `color=${color}`, '-f', `description=${description}`]);
    }
  }
  for (const a of actions) {
    console.log(describe(a));
    if (!doApply) continue;
    try {
      apply(repo, a);
    } catch (err) {
      failed++;
      console.error(`${stamp()} FAILED ${a.kind} ${a.ref}: ${err.stderr || err.message}`);
    }
  }
  console.log(`${stamp()} ${actions.length} action(s)${doApply ? `, ${failed} failed` : ' (dry run; pass --apply to act)'}`);
  if (failed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`${new Date().toISOString()} bounty-guard crashed: ${err.stderr || err.stack || err}`);
    process.exit(1);
  });
}
