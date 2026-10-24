# Staging notes: `membership` family

Accessed 2026-10-24. Two industry member lists, both `kind: member-list`. Both source broker records; only the DAA's backs a sweep in `build/sweeps.json`. Neither backs a link (README "Sweeps").

`lists/` holds each list as transcribed. `build/stage-membership.js` turns them, with the `membership` pins in `build/id-map.json`, into `brokers/` and `sources.json` here, and writes `build/sweeps.json`. Do not edit `brokers/` by hand.

## Sources

| Source | List | Members | Archived |
|---|---|---|---|
| `mem-nai-members-2026` | NAI Members, thenai.org/about-the-nai-2/members/ (thenai.org/members/ redirects there) | 75 | https://web.archive.org/web/20261024071604/https://thenai.org/about-the-nai-2/members/ |
| `mem-daa-webchoices-2026` | The DAA WebChoices tool's company list, files.aboutads.info/prod-companies.json, loaded by optout.aboutads.info | 99 | https://web.archive.org/web/20261024071700/https://files.aboutads.info/prod-companies.json |

I fetched both captures back in raw `id_` mode and checked them. The NAI capture is server-rendered HTML with all 75 member headings. The DAA capture is the JSON, with the same 99 names as the live file.

- **NAI: no sweep.** The members page renders every member in the HTML, one `<h3>` per member, with the member's website. The NAI's old opt-out tool (optout.networkadvertising.org) now redirects to thenai.org/how-to-opt-out/ (archived https://web.archive.org/web/20261024073031/https://thenai.org/how-to-opt-out/). That page offers:
  - a GPC browser extension for Chrome;
  - a page of links to each member's own opt-out ("How to Exercise Your Privacy Choices", same member list);
  - the DAA's tools.

  Nothing on the page opts you out of the members in one go. So `lists/nai.json` has no `sweep`: the list sources records only, and the game's `nai` checklist line lights and haloes nothing.
- **DAA.** optout.aboutads.info sits behind a Vercel bot check (HTTP 429 to curl) and is a JavaScript application. In a browser it loads two files:
  - `files.aboutads.info/prod-companies.json`: the companies the tool sends opt-outs to, with each one's opt-out endpoint. This is the source.
  - `cms-cache.aboutads.info/cms-participants.json` (archived https://web.archive.org/web/20261024073003/https://cms-cache.aboutads.info/cms-participants.json): each participant's description and `WebsiteURL`. `lists/daa.json` records each company's website from it (through its triggers' `daaParticipant` ids). The pins below use those websites.

  The DAA's public "participating companies" page (youradchoices.com/participating, and /participating-by-type) was **not** used. It calls itself "a partial list", and about a third of it is brand advertisers (Toyota, Bank of America, Abbott, Unilever…) that the tool does not opt you out of.

## Matching

By legal name: `legalKey(name)` against each existing record's `name`, the first record by filename winning, exactly as `merge-staging.js` does. Staged records carry no aliases, so the merge's alias rule never fires. Listings that share a key across the two lists become one record.

- **51 records matched by legal name.** I checked each by hand against the list's name and website; all are the same company:
  - 33across, adstra, alikeaudience, alphonso, arity, azira, beeswax, bombora, cadent, choreograph, claritas, clickagy, criteo
  - cuebiq, datonics, definitive-healthcare, demandbase, dstillery, google, healthlink-dimensions, illumin, index-exchange, kargo-global, liveintent, liveramp
  - loopme, magnite, merkle, nextroll, nexxen, pebblepost, place-exchange, pubmatic, pulsepoint, resonate, samba-tv, semasio, sharethrough
  - sojern, sovrn, stackadapt, taboola, tapad, throtle, triplelift, unacast, videoamp, wunderkind, yieldmo, zeta-global, ziff-davis
- **19 pins in `build/id-map.json` (`membership`), each with a reason.** Liz's rule (2026-10-19): a new record only for a listed company the registries don't list. So a listing is pinned only on a documented tie. There are five kinds:
  - **Registry DBA (6).** The CA registry snapshot (2026-10-18) lists the record with the list's brand in its "Doing Business As" column. Each was checked against the CSV row:
    - `adelphic` to `viant-us` (Viant US LLC, DBA "Adelphic LLC; Viant Technology LLC")
    - `audigent` to `predictive-pop` (DBA "Audigent")
    - `groundtruth` to `xad` (xAd, Inc., DBA "GroundTruth")
    - `inmarket` to `inmarket-media` (DBA "InMarket")
    - `perion` to `hivestack-technologies` (DBA "Perion")
    - `sharethis` to `predactiv` (DBA "ShareThis")
  - **Registry name (1).** `the-nielsen-marketing-cloud` goes to `nielsen-marketing-cloud`.
    - The VT registry (2026-10-19) lists "Nielsen Marketing Cloud" (https://www.nielsen.com/).
    - The CA registry gives "Nielsen Marketing Cloud" as the DBA of both "The Nielsen Company, LLC" and "eXelate, Inc." (www.nielsen.com).
    - The DAA's "The Nielsen Marketing Cloud" missed the legal-name match only because of the leading "The".
    - It is pinned to the record registered under that name, not to either CA entity.
  - **The list's own description (1).** `nielsen` goes to `nielsen-marketing-cloud`. The NAI directory's "Nielsen" entry (https://www.nielsen.com) begins "The Nielsen Marketing Cloud is the first and largest marketplace for privacy friendly targeting data". This listing was earlier collapsed into a new `nielsen` record (review I1).
  - **Suffix-only difference, same website (1, ruling T1-f).** `eyeota-2` goes to `eyeota-pte`. The CA registry lists "Eyeota Pte Ltd" (https://www.eyeota.com); both lists say "Eyeota" with eyeota.com.
    - The global SUFFIXES list is unchanged.
    - The same scan found no other case. `experian-2` ("Experian") is not pinned: Experian plc has no website in the dataset, and the DAA's Experian participant gives tapad.com.
  - **Tier A source on the record (1).** A tier A source (`TIER_A_SOURCE_KINDS`) already on the existing record must name the list's brand as that same company or as its former legal name. The pin's reason quotes the archived line.
    - `lotame` to `lotame-solutions`. Publicis's 2025 URD Note 3 says "in April 2025, 100% of Lotame Solutions, Inc., an independent specialist in data and digital identity solutions" and then calls it "Lotame" in its acquisitions table ("Cash consideration Lotame 122"). The record's archived copy of Note 3 (and of Note 36) is not in the Wayback Machine (see below), so the quote is from a fresh capture: https://web.archive.org/web/20261024073937/https://publicis-groupe.publispeak.com/2025-universal-registration-document/article/279/
  - **Same company on the same website (9).** The NAI directory's website and the DAA participants file's website are the same (or share a registrable domain, as the reason says):
    - onto a record that matched the other list by legal name: `kargo` to `kargo-global` (kargo.com), `wunderkind-formerly-bouncex` to `wunderkind` (wunderkind.co);
    - two listings collapsed into one new record: `adobe-marketing-cloud` to `adobe`, `amazon-ad-system` to `amazon-ads` (amazon.com), `mountain` to `mntn`, `catalina-buyervision` to `catalina` (catalina.com), `outbrain-direct-response-odr-by-teads` to `outbrain`, `beeswax-freewheel` to `freewheel`, `viant-specific-media-vindico` to `viant`.
- **67 new records:** `kind: ["ad-network"]`, `registries: {}`, `optOut: null`, unknown size, the list(s) as source.
- **127 records cite a list** (60 existing, 67 new); 47 are on both lists. The DAA sweep has 99 members.
- **REJECTED.json is empty:** the merge rejected nothing.
- **The merge's three warnings** (dun-and-bradstreet/dun-bradstreet, general-motors-company/general-motors, trans-union/transunion share a legal key) are about existing records and touch no listed company.

## Kept separate: no registry or tier A tie (for curators)

These new records look like a company already in the dataset, but the tie is only a brand, an alias that research added, a website or part of a name. No registry row names the brand, and no tier A source on the record ties the brand to that company. I read each tier A source on these records (archived text) on 2026-10-24. A curator can pin one in `build/id-map.json` (`"membership": { "<new id>": { "id": "<existing id>", "reason": "…" } }`) once a source ties the legal names.

| New record | List name | Existing record | Why it is not pinned |
|---|---|---|---|
| `epsilon` | Epsilon | `epsilon-data-management` | Registry rows have no DBA; the alias "Epsilon" came from the `policies` family. Its tier A sources are Publicis's URD. The activities section says Publicis acquired "Epsilon, a technology company specializing in data and marketing activities", and Note 36 lists "Epsilon Data Management LLC" among several Epsilon companies (Epsilon France SASU, Epsilon International UK Ltd.). Neither says the brand is this company |
| `experian-2` | Experian | `experian` (Experian plc) | Only Experian plc carries the alias "Experian", from research, not a registry; no registry row has DBA "Experian" |
| `facebook` | Facebook | `meta` (Meta Platforms) | `meta` has no registry row; the alias "Facebook" came from research. Its one tier A source, the FTC's GoodRx complaint (2023), says only "Facebook" and never "Meta" or "Facebook, Inc.", so it doesn't tie the brand to the record |
| `foursquare` | Foursquare | `foursquare-labs` | Registry DBA columns are empty; the alias came from research; no tier A source on the record (registries and journalism only) |
| `openx` | OpenX | `openx-technologies` | Registry DBA column is empty; the alias came from research; no tier A source on the record (CA registry and a senator's letter only) |
| `freewheel` | FreeWheel; Beeswax/FreeWheel | `freewheel-media` (FreeWheel Media Inc) | Brand only |
| `medianet` | Media.net | `medianet-advertising-fz` | Brand only |
| `outbrain` | Outbrain; Outbrain Direct Response (ODR) by Teads | `teads-holding` | outbrain.com |
| `swoop` | Swoop | `swoopcom` (Swoop.com Inc) | Brand only |
| `valassis` | Valassis | `valassis-communications`, `valassis-communications-inc-an-rrd` | Brand only |
| `veeva-crossix` | Veeva Crossix | `veeva-systems` | veeva.com |
| `viant` | Viant; Viant (Specific Media/Vindico) | `viant-us` | Brand, viantinc.com |
| `alliant` | Alliant | `alliant-cooperative-data-solutions` | Brand only |
| `catalina` | Catalina; Catalina BuyerVision | `catalina-marketing` | Brand, catalina.com |
| `digital-envoy-outlogic` | Digital Envoy/Outlogic | `outlogic` | outlogic.io |

Two pairs across the lists have different websites, so they stay two records each:
- `microsoft-advertising` (microsoftadvertising.com) and `microsoft` (microsoft.com);
- `life360-ads-featuring-nativo` (ads.life360.com) and `nativo` (nativo.com).

## Kind

`ad-network` follows the brief for every new record. Most are ad-tech firms. A few are platforms or publishers that run ad businesses and appear in the WebChoices tool: eBay, LinkedIn, Pinterest, Twitter, Microsoft, Yahoo, Facebook. No existing record had its `kind` changed, the pinned ones included.

## Archived copies refreshed in aed5136

`sec-publicis-urd-2025-note3` and `sec-publicis-urd-2025-note36` once cited Wayback captures that were never saved (no capture of article/279 or article/328 existed). Commit aed5136 replaced them, in `staging/sec/sources.json` and `sources.json`, with fresh captures checked to hold the cited text:
- https://web.archive.org/web/20261024073937/https://publicis-groupe.publispeak.com/2025-universal-registration-document/article/279/
- https://web.archive.org/web/20261024074000/https://publicis-groupe.publispeak.com/2025-universal-registration-document/article/328/

The Lotame pin quotes the first of these.
