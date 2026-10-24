# Staging notes: `membership` family

Accessed 2026-10-24. Two industry member lists, both `kind: member-list`. They source broker records and the two sweeps in `build/sweeps.json`; they back no link (README "Sweeps").

`lists/` holds each list as transcribed. `build/stage-membership.js` turns them into `brokers/` and `sources.json` here, and writes `build/sweeps.json`. Do not edit `brokers/` by hand.

## Sources

| Source | List | Members | Archived |
|---|---|---|---|
| `mem-nai-members-2026` | NAI Members, thenai.org/about-the-nai-2/members/ (thenai.org/members/ redirects there) | 75 | https://web.archive.org/web/20261024071604/https://thenai.org/about-the-nai-2/members/ |
| `mem-daa-webchoices-2026` | The DAA WebChoices tool's company list, files.aboutads.info/prod-companies.json, loaded by optout.aboutads.info | 99 | https://web.archive.org/web/20261024071700/https://files.aboutads.info/prod-companies.json |

Both captures were fetched back (`id_` raw mode) and checked: the NAI capture is server-rendered HTML with all 75 member headings, and the DAA capture is the JSON with the same 99 names as the live file.

- **NAI.** The members page renders every member in the HTML (`<h3>` per member, with the member's website). The NAI's old opt-out tool (optout.networkadvertising.org) now redirects to thenai.org/how-to-opt-out/, which offers a GPC browser extension, a page of links to each member's own opt-out ("How to Exercise Your Privacy Choices", same member list) and the DAA's tools.
- **DAA.** optout.aboutads.info sits behind a Vercel bot check (HTTP 429 to curl) and is a JavaScript application. In a browser it loads `files.aboutads.info/prod-companies.json` (the companies the tool sends opt-outs to, with each company's opt-out endpoint) and `cms-cache.aboutads.info/cms-participants.json` (descriptions). The source is the first. The DAA's public "participating companies" page (youradchoices.com/participating, and /participating-by-type) was **not** used: it calls itself "a partial list", and about a third of it is brand advertisers (Toyota, Bank of America, Abbott, Unilever…) that are not opt-out targets of the tool.

## Matching

Matched only by legal name: `legalKey(name)` against each existing record's `name`, first record by filename winning, exactly as `merge-staging.js` does. The lists give mostly brand names, so this is strict on purpose. Staged records carry no aliases, so the merge's alias rule never fires. Names that appear on both lists under the same key become one record (37 companies).

- 51 existing records matched (MATCHES.json: all `matchedBy: id`, because the staging script stages a matched member under the record's id). Each was checked by hand against the list's name and website; all are the same company: 33across, adstra, alikeaudience, alphonso, arity, azira, beeswax, bombora, cadent, choreograph, claritas, clickagy, criteo, cuebiq, datonics, definitive-healthcare, demandbase, dstillery, google, healthlink-dimensions, illumin, index-exchange, kargo-global, liveintent, liveramp, loopme, magnite, merkle, nextroll, nexxen, pebblepost, place-exchange, pubmatic, pulsepoint, resonate, samba-tv, semasio, sharethrough, sojern, sovrn, stackadapt, taboola, tapad, throtle, triplelift, unacast, videoamp, wunderkind, yieldmo, zeta-global, ziff-davis.
- 86 new records, `kind: ["ad-network"]`, `registries: {}`, `optOut: null`, unknown size, the list(s) as source.
- REJECTED.json is empty: the merge rejected nothing.
- The merge's three warnings (dun-and-bradstreet/dun-bradstreet, general-motors-company/general-motors, trans-union/transunion share a legal key) are about existing records and touch no listed company.

## Brand-only near matches (kept separate)

These new records look like a company already in the dataset, but share only a brand, DBA, website or part of a name with it, so they were **not** merged. A curator can pin one in `build/id-map.json` (`"membership": { "<new id>": "<existing id>" }`) once a source ties the legal names.

| New record | List name | Existing record | What they share |
|---|---|---|---|
| `adelphic` | Adelphic | `viant-us` (Viant US LLC) | DBA "Adelphic LLC" |
| `audigent` | AuDigent | `predictive-pop` (Predictive Pop, Inc.) | DBA "Audigent" |
| `epsilon` | Epsilon | `epsilon-data-management` | DBA "Epsilon" |
| `experian-2` | Experian | `experian` (Experian plc), and the Experian subsidiaries | alias "Experian" |
| `eyeota-2` | Eyeota | `eyeota` (Eyeota Holdings Pte. Ltd.), `eyeota-pte` (Eyeota Pte Ltd) | brand |
| `facebook` | Facebook | `meta` (Meta Platforms) | alias "Facebook" |
| `foursquare` | Foursquare | `foursquare-labs` | DBA "Foursquare" |
| `freewheel`, `beeswax-freewheel` | FreeWheel; Beeswax/FreeWheel | `freewheel-media` (FreeWheel Media Inc), `beeswax` | brand |
| `groundtruth` | GroundTruth | `xad` (xAd, Inc.) | DBA "GroundTruth" |
| `inmarket` | InMarket | `inmarket-media` | DBA "InMarket" |
| `kargo` | Kargo | `kargo-global` (matched the DAA's "Kargo Global") | brand |
| `lotame` | Lotame | `lotame-solutions` | DBA "Lotame" |
| `medianet` | Media.net | `medianet-advertising-fz` | brand |
| `nielsen`, `the-nielsen-marketing-cloud` | Nielsen; The Nielsen Marketing Cloud | `nielsen-marketing-cloud`, `the-nielsen`, `exelate` | brand, nielsen.com |
| `openx` | OpenX | `openx-technologies` | DBA "OpenX" |
| `outbrain`, `outbrain-direct-response-odr-by-teads` | Outbrain; Outbrain Direct Response (ODR) by Teads | `teads-holding` | outbrain.com |
| `perion` | Perion | `hivestack-technologies` | DBA "Perion" |
| `sharethis` | ShareThis | `predactiv` | DBA "ShareThis" |
| `swoop` | Swoop | `swoopcom` (Swoop.com Inc) | brand |
| `valassis` | Valassis | `valassis-communications`, `valassis-communications-inc-an-rrd` | brand |
| `veeva-crossix` | Veeva Crossix | `veeva-systems` | veeva.com |
| `viant`, `viant-specific-media-vindico` | Viant; Viant (Specific Media/Vindico) | `viant-us` | brand |
| `wunderkind-formerly-bouncex` | Wunderkind (formerly BounceX) | `wunderkind` (matched the NAI's "Wunderkind") | brand |
| `alliant` | Alliant | `alliant-cooperative-data-solutions` | brand |
| `catalina`, `catalina-buyervision` | Catalina; Catalina BuyerVision | `catalina-marketing` | brand, catalina.com |
| `digital-envoy-outlogic` | Digital Envoy/Outlogic | `outlogic` | outlogic.io |

The two lists also name one company two ways, each becoming its own record: `adobe` / `adobe-marketing-cloud`, `amazon-ads` / `amazon-ad-system`, `microsoft-advertising` / `microsoft`, `mountain` / `mntn`, `life360-ads-featuring-nativo` / `nativo`.

## Kind

`ad-network` follows the brief for every new record. Most are ad-tech firms. A few are platforms or publishers that run ad businesses and appear in the WebChoices tool: eBay, LinkedIn, Pinterest, Twitter, Microsoft, Yahoo, Facebook. None of the matched existing records had its `kind` changed.
