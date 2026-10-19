# Journalism family: notes (2026-10-18)

All 27 links are tier C. Every source was opened and read, and every one has an existing Wayback capture found through the CDX API. No source has `archived: null`.

## Sources with kind "other"
- `jour-wyden-markey-auto-letter-2024` and `jour-wyden-near-letter-2024` are congressional letters, recorded as kind "other" and tier C as instructed. The letters relay what company staff told Wyden's office (Honda and Hyundai figures; Near's CPO and attorney). They do not quote a regulator. "other" is not in the brief's source-kind enum, so the merge step needs to accept it or remap it.

## Caveats carried in the claims
- **Venntel → Fog:** EFF says "we don't know for sure". The link rests on circumstantial records.
- **X-Mode → Sierra Nevada and X-Mode → STR:** the basis is archived X-Mode customer pages. X-Mode said it does not (currently) work with either.
- **Life360 → SafeGraph:** Life360's CEO declined to confirm it.
- **Predicio → Gravy:** based on Gravy documents obtained by NRK.
- **Complementics → Gravy:** based on Gravy's GDPR access response.
- **Xandr suppliers:** the file is dated May 2021, so the segments may no longer be in use.
- **Equifax/NCTUE source:** this is Washington Post reporting (Drew Harwell), read through the Boston Globe syndication. The WaPo originals returned 403, and the Wayback copy of the Feb. 26, 2021 WaPo article had no body text.
- **Datalogix:** `parent: "oracle"` is set because ProPublica calls it "Oracle's Datalogix". There is no `owns` link, because the acquisition belongs in SEC or press-release sources.

## Possible overlap with tier-A families (merge should dedupe)
- **Life360 → Arity:** the Texas AG suit against Allstate/Arity (Jan 2025) may name Life360.
- **Zumigo → Microbilt:** the FCC 2024 forfeiture orders against T-Mobile may name Microbilt. T-Mobile → Zumigo was not recorded, because the FCC orders cover it.
- **GM → Verisk/LexisNexis:** deliberately not recorded (FTC GM order). The Wyden letter also covers GM.
- **Gravy owns Venntel:** not recorded (FTC order).
- **Babel Street Locate X → USSOCOM:** not recorded. The Vice piece cites procurement records, which belongs to the procurement family.
- **Near owns UberMedia:** acquired April 2021 per the Wyden letter. Not recorded. Use SEC filings from Near's SPAC.

## Leads not recorded (could not open, or no supplier named)
- WaPo Feb. 26, 2021 "ICE investigators used a private utility database..." (403; the archive copy has no body text).
- AP, Sept. 2022, "Tech tool offers police 'mass surveillance on a budget'": per secondary coverage, it says Fog calls Venntel its "data partner". apnews.com is blocked here, and the KUTV reprint omitted that passage.
- EFF records show Fog license agreements with the Missouri State Highway Patrol and an exchange with Iowa DPS. These are state buyers, not recorded because ids for state agencies are not set yet.
- NRK, Dec. 2020: Sygic said it shared data with Complementics (and Predicio?). Not confirmed in what I read.
- WSJ, Oct. 2023 (Near → defense contractors → DoD/IC); WSJ, May 2023 (Veritas/Near); WSJ, 2020 (Anomaly Six SDK): all paywalled, no supplier named.
- NYT, Kashmir Hill, March 2024: Kia, Mitsubishi and Acura coaching programs share with LexisNexis or Verisk (per KBB summary). The NYT article was not opened.
- 404 Media, Jan. 2025: the Gravy Analytics breach lists apps whose data appeared. The data was bidstream-derived, so "supplies" may be wrong. Needs careful framing.
- No journalism found naming suppliers to LiveRamp, Epsilon, TransUnion, LexisNexis (beyond automakers), Kochava, or Babel Street.
