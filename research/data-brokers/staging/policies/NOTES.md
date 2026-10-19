# Staging notes: `policies` family

Accessed 2026-10-18. Every source here is the broker's own page (privacy policy, opt-out page, site footer or corporate page), so every link is **tier B**. Opt-out URLs were checked by HTTP fetch on 2026-10-18. Where the live site blocked automated fetches (HTTP 403 or a bot check), the content was read from the most recent Wayback capture instead. The broker's `optOut.notes` says when that happened.

## What the policies do and don't say

Almost no privacy policy names the companies it buys from or sells to. LiveRamp, Acxiom, Epsilon, Experian Marketing Solutions, Data Axle, Thomson Reuters (CLEAR), Cotality, Azira, Gravy/Unacast, Venntel, SafeGraph, Placer.ai, Sift, Whitepages, MyLife, Spokeo and the people-search sites all describe their sources only by category: "data suppliers", "data brokers", "data licensors", "app partners", "public records", "consumer reporting agencies". Those descriptions are recorded in each broker's `sells`, and none of them became a link.

That leaves only **ownership** links, drawn from the companies' own statements about subsidiaries, parents or brands.

Two policies say they will name recipients, but only on request:
- LiveRamp says it gives "a list of third parties to which it has disclosed any consumer's personal information" in response to an access request. **Lead:** a real access request would return a named recipient list, worth doing for the hub.
- Cotality's policy lists a right to "a list of third parties to which we have disclosed personal data". Same lead.

## Notable findings

- **Radaris: the domain was seized.** radaris.com/control/privacy now shows Atlas Data Privacy Corp.'s notice that the domain was "transferred by Court Order". It cites Atlas Data Privacy Corporation et al. v. Radaris.com et al., NJ Super. Ct. Middlesex County, MID-L-000847-24, and a final default judgment entered Aug 27, 2026 under Daniel's Law, against Radaris.com, Rehold.com and Trustoria.com. Its `optOut` is recorded as `none`. **Lead for the enforcement/court family:** get the judgment itself (tier A). The mission's Radaris opt-out step is dead.
- **Oracle Advertising shut down.** Oracle's EOL FAQ (v3.0, Aug 12 2024) says all Oracle Advertising products were end-of-lifed effective Sept 30, 2024: the DMP, Data Append, Digital Audiences incl. OnRamp, Offline Targeting, Moat and Cross-Device. Its `optOut` is recorded as `none`.
- **Lotame is owned by Publicis, not Epsilon.** Lotame's own article says it was acquired by Publicis Groupe. Epsilon is also a Publicis company, but nothing I read on epsilon.com says so, so that link is not recorded. **Lead:** use the Publicis annual report (tier A/B) for both.
- **Gravy Analytics and Unacast are one entity.** Unacast's privacy policy names the entity as "Gravy Analytics, Inc. dba 'Unacast'", and gravyanalytics.com now serves Unacast's site and policy. Recorded as an alias, not a link.
- **Venntel:** its privacy policy uses the same template as Gravy/Unacast's but names no parent. No Gravy→Venntel link is recorded from this family. **Lead:** the FTC Gravy/Venntel complaint and order (tier A) state the relationship.
- **Acxiom:** acxiom.com calls Acxiom "the connected data and identity foundation for Omnicom (OMC)", and its opt-out form is hosted on `omnicom-privacy.my.onetrust.com`. That suggests Omnicom ownership but isn't an explicit statement, so no link was recorded. **Lead:** Omnicom 10-K (tier A).
- **Near Intelligence → Azira:** nothing on azira.com that I could read states the relationship. Third-party sites say Azira took over Near's business in the Dec 2023 Chapter 11. **Lead:** the bankruptcy court docket (D. Del., Near Intelligence Inc., Dec 2023), tier A. No Near record is created.
- **Outlogic (X-Mode):** outlogic.io is live and still markets "premium location data" from "local publisher partners", but no opt-out or privacy link appears on the home page. No `optOut` is recorded. The mission says its opt-out page no longer works. The alias "X-Mode Social" comes from the FTC matter (enforcement family), not from this site.
- **Shared people-search template.** FastPeopleSearch, SmartBackgroundChecks, SearchPeopleFree, Spy Dialer and AdvancedBackgroundChecks use near-identical privacy-policy text ("Data Products", section 2.3 "Personal Information Collected from Other Sources") and near-identical opt-out flows (email + CAPTCHA + emailed link). This suggests a common operator, but none of them names one. The only named operator is Spy Labs Adco, LLC for Spy Dialer. No links are recorded. **Lead:** state registry filings (CA/VT/TX/OR) may list a shared parent.
- **QuickLocate LLC** (Mechanicsville, VA) appears as the operator in the footers of both Quick People Trace and USATrace. Recorded as two `owns` links.
- **PeopleFinder.com** links its privacy policy and privacy center to intelius.com. That suggests a PeopleConnect relationship but isn't stated, so no link was recorded. Its `/optout` path returns 404. Not to be confused with PeopleFinders.com.
- **ZabaSearch:** no first-party statement found tying it to Intelius/PeopleConnect, and zabasearch.com blocks automated fetches. Third-party guides say it redirects to Intelius. No record is created.
- **AnyWho:** anywho.com/optout redirects to Spokeo's opt-out. A redirect is not a statement of ownership, so no link was recorded.

## Opt-out URLs that changed or could not be confirmed

| Broker | Mission URL | Status 2026-10-18 |
|---|---|---|
| Radaris | radaris.com/control/privacy | Domain seized; court-transfer notice. |
| FindPeopleSearch | findpeoplesearch.com/opt-out | Redirects to `/lander` (looks parked); no Wayback captures of /opt-out. No record created. |
| PrivateEye | privateeye.com/static/view/optout | Redirects to privateeye.com/removal, which shows only the search home page ("routes you through secure, verified partner links"); no removal form found. No record created. |
| AdvancedBackgroundChecks | advancedbackgroundchecks.com/removal | Live 404; the site is now a blog. Wayback 2026-01-08 shows the old opt-out form. Record created without `optOut`. |
| TruePeopleSearch | truepeoplesearch.com/removal | Live 403; latest readable Wayback capture is 2024-03-28, so the route may be stale. |
| BeenVerified | beenverified.com/faq/opt-out/ | Redirects to /svc/optout/search/optouts; live 403; Wayback is a JS shell. Contents not confirmed. |
| Whitepages, MyLife, FastPeopleSearch, TransUnion, ThatsThem, PeopleWhiz | (same) | Live 403 or bot check; confirmed from 2025–2026 Wayback captures. |
| Equifax | myprivacy.equifax.com/opt-in-opt-out/personal-info | 200 but a JS app; contents not readable. |
| PeopleConnect | suppression.peopleconnect.us/login | 200, JS app (title only); which brands it covers isn't confirmed first-party. |
| Lotame | (mission) lotames-products-services-privacy-policy | Redirects to lotame.com/privacy/?tab=2; the opt-out info is at /privacy/information-privacy-choices-services; lotame-optout.com returned 403. |
| CoreLogic | corelogic.com/privacy/ | Redirects to cotality.com/privacy, which returned 404. Policy is at cotality.com/legal/privacy. |
| Innovis | (no opt-out in mission) | Prescreen opt-out goes to optoutprescreen.com; Innovis says it does no DTC marketing. |
| Kochava | – | Device-level instructions only, plus privacy@kochava.com. |
| Placer.ai | placer.ai/privacy-policy | The policy index; the consumer policy is at /privacy-policy/consumer-privacy-policy. Email only; the footer "Do not sell" link is `#`. |
| Nuwber, ClustrMaps | nuwber.com/removal/link, clustrmaps.com/bl/opt-out | Connection failed (no HTTP response), matching the mission's note. No records created. |
| AdvancedPeopleSearch | advancedpeoplesearch.com | Redirects to an ad-feed parking domain, matching the mission's note. No record created. |
| Quick People Trace, USATrace | /optout | 404; no opt-out link found on the home pages. |
| Verisk | – | Only the privacy-policies index was found; no consumer request URL located. No `optOut` recorded. |
| Experian (opt-out-targeted-advertising page) | – | Fetched and read with HTTP 200 earlier the same day; a later re-check returned 403. |

## Mission brokers added beyond the brief's list
PeopleWhiz, AdvancedBackgroundChecks, Quick People Trace, USATrace (+ QuickLocate), RocketReach, Verisk. Nuwber, ClustrMaps, AdvancedPeopleSearch, PeopleFinder and ZabaSearch appear only in these notes.

## Archiving
Sources were archived with an existing 2026 Wayback capture where one was found, and a Save Page Now request otherwise. Every source has an `archived` URL; none are null. Save Page Now failed for three live-blocked pages, so their `archived` field points to the older capture I actually read instead:
- pol-beenverified-optout: 2025-05-09 (a JS shell)
- pol-fastpeoplesearch-removal: 2025-07-01
- pol-truepeoplesearch-removal: 2024-03-28 (stale; the live page blocks bots)

pol-cotality-product-privacy was archived fresh (20261019052832). PeopleFinder.com's home page was read but isn't cited by any record, so it is not in sources.json (URL https://www.peoplefinder.com/).
