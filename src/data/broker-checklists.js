// Which "which did you file?" lines each broker mission has, and which broker
// records each line lights. A line lights only the record its site itself files
// with (Liz, 2026-10-19). A site-only line (notLit) keeps its date and lights
// nothing; a sweep line (drop / nai / daa) is handled by the lighting function.
// Step-to-broker matching: research/data-brokers/build/map-missions.js.

const DROP_HINT = 'California residents only. It lights the map only if you tell the map you live in California.';
const COOKIE_HINT = 'Sets an opt-out cookie in this browser on this device. It deletes nothing.';

const b = (id, label, ...brokers) => Object.freeze({ id, label, brokers });
const site = (id, label, notLit) => Object.freeze({ id, label, notLit: [notLit] });
const sweep = (id, label, kind, hint) => Object.freeze({ id, label, sweep: kind, hint });
const drop = () => sweep('drop', 'California DROP', 'drop', DROP_HINT);

const lines = (...l) => Object.freeze(l);

export const BROKER_CHECKLISTS = Object.freeze({
  'people_search-fortify-web-forms': lines(
    b('spokeo', 'Spokeo', 'spokeo'),
    b('whitepages', 'Whitepages', 'whitepages'),
    b('beenverified', 'BeenVerified', 'beenverified', 'beenverified-llc-and-its-subsidiaries-and-affiliates'),
  ),
  'people_search-fortify-removal-links': lines(
    b('intelius', 'Intelius', 'intelius'),
    b('truepeoplesearch', 'TruePeopleSearch', 'free-data-services'),
    b('fastpeoplesearch', 'FastPeopleSearch', 'mississippi-tornado-alley'),
  ),
  'people_search-fortify-privacy-portals': lines(
    site('usphonebook', 'USPhonebook', 'mississippi-tornado-alley'),
    site('thatsthem', 'ThatsThem', 'spokeo'),
    site('peoplefinder', 'PeopleFinder', 'intelius'),
  ),
  'people_search-reclaim-stragglers': lines(
    b('mylife', 'MyLife', 'mylife'),
    b('nuwber', 'Nuwber', 'nuwber'),
    drop(),
  ),
  'people_search-fortify-extended-sweep-1': lines(
    site('smartbackgroundchecks', 'SmartBackgroundChecks', 'mississippi-tornado-alley'),
    site('searchpeoplefree', 'SearchPeopleFree', 'mississippi-tornado-alley'),
  ),
  'people_search-fortify-extended-sweep-2': lines(
    b('peoplewhiz', 'PeopleWhiz', 'peoplewhiz'),
    b('spydialer', 'SpyDialer', 'spy-labs-adco'),
    b('anywho', "Anywho (Spokeo's form)", 'spokeo'),
    b('quickpeopletrace', 'QuickPeopleTrace', 'quickpeopletrace'),
    b('usatrace', 'Usatrace', 'usatrace'),
  ),
  'people_search-fortify-extended-sweep-3': lines(
    b('rocketreach', 'RocketReach', 'rocketreach'),
  ),
  'enterprise_data-fortify-lexisnexis': lines(
    b('lexisnexis', 'LexisNexis consumer opt-out', 'lexisnexis-risk-solutions', 'lexisnexis-risk-solutions-fl'),
  ),
  'enterprise_data-fortify-thomson': lines(
    b('thomson-clear', 'Thomson Reuters CLEAR request', 'thomson-reuters', 'west-publishing', 'west-publising'),
  ),
  'enterprise_data-fortify-property': lines(
    b('corelogic', 'CoreLogic (Cotality)', 'corelogic'),
    b('transunion-tlo', 'TransUnion consumer privacy request (TLO)', 'trans-union', 'tloxp'),
  ),
  'enterprise_data-reclaim-deep-layer': lines(
    b('verisk-iso', 'Verisk / ISO ClaimSearch', 'insurance-services-office'),
    b('work-number', 'The Work Number', 'equifax-workforce-solutions'),
    b('data-axle', 'Data Axle', 'data-axle'),
    b('sift', 'Sift', 'sift'),
  ),
  'ad_trackers-fortify-bulk': lines(
    sweep('nai', 'NAI opt-out tool', 'nai', COOKIE_HINT),
    sweep('daa', 'DAA WebChoices', 'daa', COOKIE_HINT),
  ),
  'ad_trackers-reclaim-individual': lines(
    b('liveramp', 'LiveRamp', 'liveramp'),
    b('acxiom', 'Acxiom', 'acxiom'),
    b('lotame', 'Lotame', 'lotame-solutions'),
    b('epsilon', 'Epsilon', 'epsilon-data-management'),
  ),
  'location_brokers-fortify-optout': lines(
    b('safegraph', 'SafeGraph', 'safegraph'),
    b('placer-ai', 'Placer.ai', 'placer-ai'),
    b('gravy-analytics', 'Gravy Analytics', 'gravy-analytics'),
  ),
  'location_brokers-reclaim-legal': lines(drop()),
});

export function checklistFor(missionId) {
  return Object.hasOwn(BROKER_CHECKLISTS, missionId) ? BROKER_CHECKLISTS[missionId] : null;
}

// A legacy filing counts as "all" when its record holds one of these answers.
export const LEGACY_ALL_ANSWERS = Object.freeze({
  optout_result: Object.freeze(['all-submitted']),
  defense_done: Object.freeze(['done', 'already-done']),
});

const FROZEN = Object.freeze(['already-frozen', 'now-frozen']);
const ring = (mission, question, values, brokers) => Object.freeze({ mission, question, values, brokers: Object.freeze(brokers) });
export const FREEZE_RINGS = Object.freeze([
  ring('credit_freeze-fortify-equifax', 'freeze_status', FROZEN, ['equifax-information-services']),
  ring('credit_freeze-fortify-experian', 'freeze_status', FROZEN, ['experian-information-solutions']),
  ring('credit_freeze-fortify-transunion', 'freeze_status', FROZEN, ['trans-union']),
  ring('credit_freeze-fortify-extras', 'freeze_extras', Object.freeze(['both-frozen']), ['innovis-data-solutions', 'chex-systems']),
]);
