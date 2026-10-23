# Contributing

Thanks for helping. Reclaim City sends real people to real opt-out pages, and its data-broker dataset is cited by journalists. Everything we publish has to be true and checkable.

## Bounty issues (`bounty` label)

Bounties are paid in karma points. Before you start one:

1. **Claim it** by commenting on the issue, so two people don't do the same one.
2. **Do the check yourself, by hand, in a normal browser.** Automated or AI-generated answers aren't accepted, because the point is a person confirming what a real page does today.
3. **Submit your evidence as a comment on the issue.** That means the final URL, a one-line verdict, what the form asks for, and a Wayback capture (`https://web.archive.org/save/<url>`) of every page you used. Evidence without captures can't be accepted.

A maintainer turns your evidence into a dataset change. You don't need to open a pull request.

Karma is paid only after a maintainer verifies the evidence and applies `karma-approved`. Submissions with fabricated or AI-generated evidence are labelled `karma-farming`, earn nothing, and the account's later claims are closed automatically.

## Pull requests

If you do open one for a bounty:

- **Edit only the real dataset config:** `research/data-brokers/build/*.json` (overrides, aliases, id-map). Generated files (`research/data-brokers/brokers/`, `links.json`, `sources.json`, `src/data/broker-map.json`) are never edited by hand; see "How to rebuild" in `research/data-brokers/README.md`.
- **Don't add new data files.** Paths like `data/brokers.json`, `collective/data/…` or `docs_update.md` aren't read by anything, and those PRs will be closed.
- **Don't touch `collective/`** in a bounty PR. It runs the nightly job that deletes opted-out players' data. Changes there need a maintainer and their own issue.
- Put the Wayback captures in the PR description, and link the issue with `Refs #N`, not `Fixes #N`. A maintainer closes the issue once the evidence is checked.
- Run `npm run brokers:validate` and `npx vitest run` before opening the PR.

PRs that don't follow these rules are closed without review.
