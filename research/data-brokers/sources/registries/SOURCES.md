# State data broker registry snapshots

Each file here is an official state registry, saved on the date in its name. `build/import-registry.js` turns them into `brokers/*.json`:

```
npm run brokers:import -- <CA|TX|OR> research/data-brokers/sources/registries/<state>-<date>.csv <date> [waybackUrl]
```

Every broker found in a snapshot gets the source id `registry-<state>-<date>` (see `sources.json`).

| State | Snapshot | Rows | Brokers listing it |
|---|---|---|---|
| CA | `ca-2026-10-18.csv` | 603 | 603 |
| TX | `tx-2026-10-18.csv` (from `tx-2026-10-18.xlsx`) | 451 | 437 |
| OR | `or-2026-10-18.csv` | 391 | 387 |
| VT | not obtained (see below) | – | – |

Deduped total across the three registries: **735 brokers**. Pairs that share only a DBA or brand are kept apart and listed in `MERGE-CANDIDATES.md` (generated on every import).

## California (CPPA)

- Page: https://cppa.ca.gov/data_broker_registry/ ("2026 California Data Broker Registry", last updated 7/29/2026). This covers brokers that operated in 2025 and registered in January 2026.
- Download: https://cppa.ca.gov/data_broker_registry/registry.csv (the "Download Registration Information" button). Saved unchanged, including its UTF-8 BOM.
- Wayback: https://web.archive.org/web/20260806041805/https://cppa.ca.gov/data_broker_registry/registry.csv. The Wayback digest (SHA-1, base32 `WEOORX64OOEDI56V2DZQHXCOS6TPS6OK`) matches our file byte for byte. The server's `Last-Modified` is 29 Jul 2026, so the file has not changed since that capture.
- Accessed: 2026-10-18.
- Older years are on the same page (`registry2024.csv`, `registry2025.csv`, and `complete-reg-data-brokers.csv` for 2020–2023) and are not imported.
- Notes: the opt-out column is "…primary website that contains details on how consumers can exercise their CA Consumer Privacy rights". Many brokers list several URLs separated by `; `; the import takes the first. The "primary contact email" is a general contact, not an opt-out route, so it is not used. Yes/no flags: precise geolocation maps to `location` and reproductive health care data maps to `health`. No other column maps onto a kind without guessing.

## Texas (Secretary of State)

- Page: https://www.sos.texas.gov/statdoc/data-brokers.shtml links to the registry at https://texas-sos.appianportalsgov.com/data-broker-registry ("Registry of Registered Data Brokers", 451 items).
- Download: the registry's "Export to Excel" button. It is generated in the browser and has no stable URL. We saved the export as `tx-2026-10-18.xlsx` (sha256 `6a6be31734e76dca2c04aa90c1da77d16a9c96fa6aa42af0f6dd20393139a13e`, export stamp "Oct 19, 2026 12:01 AM", which is UTC; local date 2026-10-18).
- Conversion: the one sheet was written to CSV with openpyxl (`uv run --with openpyxl`, which is not a project dependency). Every non-empty row was written as-is. The two metadata rows above the header ("Record Name:", "Exported On:") are kept; the importer finds the real header row by name.
- Wayback: https://web.archive.org/web/20261019051305/https://texas-sos.appianportalsgov.com/data-broker-registry. This is a capture of the registry page, not of the export, which cannot be archived.
- Accessed: 2026-10-18.
- Notes: the opt-out column is "Consumer Rights Link". "Categories of Data Processed and Transferred" is free text written by each broker, so it gives no kind (`kind: []`, left for the research pass).

## Oregon (DCBS Division of Financial Regulation)

- Page: https://dfr.oregon.gov/business/licensing/data-broker-registry/Pages/index.aspx, then "Opt out information", which leads to https://www4.cbs.state.or.us/exs/all/mylicsearch/index.cfm?fuseaction=main.show_main&group_id=20&profession_id=28&profession_sub_id=28000 ("Download 'Data Broker Opt Out Methods' Report").
- Download: https://www4.cbs.state.or.us/ex/shared/downtemp/dfcs_db_optout.csv. Saved unchanged.
- Wayback: https://web.archive.org/web/20261019051000/https://www4.cbs.state.or.us/ex/shared/downtemp/dfcs_db_optout.csv (saved by us; its digest `QH2TEUHHIFRX66GLRWEVPCYKHH6EDJ74` matches our file).
- Accessed: 2026-10-18.
- The same page also offers a "Data Collected" report (`dfcs_db_collected.csv`, yes/no per data type such as name, address, biometric) and a license data file. Neither is imported, because none of their columns map onto a kind.
- Notes: the opt-out website column is "OPT OUT WEBSITE". Some entries are bare domains (`Crunchbase.com`), which become `https://…`. When it is blank, "OPT OUT EMAIL" (explicitly an opt-out address) is used with method `email`.

## Vermont (Secretary of State): not obtained

- Search: https://bizfilings.vermont.gov/databrokersearch/Search (the old link https://bizfilings.vermont.gov/online/DatabrokerInquire/ now redirects to a login). Every search, even a name search, raises a reCAPTCHA ("User validation required to continue").
- Bulk download: the Secretary of State's office says, in a Vermont Public Records Act response posted on MuckRock, that the dataset is under "Bulk Database Download" in Online Services after logging in, with no fee. That needs a registered account.
- We did not create an account or solve the CAPTCHA. Third-party mirrors (offlist.me, Privacy Rights Clearinghouse) are not official, so they were not used.
- To finish: someone logs in at bizfilings.vermont.gov, downloads the Data Broker bulk file, and saves it here as `vt-<date>.csv` (converted from Excel if needed). Then add its real header names to `COLUMN_MAPS.VT` and run `npm run brokers:import -- VT …`.

## How the import decides things

- **Matching:** two rows are the same broker only when their legal names match after `normalizeName` (suffixes such as LLC/Inc/Limited dropped, `&` read as "and"), also ignoring spaces ("BEEN VERIFIED" = "BeenVerified"). A legal name with an embedded "d/b/a", "dba" or "doing business as" (common in TX) is split into the legal name and a DBA first. DBAs and other spellings become `aliases`, but a shared DBA or alias never merges two records, even within one registry and even when one row names both. Those pairs go to `MERGE-CANDIDATES.md` for the research pass, which decides between same broker, parent/subsidiary (`parent`) and unrelated.
- **Opt-out:** set only when the field is a URL (or a list made only of URLs), giving `{method:'web-form', url, status:'unchecked'}`, or an email address, giving `{method:'email', email}`. Prose is never mined for links. A blank field leaves `optOut: null`. An opt-out route that is already set is never overwritten by a later registry.
- **Kind:** only unambiguous flags (see CA). Anything else gives `kind: []`.
- **Registries:** `registries[state]` is the year of the snapshot we took (`"2026"`), not the year the broker registered. For TX in particular, the export lists every currently registered broker; a value of `"2026"` means "listed in the 2026-10-18 snapshot", even if the registration (see "Submitted On") was filed in 2024 or 2025.
