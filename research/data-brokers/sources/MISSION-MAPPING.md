# Mission mapping

`build/map-missions.js` fills each broker record's `missions` from the step URLs in
`src/data/missions-reclamation.js`. Run it again after the missions or the broker records change;
it is idempotent. Mapped 2026-10-18: 28 broker records carry at least one mission.

## How a step URL is matched

1. `OVERRIDES` in the script, for URLs on corporate domains that many registry records share.
2. A broker whose `optOut.url` is that exact URL.
3. The one broker whose `optOut.url`, `website` or domain-like alias has the same registrable
   domain. If more than one broker matches, the URL is reported as ambiguous and nothing is
   assigned.

Only broker missions are mapped (`people_search-*`, `enterprise_data-*`, `ad_trackers-*`,
`location_brokers-*`). Credit-freeze and government-ID missions are skipped on purpose: the
constellation spec says a freeze lights no star, because it doesn't stop a bureau selling data.

## Overrides (shared domains)

| Step URL | Brokers | Why |
|---|---|---|
| consumer.risk.lexisnexis.com/request, optout.lexisnexis.com | lexisnexis-risk-solutions, lexisnexis-risk-solutions-fl | LexisNexis Risk Solutions' consumer opt-out. Not `relx` (RELX Inc.) or `lexisnexis-a-division-of-relx` (legal publishing), which share lexisnexis.com. |
| legal.thomsonreuters.com/…/privacy-records | thomson-reuters, west-publishing, west-publising | Thomson Reuters' CLEAR/public-records request. West Publishing Corp is TR's registered broker; `west-publising` is the Oregon registry's misspelt duplicate of it. |
| transunion.com/consumer-privacy | transunion, trans-union, tloxp | The mission says TLO is included. Other TransUnion subsidiaries that list transunion.com as their website are not lit. |
| beenverified.com/faq/opt-out/ | beenverified, beenverified-llc-and-its-subsidiaries-and-affiliates | Two registry records for the same company (an import duplicate). |

## Steps without a URL that name a broker (`NAMED_STEPS`)

| Mission | Broker | Step |
|---|---|---|
| people_search-fortify-removal-links | intelius | "Intelius: use the suppression request in its privacy center" |
| people_search-fortify-privacy-portals | intelius | "PeopleFinder: use the opt-out link on its site". Intelius, LLC's CA registry filing lists www.peoplefinder.com among its websites. |
| people_search-reclaim-stragglers | mylife | "MyLife: use its privacy request form" |
| enterprise_data-fortify-property | corelogic | "CoreLogic (now Cotality): submit a consumer privacy request" |

Not mapped: Oracle Data Cloud, X-Mode/Outlogic and Gravy steps, which tell the player there is
nothing left to file; Nuwber, ClustrMaps and AdvancedPeopleSearch, whose sites are down or parked
and have no record.

## Unmatched step URLs and decisions

| Step URL | Mission(s) | Decision |
|---|---|---|
| privateeye.com/static/view/optout | people_search-fortify-extended-sweep-1 | Broker, no record. The policies research found it redirects to a search page with no removal form, and no registry lists it. No record added until a source supports one. |
| findpeoplesearch.com/opt-out | people_search-fortify-extended-sweep-3 | Broker, no record. The page redirects to a parked `/lander`, with no Wayback captures. No record added. |
| privacy.ca.gov/drop/ | people_search-reclaim-stragglers, location_brokers-reclaim-legal | Non-broker: California's DROP sweep. It lights CA-registered brokers through the residency rule, not through `missions`. |
| cppa.ca.gov/webapplications/complaint | location_brokers-reclaim-legal | Non-broker: regulator complaint form. |
| reportfraud.ftc.gov | location_brokers-reclaim-legal | Non-broker: regulator complaint form. |
| datarequests.org/generator/ | location_brokers-reclaim-legal | Non-broker: a letter-writing tool. |
| support.google.com/websearch/… | people_search-reclaim-stragglers | Non-broker: Google "Results about you" removal. |
| myadcenter.google.com, facebook.com ad settings, support.apple.com | ad_trackers-recon-understand, ad_trackers-fortify-platforms | Non-broker: platform ad settings. |
| thenai.org/how-to-opt-out/, optout.aboutads.info | ad_trackers-fortify-bulk | Non-broker: NAI/DAA browser opt-out tools. The spec gives them a halo on member ad networks, never a light. |
| equifax.com, experian.com, transunion.com freeze pages; innovis.com, chexsystems.com freezes | credit_freeze-* | Skipped: freezes light no star. |
| irs.gov, ssa.gov, annualcreditreport.com, identitytheft.gov | govt_id_defense-* | Skipped: government sites and the free credit-report service. |
