# sec family: notes

Accessed 2026-10-18. 52 broker records, 44 links (all tier A), 20 sources, all archived.

## What was searched
- EDGAR submissions API (data.sec.gov) for the latest 10-K / 20-F / 40-F of Equifax, TransUnion, LiveRamp, Omnicom, Verisk, Dun & Bradstreet, Thomson Reuters, RELX, Fair Isaac, CoreLogic and Nielsen. Read the main documents plus their Exhibit 21 subsidiary lists.
- Experian plc Annual Report 2026 (year to 31 March 2026). The PDF is not SEC-filed, and experianplc.com blocks curl, so it was read from the Wayback capture.
- RELX Annual Report 2025 PDF from relx.com, for note 28 (Related undertakings) and the Risk business-area text. The 20-F incorporates it by reference.
- Publicis Groupe Universal Registration Document 2025 (publispeak HTML): Note 3 (2025 acquisitions), Note 36 (main consolidated companies), section 1.3 and Key figures.

## Judgement calls for the merge step
- **Tier A for non-SEC annual reports.** Experian, RELX and Publicis annual reports are recorded as `kind: annual-report`, per the brief's scope ("UK/EU annual report where not SEC-filed"). If the merge treats only SEC/regulator documents as tier A, re-tier the Experian (9 owns), Publicis (3 owns) and RELX (7 owns) links. Note that the RELX AR is incorporated by reference into its 20-F.
- **`sec-8k` source kind.** Two sources are Form 8-Ks: D&B's take-private on 2025-08-26 and CoreLogic's on 2021-06-04. The kind vocabulary has no 8-K value, so I used `sec-8k`. Both back only the broker records' private status, not any link or size signal.
- **Exhibit-21-only owns links.** These subsidiaries appear only in the subsidiary list, with no description in the filing:
  - Equifax: IXI, Teletrack, DataX, Kount
  - TransUnion: Tru Optik, iovation, FactorTrust, LSSi, Signal Digital, Rental Screening, Drivers History, TRADS
  - Experian: EIS, EMS, Tapad, Predictive Pop/Audigent, Clarity, Background Data, 41st Parameter, Neuro-ID
  - RELX: ID Analytics, Risk Data Management, Special Services, Coplogic, LNRS Data Services

  Their `kind` and `sells` are left empty on purpose. Fill them from registry or privacy-policy sources.
- **RELX parent.** The related-undertakings list says each entity is "held indirectly by RELX PLC" and does not name intermediate parents. So the owns links run from `relx`, not from `lexisnexis-risk-solutions`. The exception is IDVerse, which the AR says LexisNexis Risk Solutions acquired.
- **Equifax buys from Experian and TransUnion.** This rests on the 10-K's description of tri-merge mortgage reports that "combine information from" all three bureaus. Drop it if the merge wants explicit purchase language.
- **Telematics supplies links** (GM to Verisk, GM to LexisNexis Risk Solutions, Hyundai to Verisk). These are private plaintiffs' allegations as summarised in Verisk's FY2025 10-K, and each claim says so. Cross-check them with the enforcement family's FTC GM/OnStar material.
- **Id choices that may collide.** The journalism staging uses `hyundai`; I used `hyundai-motor-america`, the exact name in the 10-K. Also check `general-motors` (GM / OnStar), `epsilon-data-management` (Epsilon), `lotame-solutions` (Lotame) and `dun-bradstreet`.
- **Experian size signals** are `kind: other`, because they come from a UK annual report, not an SEC filing. Revenue is in US$.

## Could not confirm / not recorded
- **LiveRamp to Acxiom/IPG.** LiveRamp's FY2026 10-K says only that it sold Acxiom Marketing Solutions in fiscal 2019; it does not name the buyer. No link recorded. Omnicom's 10-K covers the Omnicom/IPG to Acxiom ownership.
- **LiveRamp data sellers.** The 10-K describes Data Marketplace revenue-sharing with data sellers but names none. It also discloses the class action Riganian v. LiveRamp (N.D. Cal. 4:25-cv-824), which is a lead for the court family.
- **Thomson Reuters CLEAR.** The 2025 annual report describes CLEAR as a "US-based public records platform" for businesses and government agencies. It names no data suppliers and no government customers, and gives no CLEAR revenue split. ICE/CLEAR contracts are a lead for the procurement family.
- **Dun & Bradstreet** has been owned by affiliates of Clearlake Capital since 2025-08-26 (8-K). No Clearlake node was created. Its last 10-K is FY2024.
- **CoreLogic** has been private since 2021-06-04 (Stone Point Capital and Insight Partners affiliates). Its last 10-K is FY2020. That 10-K says it obtains data from "other industry leading data aggregators" but names none. It also says CoreLogic planned to exit its tenant-screening and credit reseller units (Rental Property Solutions, Credit Solutions). Lead: who bought them (unconfirmed here).
- **Nielsen** has been private since 2022-10-11 (8-K, Neptune BidCo). No record created: its filings do not establish it as a seller of consumer data.
- **Fair Isaac.** Its FY2025 10-K and Exhibit 21 cover scores and software; nothing shows it selling consumer data, so it is skipped per the brief. myFICO Consumer Services Inc. is a subsidiary.
- **Acquisitions without a stated price**, from the D&B 10-K: NetWise and Eyeota (2021). Equifax made an unnamed 2025 Workforce Solutions acquisition, which its 10-K does not name. Lead: Equifax 2025 press releases.
- **Experian deals after year-end**, both April 2026: Own Up (mortgage marketplace, US$175m) and Konfir (UK employment and salary verification, US$25m). Not recorded as brokers.
- **Not recorded as consumer-data subsidiaries:** TransUnion's Sontiq (identity protection) and Monevo (credit prequalification, fully acquired 2025-04-01).

## Archiving
Every source has a Wayback capture. The CDX API found existing captures for most. Five were saved fresh on 2026-10-19 UTC (LiveRamp 10-K, D&B 8-K, CoreLogic 8-K, Publicis Note 3 and Note 36), and each loaded with HTTP 200 and no SEC block page. The `archive.org/wayback/available` endpoint returned 429 (rate-limited) throughout, so other families should use CDX instead.
