import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  assessPr,
  assessIssueClose,
  assessIssueComments,
  closingKeywordRefs,
  hasWaybackLink,
  guardComments,
  MARKER,
  EVIDENCE_GRACE_MS,
} from '../scripts/bounty-guard/guard.mjs';

// Fixtures are the real karma-farming PRs (#435, #427, #254, #421) as
// `gh pr view --json` returned them, plus the REST author_association.
const fixture = (n) =>
  JSON.parse(readFileSync(new URL(`./fixtures/bounty-guard/pr-${n}.json`, import.meta.url), 'utf8'));

const NOW = new Date('2026-10-23T12:00:00Z');
const bountyIssues = new Set([42, 61, 131, 150, 200]);
const ctx = (over = {}) => ({ bountyIssues, flaggedAuthors: new Set(), now: NOW, ...over });

const WAYBACK = 'https://web.archive.org/web/20261022000000/https://example-broker.com/opt-out';

const legitBountyPr = (over = {}) => ({
  number: 900,
  title: 'data: Example Broker opt-out route (Refs #200)',
  author: 'careful-human',
  authorAssociation: 'NONE',
  createdAt: '2026-10-22T12:00:00Z',
  body: `Refs #200\n\n## Evidence\nFinal URL: https://example-broker.com/opt-out\nVerdict: works, asks for name + email.\nCaptures: ${WAYBACK}`,
  files: [{ path: 'research/data-brokers/build/link-overrides.json', additions: 3, deletions: 1, changeType: 'MODIFIED' }],
  closingIssues: [],
  ...over,
});

describe('assessPr: the real karma-farming PRs', () => {
  it('#435 (rewrote the nightly purge job and deleted its tests) is closed as karma-farming', () => {
    const d = assessPr(fixture(435), ctx());
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
    expect(d.reasons.join('\n')).toMatch(/collective\//);
    expect(d.reasons.join('\n')).toMatch(/test/i);
  });

  it('#427 (invented collective/data/brokers.tsv, "Fixes #42") is closed as karma-farming', () => {
    const d = assessPr(fixture(427), ctx());
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
    expect(d.reasons.join('\n')).toMatch(/collective\//);
  });

  it('#254 (docs_update.md for a bounty, author association NONE) is closed as karma-farming', () => {
    const d = assessPr(fixture(254), ctx());
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
    expect(d.reasons.join('\n')).toMatch(/docs_update\.md/);
  });

  it('#421 (CONTRIBUTOR association does not count as a maintainer) is closed', () => {
    const pr = fixture(421);
    expect(pr.authorAssociation).toBe('CONTRIBUTOR');
    const d = assessPr(pr, ctx());
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
  });

  it('an author already labelled karma-farming is closed even on an otherwise clean PR', () => {
    const d = assessPr(legitBountyPr({ author: 'TaherEzzi' }), ctx({ flaggedAuthors: new Set(['taherezzi']) }));
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
    expect(d.reasons.join('\n')).toMatch(/karma-farming/);
  });
});

describe('assessPr: rules one at a time', () => {
  it('touching collective/ closes even when the PR is not about a bounty', () => {
    const d = assessPr(
      legitBountyPr({ title: 'tidy', body: 'small tidy', files: [{ path: 'collective/service/server.js', additions: 1, deletions: 1, changeType: 'MODIFIED' }] }),
      ctx(),
    );
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
  });

  it('editing or deleting a test closes; adding a new test does not', () => {
    const edit = assessPr(
      legitBountyPr({ title: 'x', body: 'x', files: [{ path: 'tests/state.test.js', additions: 0, deletions: 4, changeType: 'MODIFIED' }] }),
      ctx(),
    );
    expect(edit.action).toBe('close');
    expect(edit.karmaFarming).toBe(true);

    const add = assessPr(
      legitBountyPr({
        title: 'fix: typo in router',
        body: 'fixes a typo',
        files: [
          { path: 'src/router.js', additions: 1, deletions: 1, changeType: 'MODIFIED' },
          { path: 'tests/router-typo.test.js', additions: 10, deletions: 0, changeType: 'ADDED' },
        ],
      }),
      ctx(),
    );
    expect(add.action).toBe('ok');
  });

  it('appending cases to an existing test file is fine (merged PR #2 did this)', () => {
    const d = assessPr(
      legitBountyPr({
        title: 'fix: preserve active phase tab',
        body: 'Keeps the tab when you come back from a mission.',
        authorAssociation: 'CONTRIBUTOR',
        files: [
          { path: 'src/router.js', additions: 1, deletions: 1, changeType: 'MODIFIED' },
          { path: 'tests/router.test.js', additions: 15, deletions: 0, changeType: 'MODIFIED' },
        ],
      }),
      ctx(),
    );
    expect(d.action).toBe('ok');
  });

  it('deleting a collective test file closes (as #435 did)', () => {
    const d = assessPr(
      legitBountyPr({ title: 'x', body: 'x', files: [{ path: 'collective/job/tests/test_purge.py', additions: 0, deletions: 115, changeType: 'DELETED' }] }),
      ctx(),
    );
    expect(d.reasons.join('\n')).toMatch(/tests/);
  });

  it('bots (dependabot bumping collective/service deps) are left for a maintainer', () => {
    const d = assessPr(
      legitBountyPr({
        title: 'chore(deps): bump express in /collective/service',
        body: 'Bumps express.',
        author: 'dependabot',
        isBot: true,
        files: [{ path: 'collective/service/package.json', additions: 1, deletions: 1, changeType: 'MODIFIED' }],
      }),
      ctx(),
    );
    expect(d.action).toBe('ok');
  });

  it('a bounty PR that adds a file outside research/data-brokers/build/*.json is closed as karma-farming', () => {
    const d = assessPr(
      legitBountyPr({ files: [{ path: 'data/brokers.json', additions: 12, deletions: 0, changeType: 'ADDED' }] }),
      ctx(),
    );
    expect(d.action).toBe('close');
    expect(d.karmaFarming).toBe(true);
    expect(d.reasons.join('\n')).toMatch(/data\/brokers\.json/);
  });

  it('a nested file under build/ is not an allowed bounty path', () => {
    const d = assessPr(
      legitBountyPr({ files: [{ path: 'research/data-brokers/build/new/x.json', additions: 1, deletions: 0, changeType: 'ADDED' }] }),
      ctx(),
    );
    expect(d.action).toBe('close');
  });

  it('hand-editing generated files closes (without the karma-farming label on its own)', () => {
    for (const path of [
      'research/data-brokers/brokers/acme.json',
      'research/data-brokers/links.json',
      'research/data-brokers/sources.json',
      'src/data/broker-map.json',
    ]) {
      const d = assessPr(
        legitBountyPr({ title: 'x', body: 'x', files: [{ path, additions: 1, deletions: 1, changeType: 'MODIFIED' }] }),
        ctx(),
      );
      expect(d.action, path).toBe('close');
      expect(d.karmaFarming, path).toBe(false);
    }
  });

  it('a bounty PR with no Wayback link is flagged needs-evidence, not closed, inside 72h', () => {
    const d = assessPr(legitBountyPr({ body: 'Refs #200\nI checked it, it works.' }), ctx());
    expect(d.action).toBe('flag');
    expect(d.needsEvidence).toBe(true);
    expect(d.labels).toContain('needs-evidence');
  });

  it('closes a needs-evidence PR 72h after the guard asked for evidence', () => {
    const asked = new Date(NOW.getTime() - EVIDENCE_GRACE_MS - 1000).toISOString();
    const d = assessPr(legitBountyPr({ body: 'Refs #200\nI checked it.' }), ctx({ evidenceRequestedAt: asked }));
    expect(d.action).toBe('close');
    expect(d.reasons.join('\n')).toMatch(/72/);

    const recent = new Date(NOW.getTime() - 3600 * 1000).toISOString();
    expect(assessPr(legitBountyPr({ body: 'Refs #200' }), ctx({ evidenceRequestedAt: recent })).action).toBe('flag');
  });

  it('"Fixes #N" on a bounty issue is flagged and asks for Refs #N', () => {
    const d = assessPr(legitBountyPr({ body: `Fixes #200\n\nEvidence: ${WAYBACK}` }), ctx());
    expect(d.action).toBe('flag');
    expect(d.closingKeyword).toEqual([200]);
    expect(d.labels).toContain('refs-not-fixes');
  });

  it('closingIssuesReferences from GitHub count even if the body is clean', () => {
    const d = assessPr(legitBountyPr({ closingIssues: [200] }), ctx());
    expect(d.action).toBe('flag');
    expect(d.closingKeyword).toEqual([200]);
  });
});

describe('assessPr: legitimate shapes', () => {
  it('evidence + allowed path + Refs #N is ok', () => {
    const d = assessPr(legitBountyPr(), ctx());
    expect(d).toMatchObject({ action: 'ok', reasons: [] });
  });

  it('collaborators are never touched, even on collective/', () => {
    for (const authorAssociation of ['OWNER', 'MEMBER', 'COLLABORATOR']) {
      const d = assessPr({ ...fixture(435), authorAssociation }, ctx());
      expect(d.action, authorAssociation).toBe('ok');
    }
  });

  it('a non-bounty code PR from a stranger is ok', () => {
    const d = assessPr(
      legitBountyPr({ title: 'fix: map tooltip', body: 'Fixes #5', files: [{ path: 'src/city-map.js', additions: 2, deletions: 1, changeType: 'MODIFIED' }] }),
      ctx(),
    );
    expect(d.action).toBe('ok');
  });
});

describe('text helpers', () => {
  it('finds closing keywords in all GitHub spellings', () => {
    expect(closingKeywordRefs('Closes #131\nFixes #131\nresolved: #9 and fix #3. Refs #4')).toEqual([131, 9, 3]);
    expect(closingKeywordRefs('Refs #4, see #5')).toEqual([]);
  });

  it('a Wayback link means a web.archive.org capture URL, not the bare word', () => {
    expect(hasWaybackLink(`see ${WAYBACK}`)).toBe(true);
    expect(hasWaybackLink('https://web.archive.org/save/https://x.com')).toBe(true);
    expect(hasWaybackLink('I saved it on web.archive.org')).toBe(false);
  });
});

describe('guardComments: idempotent markers', () => {
  it('only counts marker comments the guard itself wrote', () => {
    const comments = [
      { author: 'TaherEzzi', body: `${MARKER}\n<!-- bounty-guard:needs-evidence -->`, createdAt: '2026-10-01T00:00:00Z' },
      { author: 'lizTheDeveloper', body: `hi\n${MARKER}\n<!-- bounty-guard:close -->`, createdAt: '2026-10-02T00:00:00Z' },
    ];
    const g = guardComments(comments, 'lizTheDeveloper');
    expect(g.has('close')).toBe(true);
    expect(g.has('needs-evidence')).toBe(false);
  });
});

describe('assessIssueClose', () => {
  it('reopens a bounty issue auto-closed by a merged non-maintainer PR', () => {
    const d = assessIssueClose({
      number: 61,
      actor: 'lizTheDeveloper',
      actorAssociation: 'OWNER',
      closer: { type: 'PullRequest', number: 421, authorAssociation: 'CONTRIBUTOR', labels: ['karma-farming'] },
    });
    expect(d.action).toBe('reopen');
  });

  it('leaves it closed when the closing PR has karma-approved', () => {
    const d = assessIssueClose({
      number: 61,
      actor: 'lizTheDeveloper',
      actorAssociation: 'OWNER',
      closer: { type: 'PullRequest', number: 500, authorAssociation: 'CONTRIBUTOR', labels: ['karma-approved'] },
    });
    expect(d.action).toBe('ok');
  });

  it('leaves it closed when a maintainer authored the closing PR', () => {
    const d = assessIssueClose({
      number: 61,
      actor: 'lizTheDeveloper',
      actorAssociation: 'OWNER',
      closer: { type: 'PullRequest', number: 501, authorAssociation: 'OWNER', labels: [] },
    });
    expect(d.action).toBe('ok');
  });

  it('reopens an issue a non-maintainer closed by hand; a maintainer close stands', () => {
    expect(assessIssueClose({ number: 7, actor: 'stranger', actorAssociation: 'NONE', closer: null }).action).toBe('reopen');
    expect(assessIssueClose({ number: 41, actor: 'lizTheDeveloper', actorAssociation: 'OWNER', closer: null }).action).toBe('ok');
  });
});

describe('assessIssueComments', () => {
  it('replies once per flagged author per issue', () => {
    const comments = [
      { author: 'TaherEzzi', body: '/claim', createdAt: '2026-10-20T00:00:00Z' },
      { author: 'TaherEzzi', body: 'done, see PR', createdAt: '2026-10-20T01:00:00Z' },
      { author: 'careful-human', body: 'claiming', createdAt: '2026-10-20T02:00:00Z' },
    ];
    const flagged = new Set(['taherezzi']);
    expect(assessIssueComments({ number: 131, comments }, flagged, 'lizTheDeveloper')).toEqual(['TaherEzzi']);

    const replied = [
      ...comments,
      { author: 'lizTheDeveloper', body: `${MARKER}\n<!-- bounty-guard:ineligible:taherezzi -->`, createdAt: '2026-10-21T00:00:00Z' },
    ];
    expect(assessIssueComments({ number: 131, comments: replied }, flagged, 'lizTheDeveloper')).toEqual([]);
  });
});
