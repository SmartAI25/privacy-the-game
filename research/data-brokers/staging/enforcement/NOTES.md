# Enforcement family: notes

Researcher: enforcement family (FTC/CFPB). Accessed 2026-10-18. All links are tier A and cite FTC, CFPB or court documents that were downloaded and read in full text (pdftotext). Source ids are prefixed `enf-`.

## Method
- I found case pages and PDF URLs through ftc.gov press releases and case pages, and the CFPB enforcement page for TransUnion Rental Screening.
- I got the PDFs from ftc.gov (via WebFetch, then pdftotext) and from Wayback raw captures. CFPB files came straight from files.consumerfinance.gov.
- I took archive URLs from the Wayback availability API. Each `archived` value is an existing capture.
- Each claim cites the final complaint where one exists, and the order where it supports the settlement wording. Every settlement order checked (X-Mode, GM, Avast, TURSS, plus Kochava's stipulated order) says defendants "neither admit nor deny" the allegations.

## Cases covered
| Case | Documents read | Links recorded |
|---|---|---|
| FTC v. Kochava (D. Idaho 2:22-cv-377) | 2022 complaint, 2024 second amended complaint, stipulated order dated 2026-06-25 | kochava owns collective-data-solutions |
| X-Mode Social / Outlogic (C-4802, 2024) | final complaint and D&O, 2024-04-11 | digital-envoy owns outlogic; x-mode-social supplies outlogic (asset transfer) |
| InMarket Media (C-4803, 2024) | final complaint, D&O issued 2024-04-29 | none (the complaint names no buyers or suppliers, only "brands and advertising agencies") |
| Gravy Analytics / Venntel (212-3035) | Dec 2024 complaint, final package (D&O issued 2025-01-13) | gravy owns venntel; gravy supplies venntel |
| Mobilewalla (C-4811) | final complaint and D&O, 2025-01-13 | none (no named buyers or suppliers; the complaint says "RTB exchanges" and "data brokers" generically) |
| GM / OnStar (C-4828) | final complaint and D&O, 2026-01-13 | GM owns OnStar; GM supplies Verisk (ISO), LexisNexis Risk Solutions, Wejo, Jacobs Engineering |
| Avast / Jumpshot (202-3033) | Feb 2024 complaint, final package (D&O issued 2024-06-26, $16.5M) | avast owns and supplies jumpshot; jumpshot supplies liveramp, lotame, omnicom; jumpshot matches-identity liveramp; omnicom matches-identity neustar |
| FTC v. Instant Checkmate / TruthFinder (S.D. Cal. 23-cv-1674) | complaint; signed stipulated order 2023-10-11 ($5.8M) | pubrec owns truthfinder and instant-checkmate |
| CFPB & FTC v. TransUnion Rental Screening (D. Colo. 1:23-cv-02659) | complaint 2023-10-12; stipulated judgment so ordered 2023-10-18 | trans-union owns TURSS; TURSS buys from LexisNexis Risk and Information Analytics Group |
| US v. Spokeo (C.D. Cal. 2:12-cv-05001, 2012) | complaint and consent decree ($800K) | none (the complaint lists only generic sources, "social networking sites, data brokers", and buyers by industry: HR, background screening, recruiting) |
| FTC v. Sitesearch Corp. d/b/a LeapLab (D. Ariz., 2014) | complaint | leaplab supplies ideal-financial-solutions |
| FTC v. Sequoia One (D. Nev. 2:15-cv-01512, 2015) | complaint | sequoia-one supplies ideal-financial-solutions |
| US v. GoodRx (N.D. Cal. 3:23-cv-00460, 2023) | complaint | goodrx supplies meta (the complaint says "Facebook"), google, criteo, twilio |

## Judgment calls for the merge step
- **verisk**: the GM complaint names "Insurance Services Office, Inc., doing business as Verisk Analytics". I used id `verisk` with ISO as an alias. Merge with the SEC family's Verisk record if one exists, and check whether ISO should be a subsidiary record.
- **lexisnexis-risk-solutions** (GM case) and **lexisnexis-risk-and-information-analytics-group** (TURSS case) are separate legal entities as named. I did not guess a parent; RELX ownership needs an SEC/annual-report source.
- **trans-union** is "Trans Union LLC", as named in the CFPB complaint. Its relation to TransUnion (NYSE: TRU) is not stated in these documents.
- **meta**: the GoodRx complaint says "Facebook" throughout. The id is `meta` with alias "Facebook". The claim text keeps "Facebook".
- **general-motors** is General Motors Company. GM LLC and GM Holdings LLC are aliases, since the complaint treats them as a common enterprise. Only OnStar has a separate record.
- **digital-envoy**, **jacobs-engineering-group**, **pubrec** and **twilio** have no `kind`, because the documents don't support a category.
- Size signals are only quantities the documents state (Kochava, X-Mode, InMarket, Mobilewalla, Jumpshot). Nothing is estimated.

## Not recorded (leads)
- **Kochava and the AWS Marketplace.** The complaints say Kochava's data feed and a free data sample were available through the AWS Marketplace until about June 2022. AWS was a distribution channel, not a buyer, so I recorded no link. It could become a `supplies` link if the dataset decides to treat marketplaces that way.
- **GoodRx "Branch".** The complaint says only "Branch", so the entity can't be identified precisely (probably Branch Metrics). Not recorded.
- **GoodRx stipulated order**: not read, so the settlement wording is not in the claims.
- **Venntel's government customers**: the FTC complaint says only "public sector customers, such as government contractors". No agency is named, so there are no gov't buyer links. Procurement records (USAspending: DHS, CBP, ICE, FBI and others) are the place to look; that is the procurement family's job.
- **X-Mode** sold to "private government contractors" for "national security purposes" (per the complaint), unnamed. Same lead.
- **Not pursued, out of scope or no named data flow:** CFPB v. Experian Information Solutions (C.D. Cal. 8:25-cv-00024, filed 2025-01-07; dispute reinvestigation), CFPB 2017 Experian consent order (credit-score marketing), FTC v. Instant Checkmate 2014 (FCRA; cited inside the 2023 TruthFinder complaint).
- **Possible later additions** (FTC complaints naming data recipients): BetterHelp 2023 (Facebook, Snapchat, Criteo, Pinterest), Premom/Easy Healthcare 2023, Cerebral 2024, Monument 2024, FTC v. RealPage 2018, AppFolio 2020 (tenant screening, FCRA), and Accusearch 2006 (phone records).
- **Unarchived sources**: see the "Archiving" section below.

## Archiving
All 24 sources have a Wayback capture. Two needed extra steps:
- `enf-cfpb-turss-order-2023`: no capture existed, so I requested one through /save/. The resulting capture is 20261019051259.
- `enf-ftc-avast-complaint-2024`: the availability API returned nothing and /save/ returned HTTP 520. I found a 2024-02-22 capture (status 200) through the CDX API and used it.

Captures were not opened and re-read one by one. The text was read from the ftc.gov or consumerfinance.gov originals, and some files from the Wayback raw (id_) copies.

- Erratum (merge), 2026-10-18: General Motors Company is not a C-4828 respondent. The respondents are General Motors LLC, General Motors Holdings LLC and OnStar, LLC (complaint caption and paras 1-3). The supplies links (to Insurance Services Office, LexisNexis Risk Solutions, Wejo and Jacobs) sit on `general-motors` (GM LLC); `general-motors-company` keeps only `owns -> onstar`.
