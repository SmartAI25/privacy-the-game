# Open data broker dataset

A dataset of US data brokers and the documented links between them: who owns whom, who supplies whom, who buys from whom. Every link cites a document, and every document has an archived copy.

It was built for [Reclaim City](https://github.com/lizTheDeveloper/privacy-the-game), a game about taking your data back. It is published separately for journalists, researchers and privacy advocates who want to check, reuse or extend it.

- **As of:** 2026-10-18 (`DATASET.json`)
- **License:** [CC BY 4.0](LICENSE)
- **Errors:** [open an issue](https://github.com/lizTheDeveloper/privacy-the-game/issues)

## How to cite

> Reclaim City open data broker dataset, as of 2026-10-18. https://github.com/lizTheDeveloper/privacy-the-game/tree/main/research/data-brokers (CC BY 4.0).

When you cite a specific link, also cite the source document it rests on (its `url` and `archived` copy in `sources.json`). The dataset is a pointer to the evidence, not the evidence itself.

## What's in it

| | Count |
|---|---|
| Broker records | 839 |
| Links (all tiers) | 158 |
| Published links (tier A) | 107 |
| Sources | 171 |

Published links by type:

| Type | Published |
|---|---|
| `owns` | 47 |
| `buys` | 44 |
| `supplies` | 15 |
| `matches-identity` | 1 |

Published links by source family:

| Family | Published | What the sources are |
|---|---|---|
| Procurement | 43 | US federal contract awards (USAspending) |
| Corporate filings | 39 | SEC 10-Ks (20 links) and statutory annual reports filed with non-US regulators (19 links: Experian, RELX, Publicis) |
| Enforcement | 25 | FTC and CFPB complaints and orders, and federal court records |

The other 51 links are kept but not published: 10 tier B, 27 tier C, and 14 tier A links that review held back because the source's wording did not support publishing the claim (for example, a procurement award that reads as a software licence, or a filing that says reports "combine information from" bureaus rather than that one buys from another). See "Evidence tiers" below.

Of the 839 broker records, 735 come from the state registries and 104 were added by research (parent companies, subsidiaries named in filings, and government buyers). 93 records appear in at least one published link; most registered brokers have no documented link yet.

## Coverage

State data broker registries imported, each saved on 2026-10-18 (details in `sources/registries/SOURCES.md`):

| Registry | Brokers listing it |
|---|---|
| California (CPPA) | 603 |
| Texas (Secretary of State) | 437 |
| Oregon (DCBS) | 387 |

**Vermont is not included.** Its bulk download requires a registered account, and its search uses a CAPTCHA. We did not use unofficial mirrors. This is a known gap: brokers registered only in Vermont are missing.

`registries.CA: "2026"` means "listed in our 2026-10-18 snapshot", not the year the broker first registered.

## Evidence tiers and what gets published

Every link has a tier:

- **A:** a regulator or court document, an SEC filing, a statutory annual report filed with a non-US securities regulator (Experian and RELX in the UK, Publicis in France), or a US federal procurement record.
- **B:** the company's own statement (privacy policy, press release).
- **C:** reputable journalism.

**Only tier A links are published.** Tier B and C links are in `links.json` with `"published": false`. They are research leads awaiting a later review, not findings. The validator rejects any published link that is not tier A.

Broker records themselves (names, registry data, opt-out routes) are published in full.

## Methods and standards

These are the rules every published claim follows. They are what you need to judge whether to rely on one.

- **Narrow claims.** Each `claim` says only what its source says, and names the document. Allegations in a complaint are written as allegations ("the FTC alleges…"); a claim from a complaint describes what the complaint says, not a court finding. Where a claim cites a settlement order in which the company neither admitted nor denied the allegations, the claim says so. Most of these enforcement cases ended in such settlements, including some whose links cite only the complaint.
- **Archived and checkable.** Every source has a Wayback Machine copy (`archived`). Every published claim can be checked against that archived copy, not only against the live page.
- **Procurement archives are API records.** USAspending award pages are JavaScript shells that archive as blank pages, so procurement sources are archived as the award's JSON from the USAspending API (`api.usaspending.gov/api/v2/awards/<id>/`). The `url` is still the human-readable award page.
- **What counts as a purchase.** A procurement `buys` link is published only when the award's own description, or its product/service code, shows the government bought data or access to data. Awards that read as software or licences only are kept unpublished. Some published awards are narrow (for example, employee credit checks), and their claims say so.
- **Naming entities.** Complaints often use brand names ("LiveRamp", "Facebook"). Matching those names to a legal-entity record in this dataset is our identification, not the document's.
- **Merging companies.** Two records are merged only when their legal names match. A shared brand or DBA name is never enough. Pairs that share only a brand are kept separate and listed in `sources/registries/MERGE-CANDIDATES.md`.
- **`parent` is the direct parent.** Where a filing says a company is "held indirectly" and doesn't name the direct parent, `parent` is left empty rather than guessed.
- **Known gaps:**
  - Some holding-company to operating-company links are not yet sourced, so related records sit unconnected: TransUnion and Trans Union LLC, Dun & Bradstreet Holdings and Dun and Bradstreet Inc., RELX PLC and RELX Inc., and Verisk and Insurance Services Office.
  - Government buyers are modelled at the agency level (ICE, CBP, FBI…). Their parent departments are not.
  - Vermont's registry is missing (see Coverage).
- **Unknown stays unknown.** A missing size is `size.known: false`, never an estimate. An opt-out URL we couldn't check is marked as such, not assumed live or dead.

## Files

```
DATASET.json          { "asOf": "YYYY-MM-DD" }
brokers/<id>.json     one record per broker
links.json            every link, published or not
sources.json          every source document, keyed by id
sources/registries/   state registry snapshots as downloaded, SOURCES.md, MERGE-CANDIDATES.md
sources/MISSION-MAPPING.md   how records are tied to the game's missions
staging/<family>/     research output per source family, with researchers' NOTES.md and REJECTED.json
build/                scripts and the curation config
```

The game reads a derived file, `src/data/broker-map.json`, which holds only published links.

## Record shapes

### Broker (`brokers/<id>.json`)

| Field | Meaning |
|---|---|
| `id` | Stable slug; matches the filename. |
| `name` | Legal name where known. |
| `aliases` | DBAs and other names. An alias never merges two records. |
| `parent` | Id of the direct parent company, or `null`. |
| `kind` | Zero or more of `people-search`, `marketing`, `risk-identity`, `location`, `financial`, `health`, `automotive`, `identity-resolution`, `data-marketplace`, `ad-network`, `buyer`. Empty means not yet classified (617 records). Government agencies are `buyer`. |
| `registries` | `{ "CA": "2026", "TX": …, "OR": … }`: the snapshot year a registry listed it in. |
| `website` | Primary website, where a registry gives one. |
| `sells` | What a source says it sells, in short phrases. |
| `optOut` | How to opt out, or `null` if no route is known (96 records). See below. |
| `size` | `{ known, signals: [{ kind, value, source }] }`. `known: false` has no signals. |
| `missions` | Reclaim City missions that file with this broker (game use only). |
| `sources` | Ids in `sources.json` behind anything on the record. |

`optOut`:

| Field | Meaning |
|---|---|
| `method` | `web-form`, `email`, `mail`, `portal`, `sweep-only` or `none`. `none` means the broker offers no opt-out. |
| `url` / `email` | Where to go. |
| `status` | Result of the last automated check (below). |
| `verifiedAt` | The date of that check (YYYY-MM-DD), whatever its result. |
| `notes` | Anything a person needs to know to use it. |
| `alternates` | Other documented routes `[{ site, url, source }]`, such as a DBA site's own form. |

`optOut.status` values:

- `verified`: the URL loaded and stayed on the same site and page.
- `suspect`: it loaded, but redirected to another domain or to the site's home page. The form may have moved.
- `blocked`: we could not verify it (a 401/403/429/5xx response, a timeout or other network error). Often this is bot protection. It is **not** evidence that the page is gone.
- `dead`: a 404 or 410 response, or the domain no longer resolves.
- `unchecked`: not yet checked. A record with no `status` has also not been checked.

Current results for the 743 records with an opt-out entry: 617 verified, 15 suspect, 74 blocked, 20 dead, 17 not yet checked. The check is automated and cannot fill in forms; a `verified` page can still fail to work.

### Link (`links.json`)

```json
{ "from": "kochava", "to": "collective-data-solutions", "type": "owns", "tier": "A",
  "claim": "The FTC's July 2024 second amended complaint in FTC v. Kochava alleges …",
  "sources": ["enf-ftc-kochava-sac-2024"], "published": true }
```

| Field | Meaning |
|---|---|
| `from`, `to` | Broker ids. |
| `type` | `owns` (from owns to), `supplies` (from provides data to to), `buys` (from buys data from to), `matches-identity` (from matches identities with to). |
| `tier` | `A`, `B` or `C`. |
| `claim` | One sentence, as narrow as the source allows. |
| `sources` | One or more ids in `sources.json`. |
| `published` | `true` for tier A links, unless review held the link back (see `build/link-overrides.json`). Never `true` for B or C. |

### Source (`sources.json`)

| Field | Meaning |
|---|---|
| `url` | The original document. |
| `archived` | A Wayback Machine copy (always `https://web.archive.org/…`). |
| `kind` | `registry`, `sec-10k`, `sec-8k`, `sec-20f`, `annual-report`, `ftc-complaint`, `ftc-order`, `cfpb-order`, `court`, `procurement`, `privacy-policy`, `press-release`, `journalism` or `other`. |
| `title` | What the document is. |
| `accessed` | The date we read it. |

## Reach and hubs

**Reach** is 1 plus the number of distinct records downstream of a broker along published links. `owns`, `supplies` and `matches-identity` point downstream from `from` to `to`. `buys` points the other way: if an agency buys from a vendor, the agency is downstream of the vendor. Each record is counted once, even when there are cycles. Size signals are not used. The code is `build/reach.js`.

**Hubs** are the 12 records with the highest reach, ties broken alphabetically by id, and only if their reach is above 1. For this release:

| Hub | Reach |
|---|---|
| TransUnion (`transunion`) | 18 |
| Experian plc (`experian`) | 16 |
| RELX PLC (`relx-plc`) | 14 |
| General Motors LLC (`general-motors`) | 11 |
| Equifax Inc. (`equifax`) | 9 |
| Experian Information Solutions, Inc (`experian-information-solutions`) | 7 |
| LexisNexis Risk Solutions Inc. (`lexisnexis-risk-solutions`) | 7 |
| TransUnion Risk and Alternative Data Solutions, Inc. (`transunion-risk-and-alternative-data-solutions`) | 7 |
| Avast (`avast`) | 6 |
| Babel Street, Inc. (`babel-street`) | 6 |
| West Publishing Corp (`west-publishing`) | 6 |
| Clearview AI, Inc. (`clearview-ai`) | 5 |

Clearview AI is the 12th hub because of the alphabetical tie-break: GoodRx, Jumpshot and Thomson Reuters Special Services also have reach 5.

Reading these numbers:

- Reach measures documented, published flows only. It is not market size or the amount of data held.
- For TransUnion, Experian, RELX and Equifax, most of the reach comes from documented ownership of subsidiaries. For the vendors in the lower half, it comes from government purchases.
- A company whose documented links are mainly inbound, or not yet published, ranks low. LiveRamp and Acxiom each have reach 1 here: the published links point into them (for example, Jumpshot supplied LiveRamp; Omnicom owns Acxiom), and Acxiom's outbound links are tier C and unpublished.

## How to rebuild

Everything is regenerated by scripts. Curation decisions live in config under `build/`, never in hand edits to the records:

- `build/id-map.json`: per family, a staged id to the canonical record it means.
- `build/alias-blocklist.json`: aliases removed from a record, each with a reason.
- `build/link-overrides.json`: links dropped, unpublished, moved to another entity or given a narrower claim, each with a reason.
- `build/record-overrides.json`: field corrections on a record, each with a source and reason.

From the repository root (Node.js; built with v22):

```sh
# 1. Start empty
rm -rf research/data-brokers/brokers
echo '{}' > research/data-brokers/sources.json
echo '[]' > research/data-brokers/links.json

# 2. Import the registries
npm run brokers:import -- CA research/data-brokers/sources/registries/ca-2026-10-18.csv 2026-10-18 https://web.archive.org/web/20260806041805/https://cppa.ca.gov/data_broker_registry/registry.csv
npm run brokers:import -- TX research/data-brokers/sources/registries/tx-2026-10-18.csv 2026-10-18 https://web.archive.org/web/20261019051305/https://texas-sos.appianportalsgov.com/data-broker-registry
npm run brokers:import -- OR research/data-brokers/sources/registries/or-2026-10-18.csv 2026-10-18 https://web.archive.org/web/20261019051000/https://www4.cbs.state.or.us/ex/shared/downtemp/dfcs_db_optout.csv

# 3. Check the registry opt-out URLs (the merge uses the result)
npm run brokers:check-urls

# 4. Merge the research, in this order (tier A families first)
for f in sec enforcement procurement policies journalism; do
  node research/data-brokers/build/merge-staging.js "$f"
done

# 5. Tie records to the game's missions
node research/data-brokers/build/map-missions.js

# 6. Check the opt-out URLs again, then validate and export
npm run brokers:check-urls
npm run brokers:validate
npm run brokers:export
```

`merge-staging.js <family> --dry-run` shows what a merge would change without writing. `brokers:validate` exits non-zero on any error and prints the counts. `brokers:export` writes `src/data/broker-map.json` and prints the hubs.

Steps 1, 2, 4 and 5 are deterministic. The URL checks are not: they depend on the day and on how each site treats automated requests, so `status` and `verifiedAt` will differ from ours. Because the merge replaces a registry opt-out URL marked `blocked` when research found one on the broker's own domain, a different step 3 result can also change which opt-out URL a record ends up with.

## Reporting an error

If a claim is wrong, a source doesn't say what we say it does, two records are the same company (or one record is two), or an opt-out route has changed, please [open an issue](https://github.com/lizTheDeveloper/privacy-the-game/issues) on this repository. Include the record or link ids and, if you can, a document that shows the correction. Corrections go into the config under `build/`, so they survive the next rebuild.
