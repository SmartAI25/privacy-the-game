// Building Interiors: the records desk. What a named agency can make a US
// company hand over, by legal tool. The player can't change any of it; it's
// here so the map is knowable. Sources, checked 2026-10-20:
//  - 18 U.S.C. 2703 (Stored Communications Act): a subpoena (grand jury,
//    trial, or "administrative subpoena authorized by a Federal or State
//    statute") reaches subscriber records: name, address, session times, IP
//    addresses, means of payment (2703(c)(2)); a 2703(d) court order reaches
//    other non-content records; a warrant reaches content (2703(a), (b)).
//  - 18 U.S.C. 2702(b)(8), (c)(4): a provider may disclose, with no court
//    involved, if it "in good faith, believes that an emergency involving
//    danger of death or serious physical injury" requires it.
//  - Company pages (added per interior with withSources), e.g. Google's "How
//    Google handles government requests for user information": subpoena →
//    basic subscriber info and certain IP addresses; court order → non-content
//    records; Google requires a search warrant for content; emergency → Google decides; an NSL
//    "doesn't require judicial authorization" and reaches "limited subscriber
//    information"; FISA can compel content.
//  - 18 U.S.C. 2709 and EFF: the FBI issues National Security Letters with
//    no court approval and can gag the recipient.
//  - 50 U.S.C. 1881a (FISA Section 702), EFF's 702 page, Wikipedia: directives
//    come from the Attorney General and the DNI (1881a(i)(1)); targets
//    non-US persons abroad; Americans' messages with them are collected; the
//    FBI searches the collected data. The Guardian, 2013-06-06 (Greenwald and
//    MacAskill): PRISM names Google, Facebook, Apple and others.
//  - 702's 2026 status: the statute lapsed 2026-06-12 (Wikipedia timeline);
//    the Brennan Center (2026-09-22) says the FISA Court's certifications of
//    2026-03-17 keep it running to 2027-03-17. Unsettled, so the copy says
//    "has let".
//  - Five Eyes (Wikipedia): GCHQ, CSE, ASD, GCSB and the NSA share signals
//    intelligence under the UKUSA Agreement.
//  - ICE / HSI administrative subpoenas: no judge (EFF, 2026-04-22: "basic
//    subscriber information like name, address, IP address, length of
//    service, and session times"; content is out of reach).
//  - DOJ, 2022-10-03: the US–UK Data Access Agreement (CLOUD Act) is in
//    force; UK orders go straight to US providers, must relate to serious
//    crime, and must not target US persons or anyone in the US.

const SCA_2703 = { label: '18 U.S.C. § 2703 (Stored Communications Act)', url: 'https://www.law.cornell.edu/uscode/text/18/2703' };
const SCA_2702 = { label: '18 U.S.C. § 2702 (emergency disclosure)', url: 'https://www.law.cornell.edu/uscode/text/18/2702' };
const NSL_2709 = { label: '18 U.S.C. § 2709 (National Security Letters)', url: 'https://www.law.cornell.edu/uscode/text/18/2709' };
const FISA_702 = { label: '50 U.S.C. § 1881a (FISA Section 702)', url: 'https://www.law.cornell.edu/uscode/text/50/1881a' };
const EFF_NSL = { label: 'EFF: National Security Letters', url: 'https://www.eff.org/issues/national-security-letters' };
const EFF_702 = { label: 'EFF: Section 702', url: 'https://www.eff.org/702-spying' };
const GUARDIAN_PRISM = { label: 'The Guardian (2013): NSA Prism program taps in to user data of Apple, Google and others', url: 'https://www.theguardian.com/world/2013/jun/06/us-tech-giants-nsa-data' };
const WIKI_PRISM = { label: 'Wikipedia: PRISM', url: 'https://en.wikipedia.org/wiki/PRISM' };
const WIKI_702 = { label: 'Wikipedia: Section 702', url: 'https://en.wikipedia.org/wiki/Section_702' };
const BRENNAN_702 = { label: 'Brennan Center (2026): Section 702 will not lapse if reauthorized by March 2027', url: 'https://www.brennancenter.org/media/16217/download/bcj-702-march-2027-deadline-one-pager-9.22.26.pdf' };
const WIKI_FIVE_EYES = { label: 'Wikipedia: Five Eyes', url: 'https://en.wikipedia.org/wiki/Five_Eyes' };
const WIKI_ADMIN_SUBPOENA = { label: 'Wikipedia: Administrative subpoena', url: 'https://en.wikipedia.org/wiki/Administrative_subpoena' };
const EFF_DHS_SUBPOENAS = { label: 'EFF (2026): EFF sues DHS and ICE for records on subpoenas seeking to unmask online critics', url: 'https://www.eff.org/press/releases/eff-sues-dhs-and-ice-records-subpoenas-seeking-unmask-online-critics-0' };
const DOJ_UK_AGREEMENT = { label: 'US Department of Justice (2022): Landmark U.S.-UK Data Access Agreement enters into force', url: 'https://www.justice.gov/archives/opa/pr/landmark-us-uk-data-access-agreement-enters-force' };
const DOJ_CLOUD_ACT = { label: 'US Department of Justice: CLOUD Act resources', url: 'https://www.justice.gov/criminal/cloud-act-resources' };

/** @typedef {{ label: string, url: string }} Source */
/** @typedef {{ id: string, actor: string, actorNote?: string, tool: string, gets: string, sources: Source[] }} DeskLane */

/** @returns {DeskLane} */
export function localPolice(company) {
  return {
    id: 'local-police',
    actor: 'Your local police department',
    actorNote: 'State police and prosecutors use the same tools.',
    tool: 'Subpoena · 2703(d) court order · search warrant · emergency request',
    gets: `A subpoena gets ${company} to hand over your name, phone number and sign-in IP addresses. A 2703(d) court order adds who you wrote to and when. ${company} requires a search warrant, signed by a judge, before handing over what you actually wrote. An emergency request needs no judge at all, and ${company} decides whether to answer it.`,
    sources: [SCA_2703, SCA_2702],
  };
}

/** @returns {DeskLane} */
export function fbi(company) {
  return {
    id: 'fbi',
    actor: 'FBI',
    tool: 'National Security Letter · the police tools · searches of 702 data',
    gets: `Everything on the police slip, plus National Security Letters: subscriber records with no judge involved, usually with a gag order so ${company} can’t tell you. The FBI also searches what the NSA collected under Section 702.`,
    sources: [NSL_2709, EFF_NSL, EFF_702],
  };
}

/** @returns {DeskLane} */
export function nsa702(company, { prismNamed = false } = {}) {
  const prism = prismNamed ? ` ${company} was named in the 2013 PRISM documents.` : '';
  return {
    id: 'nsa-702',
    actor: 'NSA',
    actorNote: 'Shares signals intelligence with its Five Eyes partners: GCHQ (UK), CSE (Canada), ASD (Australia) and GCSB (New Zealand).',
    tool: 'FISA Section 702 directive (PRISM)',
    gets: `Section 702 has let the Attorney General and the Director of National Intelligence order ${company} to hand over, for the NSA, the messages of people outside the US who aren’t Americans, without a warrant for each one. Your messages with those people get collected too.${prism} Its 2026 status is unsettled: a lapse was reported in June 2026, and the court-approved certifications behind it reportedly run to March 2027.`,
    sources: [FISA_702, EFF_702, ...(prismNamed ? [GUARDIAN_PRISM, WIKI_PRISM] : []), WIKI_702, BRENNAN_702, WIKI_FIVE_EYES],
  };
}

/** @returns {DeskLane} */
export function iceHsi(company) {
  return {
    id: 'ice-hsi',
    actor: 'ICE / HSI',
    actorNote: 'Immigration and Customs Enforcement and its investigative arm, Homeland Security Investigations.',
    tool: 'Administrative subpoena',
    gets: `A subpoena signed by an agency official, not a judge. It reaches subscriber records at ${company} (name, address, IP addresses, session times), not what you wrote.`,
    sources: [SCA_2703, WIKI_ADMIN_SUBPOENA, EFF_DHS_SUBPOENAS],
  };
}

/** @returns {DeskLane} */
export function ukCloudAct(company) {
  return {
    id: 'uk-cloud-act',
    actor: 'UK investigators, through the Home Office',
    actorNote: 'Orders go through the Home Office’s Investigatory Powers Unit.',
    tool: 'CLOUD Act order (US–UK Data Access Agreement)',
    gets: `Since October 2022, UK orders in serious-crime cases can go straight to ${company}, which may answer without a US court being involved. An order can’t target a US person or anyone in the US.`,
    sources: [DOJ_UK_AGREEMENT, DOJ_CLOUD_ACT],
  };
}

// A company's own page on how it answers these requests, added to every lane
// of that company's desk.
export function withSources(lane, ...extra) {
  return { ...lane, sources: [...lane.sources, ...extra] };
}
