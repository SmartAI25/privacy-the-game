# Procurement family — research notes (2026-10-18)

## Method

- Queried the USAspending.gov API `POST /api/v2/search/spending_by_award/` with `recipient_search_text` for each target vendor. The time window was 2007-10-01 to 2026-09-30, award types contracts (A–D) and IDVs. All pages were fetched.
- For each agency↔vendor pair, I picked one representative award whose description names a data product (subscription, database, data feed, credit reports, CLEAR, TLO, Accurint and similar). I then read the full award record from `GET /api/v2/awards/<generated_unique_award_id>/`.
- Each source `url` is the human-readable award page `https://www.usaspending.gov/award/<generated_unique_award_id>`. It shows the same record as the API endpoint, `https://api.usaspending.gov/api/v2/awards/<id>/`, which is what was actually read. The award pages are a JavaScript single-page app, so a Wayback capture may render only the shell. The API endpoint for the same id is the machine-checkable copy.
- Each claim quotes the award's description field as USAspending shows it. USAspending shows the description from the latest transaction. FPDS `IGF::..::IGF` tags were removed.
- Fiscal years are federal FYs, which start on Oct 1, computed from the period-of-performance start and end dates. Where an end date is in the future, it is the current or potential end of the period, not a completed delivery.
- Dollar figures are `total_obligation` on the award record at access time.

## Per-pair award counts (all award records to that recipient name from that sub-agency)

These counts are NOT filtered by product. The West Publishing totals include Westlaw legal research, Experian/Equifax include employee credit checks and identity-protection services, and IDVs can double count with their child orders. Treat them as context, not as "data purchases".

| buyer | vendor | award records | sum of award amounts (USD) | earliest start | latest end |
|---|---|---|---|---|---|
| us-ice | venntel | 6 | 330,000 | 2018-08-07 | 2021-09-10 |
| us-cbp | venntel | 1 | 20,000 | 2020-09-10 | 2021-09-09 |
| us-dea | venntel | 1 | 25,000 | 2018-04-11 | 2019-04-11 |
| us-usms | fog-data-science | 1 | 120,000 | 2018-09-21 | 2020-09-27 |
| us-socom | anomaly-six | 2 | 598,218 | 2020-09-18 | 2021-10-31 |
| us-ice | babel-street | 2 | 3,681,061 | 2019-09-05 | 2024-09-29 |
| us-usss | babel-street | 3 | 2,952,528 | 2015-09-28 | 2021-09-27 |
| us-usms | babel-street | 4 | 222,553 | 2016-06-29 | 2023-09-30 |
| us-dea | babel-street | 15 | 1,047,891 | 2017-09-25 | 2027-09-29 |
| us-fbi | babel-street | 4 | 48,800 | 2014-06-06 | 2014-10-31 |
| us-irs | babel-street | 1 | 19,340 | 2021-09-30 | 2021-10-29 |
| us-air-force | babel-street | 6 | 693,779 | 2015-08-11 | 2019-08-22 |
| us-army | babel-street | 3 | 494,803 | 2015-04-05 | 2020-09-21 |
| us-ice | thomson-reuters-special-services | 17 | 69,305,406 | 2015-09-28 | 2031-09-29 |
| us-cbp | thomson-reuters-special-services | 3 | 6,890,129 | 2015-09-28 | 2022-09-26 |
| us-fbi | thomson-reuters-special-services | 1 | 4,105,535 | 2026-09-16 | 2027-09-15 |
| us-army | thomson-reuters-special-services | 6 | 504,018 | 2020-01-17 | 2027-01-19 |
| us-ice | west-publishing | 28 | 48,841,907 | 2004-10-01 | 2027-08-31 |
| us-cbp | west-publishing | 16 | 4,151,419 | 2004-10-01 | 2023-08-31 |
| us-fbi | west-publishing | 12 | 69,205,215 | 2008-08-27 | 2023-03-31 |
| us-navy | west-publishing | 73 | 8,815,573 | 2004-03-08 | 2027-05-31 |
| us-dcsa | west-publishing | 8 | 2,851,714 | 2009-09-23 | 2027-08-31 |
| us-usms | west-publishing | 4 | 729,575 | 2019-09-30 | 2027-08-31 |
| us-ice | lexisnexis-risk-solutions | 2 | 27,444,424 | 2021-02-25 | 2027-02-28 |
| us-irs | lexisnexis-risk-solutions | 15 | 13,295,521 | 2017-06-01 | 2026-09-29 |
| us-usss | lexisnexis-risk-solutions | 3 | 1,443,679 | 2021-07-10 | 2026-10-31 |
| us-dea | lexisnexis-risk-solutions | 6 | 81,003 | 2019-10-19 | 2025-11-30 |
| us-army | lexisnexis-risk-solutions | 4 | 1,156,654 | 2018-03-22 | 2026-12-31 |
| us-air-force | lexisnexis-risk-solutions | 3 | 278,439 | 2016-12-29 | 2024-02-22 |
| us-navy | lexisnexis-risk-solutions | 7 | 1,479,878 | 2018-01-05 | 2026-01-01 |
| us-usss | transunion-risk-and-alternative-data-solutions | 8 | 591,700 | 2014-05-27 | 2027-01-22 |
| us-usms | transunion-risk-and-alternative-data-solutions | 10 | 21,232 | 2014-10-01 | 2019-09-30 |
| us-cbp | transunion-risk-and-alternative-data-solutions | 4 | 42,510 | 2014-10-01 | 2018-09-29 |
| us-dea | transunion-risk-and-alternative-data-solutions | 13 | 126,999 | 2017-09-22 | 2026-12-31 |
| us-ice | transunion-risk-and-alternative-data-solutions | 2 | 344,200 | 2020-09-01 | 2027-07-19 |
| us-air-force | transunion-risk-and-alternative-data-solutions | 1 | 39,900 | 2014-01-01 | 2016-12-31 |
| us-navy | transunion-risk-and-alternative-data-solutions | 10 | 83,483 | 2014-04-14 | 2023-09-27 |
| us-fbi | equifax-workforce-solutions | 9 | 160,989 | 2016-02-03 | 2025-07-17 |
| us-dcsa | equifax-workforce-solutions | 5 | 12,097,022 | 2019-10-01 | 2027-05-31 |
| us-irs | equifax-information-services | 27 | 14,939,738 | 2007-08-01 | 2020-08-12 |
| us-ice | equifax-information-services | 2 | 119,910 | 2007-05-30 | 2014-12-24 |
| us-fbi | experian-information-solutions | 6 | 8,249,566 | 2013-01-01 | 2027-09-25 |
| us-irs | experian-information-solutions | 28 | 7,352,531 | 2005-10-01 | 2027-07-31 |
| us-usms | experian-information-solutions | 26 | 137,082 | 2009-10-05 | 2027-06-26 |
| us-army | experian-information-solutions | 17 | 1,329,186 | 2009-09-30 | 2026-08-31 |
| us-navy | experian-information-solutions | 23 | 454,498 | 2008-09-30 | 2026-12-05 |
| us-dea | experian-information-solutions | 27 | 40,246 | 2011-11-01 | 2026-10-31 |
| us-ice | clearview-ai | 4 | 11,301,500 | 2020-08-12 | 2027-09-04 |
| us-fbi | clearview-ai | 3 | 527,000 | 2022-01-01 | 2027-07-27 |
| us-cbp | clearview-ai | 3 | 60,750 | 2025-06-25 | 2027-07-06 |
| us-usms | clearview-ai | 2 | 173,750 | 2024-02-22 | 2027-03-11 |
| us-irs | clearview-ai | 1 | 63,000 | 2026-03-16 | 2027-03-15 |
| us-army | clearview-ai | 6 | 142,200 | 2020-09-25 | 2026-03-19 |

Vendors searched with no in-scope awards: Anomaly Six (only 2 awards, both USSOCOM: H9227620P0070 recorded, plus H9225721P0091 "EXERCISE SME SUPPORT" for $8,718, not a data purchase). Pen-Link: see below.

## Judgement calls

- **Pen-Link: no links recorded.** 807 award rows exist (DEA 473, FBI 57, CBP 31, USSS 25, ICE 18, USMS 10, IRS 5, DHS OPO 3 for "Tangles" subscriptions, Army 21, Navy 2). The descriptions are software licences, telecommunications intercept or analysis software, or "wireless data collection system". None says the agency bought consumer data from Pen-Link, so a `buys` link is not supported. Lead: the DHS Office of Procurement Operations "TANGLES SUBSCRIPTION" awards 70RDA124P00000009, 70RDA125P00000010 and 70RDA126P00000005 (web/social intelligence). These could be reconsidered if the dataset decides OSINT platforms count.
- **Babel Street.** Only BABEL STREET, INC. awards were used. BABEL STREET ROSETTE LTD. (formerly Basis Technology) awards are language-identification, translation and Cyber Triage forensic software, so they were excluded. The procurement records describe Babel X and "open source" or social-media data subscriptions. None of the records I read names "Locate X" (location data). Lead: CBP and other Locate X purchases are reported in journalism, but I found no CBP award under the Babel Street recipient name.
- **Thomson Reuters.** CLEAR is sold under two recipient names, THOMSON REUTERS SPECIAL SERVICES LLC and WEST PUBLISHING CORPORATION, so these are two separate broker ids (`thomson-reuters-special-services`, `west-publishing`). `parent` is left unset; the SEC family should record the Thomson Reuters ownership. For West Publishing, only awards whose descriptions name CLEAR or a public-records or LPR database were used, not Westlaw. Other notable West Publishing awards:
  - ICE 70CDCR18P00000017, "ACCESS TO LICENSE PLATE READER DATABASE", 2017-12-22 to 2021-05-31, $7,391,976.
  - CBP HSBP1006F09525 and HSBP1006F09215, "AUTO TRACK SERVICES" (FY2006).
  - Navy N0018909FZ076, "CHOICEPOINT CLEAR ACCESS" (the recorded link).
  - USMS 15M10226PA4700366, "VIGILANT-CRIMETRACER" (the recorded link; Vigilant LPR data bought through West).
- **Thomson Reuters Special Services, Air Force.** The awards (DOPPLER, MASS EFFECT, ASED/LSD) are research contracts, not data subscriptions, so they were excluded. TRSS Navy/NCIS "risk management support services" and TRSS USMS "risk mitigation services" are too vague and were excluded.
- **LexisNexis.** Only LEXISNEXIS RISK SOLUTIONS INC awards were used. LEXISNEXIS RISK SOLUTIONS FL INC. FBI and ICE awards are Accuity banking and PEP databases, which are not consumer data, so they were excluded. Leads:
  - ICE 70CMSD26C00000009, a LEIDS follow-on from 2026-09-01.
  - IRS 2043FY26P00038, an interim asset and locator contract with the FL entity.
  - Defense Health Agency "Provider Data Masterfile" (healthcare provider data, not consumers).
  - USSS "ZETX" subscription 70US0921P70090088. ZetX is a LexisNexis cell-site and phone-records analysis tool.
- **Equifax.** The awards span three recipient names (EQUIFAX INFORMATION SERVICES LLC, EQUIFAX WORKFORCE SOLUTIONS LLC and EQUIFAX INC), so separate ids are used for the two whose awards are recorded. Many Equifax and Experian awards are personnel suitability credit checks or employee identity-theft protection. These were used only where nothing more on-point existed (ICE↔Equifax Information Services is pre-employment credit inquiries, and the claim says so). Leads:
  - IRS EQUIFAX INC 2023H225P00192, "EQUIFAX SERVICES ... LAW ENFORCEMENT SENSITIVE PROCUREMENT" (2025-2027).
  - ICE EQUIFAX INC 70CMSD23P00000133 and 70CMSD20P00000187, "EQUIFAX SUPPORT SERVICES". Their purpose is not stated, so they were not used.
  - ICE↔Experian 70CMSD23P00000139, "EXPERIAN SUPPORT SERVICES", purpose not stated. No ICE↔Experian link was recorded.
  - DMDC Military Lending Act data-exchange orders with Equifax and Experian.
- **Clearview AI.** Included, on the reading that Clearview sells search access to a database of facial images scraped from the public internet. The FBI award text says "search engine of publicly available images on the internet". Air Force awards FA864920P0024 and FA864922P0422 are R&D (AR facial-recognition glasses), so they were excluded. The merge step may drop Clearview if it decides biometric search falls outside "consumer data".
- **Anomaly Six.** USSOCOM H9227620P0070, "COMMERCIAL TELEMETRY FEED" (SOCAFRICA contracting office). The record does not say location data. The claim quotes only the description.
- **Fog Data Science.** One award only: USMS 15M10318PA4100281, "2018 TOG FOG DATA LES". The record does not describe the product further.
- **Venntel.** Lead: an EPA award 68HE0B24P0493, "ON DEMAND ACCESS TO AGGREGATED HUMAN MOBILITY DATA" (2024). EPA is outside this family's buyer scope, so it was not recorded.
- **Vendor `kind`.** Not set. Procurement records state what was bought but not the vendor's business category, so other families should supply it.
- **Buyer `parent`.** Not set (e.g., us-ice→us-dhs) to avoid adding department nodes without links. The award records do show the toptier agencies: DHS for ICE, CBP and USSS; DOJ for FBI, DEA and USMS; Treasury for IRS; DoD for SOCOM, DCSA, Army, Navy and Air Force.
- **Marine Corps.** M6700117P1192 (TransUnion) is a Marine Corps contracting office (M67001) that USAspending files under Department of the Navy. The link uses `us-navy` as recorded.

## Not found / could not confirm

- No CBP, ICE or FBI awards to "Babel Street" mentioning Locate X.
- No awards found under "Clearview" outside the agencies listed.
- Not checked in this pass: SAM.gov and FPDS directly, state and local procurement, grant-funded purchases (e.g., HIDTA purchases appear under DEA), and GSA schedule BPA ceilings.

## Archive status

52/53 sources have Wayback captures (existing captures found by availability/CDX lookups, or new saves). This 1 source has `"archived": null` because web.archive.org/save returned HTTP 429/520 or refused connections on 2026-10-18 (rate-limited). Re-run a save on each `url` before merge:

- proc-usasp-15m10224pa4700107 — https://www.usaspending.gov/award/CONT_AWD_15M10224PA4700107_1544_-NONE-_-NONE-
