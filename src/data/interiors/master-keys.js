// Building Interiors: The Master Keys. The email and cloud accounts that can
// reset every other account. Gmail came first (Task 1); the rest are Task 7.
// Sources for the entries, checked 2026-10-20:
//  - Credential stuffing (OWASP, Wikipedia): automated sign-in attempts with
//    username/password pairs leaked from other sites; works on reused
//    passwords.
//  - SIM swap (FBI IC3 PSA 2022-02-08; CISA's phishing-resistant MFA fact
//    sheet): carrier employees are tricked or bribed into moving a number to
//    a SIM the attacker holds; texts, and the codes in them, go along. 2021:
//    1,611 complaints, more than $68 million in losses. CISA: FIDO/WebAuthn
//    and app-based codes aren't exposed to SIM swap.
//  - Phishing (CISA fact sheet; Wikipedia): a site that mimics a real sign-in
//    page; app codes and push are "vulnerable to phishing attacks", while
//    FIDO/WebAuthn is "resistant to phishing". Wikipedia: phishing kits clone
//    login pages, "lowering the skill needed to run a campaign".
//  - Devices: Google Help, "See devices with account access": review and sign
//    out of signed-in devices.
//  - CIA: WikiLeaks published Vault 7 from 2017-03-07, CIA tools for phones,
//    computers and TVs; encrypted apps were reached by compromising the
//    device, not by breaking the apps (Wikipedia, WikiLeaks).
//  - Operation Aurora: Google, 2010-01-12, "a primary goal of the attackers
//    was accessing the Gmail accounts of Chinese human rights activists";
//    "only two Gmail accounts appear to have been accessed", limited to
//    account information and subject lines.
//    Wikipedia: traced to the Beijing-based Elderwood group, "with
//    associations with the People's Liberation Army".
//  - Pegasus: NSO Group supplies "authorized governments" (Wikipedia); Citizen
//    Lab has documented Pegasus on the phones of journalists and activists.
//  - Google Advanced Protection: for people at higher risk; requires a passkey
//    or security key and checks risky downloads more strictly.
// Task 7, each company's own pages (checked 2026-10-20):
//  - Microsoft, "Government requests for customer data": a subpoena for
//    non-content (name, email, state/country/ZIP, IP at registration, IP
//    connection history, billing); "only disclose content to law enforcement
//    in response to a warrant". Recent activity page: sign-ins, last 30 days.
//    "Microsoft to stop sending SMS codes for personal accounts": SMS is "a
//    leading source of fraud", "vulnerable to phishing and SIM-swap attacks".
//    Storm-0558 (Microsoft, 2023-07-11 and 07-14): a China-based actor with
//    espionage objectives forged tokens with an acquired MSA consumer signing
//    key, reached email at about 25 organizations including government
//    agencies "and a small number of related consumer accounts", via OWA and
//    Outlook.com.
//  - Apple, "Legal Process Guidelines" (US): customer info and iCloud
//    connection logs with IP addresses by subpoena (logs kept up to 25 days);
//    mail logs (time, date, sender, recipient) by 2703(d) order, kept up to
//    25 days; "a search warrant issued upon a probable cause showing is
//    required" for content. With Advanced Data Protection, Apple "cannot
//    decrypt" Photos, iCloud Drive, Backup, Notes and Safari Bookmarks, while
//    email, contacts and calendars stay reachable by warrant. "iCloud data
//    security overview": "iCloud Mail does not use end-to-end encryption".
//    UK page (2025): Apple can no longer offer ADP to new users in the UK.
//    Security keys: with keys on, the key or a trusted device "are the only
//    ways to sign in". Device list: devices can receive 2FA codes, change the
//    password, sync with iCloud. Citizen Lab (2021-09-13): FORCEDENTRY, a
//    zero-click iMessage exploit, found on a Saudi activist's phone infected
//    with Pegasus. Lockdown Mode: "optional, extreme protection" for "the very
//    few" personally targeted.
//  - Yahoo Transparency FAQ: subpoenas reach basic subscriber info (alternate
//    email, name, location, IP), login details, billing; court orders reach
//    to/from/date; "Search warrants may be used to get content". Yahoo's
//    page lists the warrant as the tool for content but doesn't say it
//    requires one, so the copy says "lists". Help: current sign-ins on the
//    Account security page; passkeys and security keys are offered. DOJ
//    (2017-03-15): two FSB officers and two hackers charged over a break-in
//    beginning 2014; data on at least 500 million accounts stolen; cookies
//    minted to get into at least 6,500 accounts.
//  - Meta, "Information for law enforcement authorities" (bot-walled to
//    curl; read in a browser): subpoena → name, length of service, card
//    info, email, recent login IP; 2703(d) → message headers and IPs; "A
//    search warrant ... is required" for stored contents; end-to-end
//    encrypted chats: Meta "will no longer be able to provide unencrypted
//    message content", only message and call logs and IP data; NSLs read as
//    reaching "name and length of service". Passkeys on Facebook (Meta,
//    2025-06-18), set up in Accounts Center. Help: "Where you're logged in".
//  - Proton (Swiss): transparency report: "The only legally binding requests
//    are ones from the Swiss authorities"; foreign requests go through Swiss
//    authorities under international legal assistance (Article 271 of the
//    Swiss Criminal Code bars handing data to foreign authorities directly);
//    "all emails, files and invites are encrypted and we have no means to
//    decrypt them". 2021 climate activist blog: a binding Swiss order, no
//    appeal possible; Proton "can be legally compelled to log your IP
//    address"; no messages handed over. Wikipedia: the Swiss order answered
//    an international request (French activists). Mail encryption page:
//    body and attachments stored with zero-access, end-to-end encryption;
//    subject lines are not end-to-end encrypted, and access needs a court
//    order approved by a Swiss judge.
//    2FA: authenticator app or U2F/FIDO2 security key; with username and
//    password, a 2FA recovery code can be sent to a saved recovery phone.
import { localPolice, fbi, nsa702, iceHsi, ukCloudAct, withSources, withLine } from './lanes.js';

const GOOGLE_REQUESTS = { label: 'Google: how Google handles government requests for user information', url: 'https://policies.google.com/terms/information-requests' };
const GOOGLE_TRANSPARENCY = { label: 'Google Transparency Report: global requests for user information', url: 'https://transparencyreport.google.com/user-data/overview' };
const MS_REQUESTS = { label: 'Microsoft: Government requests for customer data', url: 'https://www.microsoft.com/en-us/corporate-responsibility/reports/government-requests/customer-data' };
const APPLE_LEGAL = { label: 'Apple: Legal process guidelines for US law enforcement (PDF)', url: 'https://www.apple.com/legal/privacy/law-enforcement-guidelines-us.pdf' };
const APPLE_ICLOUD_SECURITY = { label: 'Apple Support: iCloud data security overview', url: 'https://support.apple.com/en-us/102651' };
const APPLE_ADP = { label: 'Apple Support: How to turn on Advanced Data Protection for iCloud', url: 'https://support.apple.com/en-us/108756' };
const APPLE_ADP_UK = { label: 'Apple Support: Apple can no longer offer Advanced Data Protection in the United Kingdom to new users', url: 'https://support.apple.com/en-us/122234' };
const YAHOO_FAQ = { label: 'Yahoo Transparency Report: FAQs and glossary', url: 'https://www.yahooinc.com/transparency/about/faq-glossary.html' };
const YAHOO_US = { label: 'Yahoo Transparency Report: United States, July–December 2024', url: 'https://www.yahooinc.com/transparency/reports/government-data-requests/country/united-states/jul-dec-2024/index.html' };
const META_LAW = { label: 'Meta: Information for law enforcement authorities', url: 'https://www.meta.com/safety/communities/law/guidelines/' };
const META_E2EE = { label: 'Meta (2023): Launching default end-to-end encryption on Messenger', url: 'https://about.fb.com/news/2023/12/default-end-to-end-encryption-on-messenger/' };
const PROTON_TRANSPARENCY = { label: 'Proton: Transparency report', url: 'https://proton.me/legal/transparency' };
const PROTON_CLIMATE = { label: 'Proton (2021): Important clarifications regarding arrest of climate activist', url: 'https://proton.me/blog/climate-activist-arrest' };
const PROTON_ENCRYPTION = { label: 'Proton Support: How Proton Mail messages are encrypted', url: 'https://proton.me/support/proton-mail-encryption-explained' };
const PROTON_PRIVACY = { label: 'Proton: Privacy policy', url: 'https://proton.me/legal/privacy' };
const WIKI_PROTON = { label: 'Wikipedia: Proton Mail', url: 'https://en.wikipedia.org/wiki/Proton_Mail' };

const STUFFING_SOURCES = [
  { label: 'OWASP: Credential stuffing', url: 'https://owasp.org/www-community/attacks/Credential_stuffing' },
  { label: 'Wikipedia: Credential stuffing', url: 'https://en.wikipedia.org/wiki/Credential_stuffing' },
];
const SIM_SWAP_SOURCES = [
  { label: 'FBI IC3 (2022): Criminals increasing SIM swap schemes to steal millions', url: 'https://www.ic3.gov/PSA/2022/PSA220208' },
  { label: 'CISA: Implementing phishing-resistant MFA (fact sheet)', url: 'https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf' },
  { label: 'Wikipedia: SIM swap scam', url: 'https://en.wikipedia.org/wiki/SIM_swap_scam' },
];
const PHISHING_SOURCES = [
  { label: 'CISA: Implementing phishing-resistant MFA (fact sheet)', url: 'https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf' },
  { label: 'Wikipedia: Phishing', url: 'https://en.wikipedia.org/wiki/Phishing' },
];
const VAULT7 = [
  { label: 'WikiLeaks: Vault 7 (2017)', url: 'https://wikileaks.org/ciav7p1/' },
  { label: 'Wikipedia: Vault 7', url: 'https://en.wikipedia.org/wiki/Vault_7' },
];
const PEGASUS = [
  { label: 'Citizen Lab: NSO Group research', url: 'https://citizenlab.ca/tag/nso-group/' },
  { label: 'Wikipedia: Pegasus (spyware)', url: 'https://en.wikipedia.org/wiki/Pegasus_(spyware)' },
];
const STATE_SOURCES = [
  ...VAULT7,
  { label: 'Google (2010): A new approach to China', url: 'https://googleblog.blogspot.com/2010/01/new-approach-to-china.html' },
  { label: 'Wikipedia: Operation Aurora', url: 'https://en.wikipedia.org/wiki/Operation_Aurora' },
  ...PEGASUS,
  { label: 'Google: Advanced Protection Program', url: 'https://landing.google.com/advancedprotection/' },
];

const DESK_INTRO = (company) => `${company} holds this data, so an agency that wants it asks ${company}, not you. Nothing you do changes this floor. It’s here so you know exactly who can ask, and with what.`;

// The five US lanes for a company named in the 2013 PRISM documents, each
// carrying that company's own pages.
function usDesk(company, { police = {}, lines = {} } = {}, ...companySources) {
  const lanes = [
    localPolice(company, police),
    fbi(company),
    nsa702(company, { prismNamed: true }),
    iceHsi(company),
    ukCloudAct(company),
  ];
  return lanes.map((lane) => {
    const withOwn = withSources(lane, ...companySources);
    const line = lines[lane.id];
    return line ? withLine(withOwn, line.text, ...line.sources) : withOwn;
  });
}

// --- entries shared in shape across the Master Keys -------------------------

function stuffing(where, fixMission) {
  return {
    id: 'stuffing',
    metaphor: 'front-door',
    actor: 'Credential-stuffing bots',
    how: `Bots try email-and-password pairs leaked from other sites’ breaches against the ${where} sign-in, by the million. A password you’ve used anywhere else is how one gets in.`,
    rule: 'password-unique',
    fix: `Give ${where} a password used nowhere else, made and kept by a password manager.`,
    fixMission,
    sources: STUFFING_SOURCES,
  };
}

const SIM_HOW = 'The crew talks a carrier employee into moving your phone number onto a SIM the crew holds, or pays one to. Your texts, and any sign-in codes in them, go along with the number.';
const SIM_FIX = 'Move two-step verification to an authenticator app or a passkey, then turn off text-message backup.';

function simSwap(fixMission, { how = SIM_HOW, fix = SIM_FIX, sources = [] } = {}) {
  return { id: 'sim-swap', metaphor: 'phone-line', actor: 'A SIM-swap crew', how, rule: 'sim-swap', fix, fixMission, sources: [...SIM_SWAP_SOURCES, ...sources] };
}

function phishing(company, fix, fixMission, sources = [], key = 'a passkey') {
  return {
    id: 'phishing',
    metaphor: 'mail-slot',
    actor: 'A phishing-kit operator',
    how: `A ready-made kit clones the ${company} sign-in page. You type your password and code into the copy, and the operator uses both on the real page. Codes from a text or an app can be passed along like that; ${key} only answers ${company}’s real site.`,
    rule: 'phishing',
    fix,
    fixMission,
    sources: [...PHISHING_SOURCES, ...sources],
  };
}

function nearYou(how, fix, fixMission, sources) {
  return { id: 'near-you', metaphor: 'back-room', actor: 'Someone near you (partner, roommate, thief)', how, rule: 'devices', fix, fixMission, sources };
}

const AROUND = 'These go around the locks: into the phone or laptop itself, or into the company.';
const CIA_LINE = 'The CIA’s phone and computer hacking tools were exposed in the Vault 7 leak (2017).';
const PEGASUS_LINE = 'Citizen Lab has found Pegasus on the phones of journalists and activists.';
const PEGASUS_ACTOR = 'a spyware vendor’s government customer (NSO Group’s Pegasus)';
const PEGASUS_NOTE = 'NSO Group sells Pegasus to government agencies.';

// --- Google: Gmail and the Google Account ----------------------------------

const googleDesk = () => [
  localPolice('Google'),
  fbi('Google'),
  nsa702('Google', { prismNamed: true }),
  iceHsi('Google'),
  ukCloudAct('Google'),
].map((lane) => withSources(lane, GOOGLE_REQUESTS, GOOGLE_TRANSPARENCY));

const googleState = () => ({
  id: 'state',
  metaphor: 'vents',
  actor: 'CIA · Chinese state hackers (Operation Aurora, 2010) · a spyware vendor’s government customer (NSO Group’s Pegasus)',
  actorNote: 'Security researchers traced Aurora to Elderwood, a Beijing-based group with ties to China’s military. NSO Group sells Pegasus to government agencies.',
  how: 'These go around the locks: into the phone or laptop itself, or into the company. The CIA’s phone and computer hacking tools were exposed in the Vault 7 leak (2017). In 2010 Google said the Aurora attackers had gone after the Gmail accounts of Chinese human rights activists. Google also said only two Gmail accounts appeared to have been accessed, and only their account information and subject lines, not the emails themselves. Citizen Lab has found Pegasus on the phones of journalists and activists.',
  rule: 'beyond',
  narrows: 'For people at higher risk, Google’s Advanced Protection Program requires a passkey or security key to sign in and is stricter about risky downloads.',
  sources: STATE_SOURCES,
});

const GOOGLE_DEVICES = [{ label: 'Google Help: See devices with account access', url: 'https://support.google.com/accounts/answer/3067630' }];

const gmail = {
  accountId: 'gmail',
  company: 'Google',
  deskIntro: DESK_INTRO('Google'),
  desk: googleDesk(),
  entries: [
    {
      id: 'stuffing',
      metaphor: 'front-door',
      actor: 'Credential-stuffing bots',
      how: 'Bots try email-and-password pairs leaked from other sites’ breaches against the Gmail sign-in, by the million. A password you’ve used anywhere else is how one gets in.',
      rule: 'password-unique',
      fix: 'Give Gmail a password used nowhere else, made and kept by a password manager.',
      fixMission: 'gmail-fortify-password',
      sources: STUFFING_SOURCES,
    },
    {
      id: 'sim-swap',
      metaphor: 'phone-line',
      actor: 'A SIM-swap crew',
      how: 'The crew talks a carrier employee into moving your phone number onto a SIM the crew holds, or pays one to. Your texts, and any sign-in codes in them, go along with the number.',
      rule: 'sim-swap',
      fix: 'Move two-step verification to an authenticator app or a passkey, then turn off text-message backup.',
      fixMission: 'gmail-fortify-2fa-upgrade',
      sources: SIM_SWAP_SOURCES,
    },
    {
      id: 'phishing',
      metaphor: 'mail-slot',
      actor: 'A phishing-kit operator',
      how: 'A ready-made kit clones the Google sign-in page. You type your password and code into the copy, and the operator uses both on the real page. Codes from a text or an app can be passed along like that; a passkey only answers Google’s real site.',
      rule: 'phishing',
      fix: 'Add a passkey to your Google account and sign in with it every time.',
      fixMission: 'gmail-fortify-2fa-upgrade',
      sources: PHISHING_SOURCES,
    },
    {
      id: 'near-you',
      metaphor: 'back-room',
      actor: 'Someone near you (partner, roommate, thief)',
      how: 'A phone, laptop or tablet that’s still signed in opens your mail with no password at all. Old devices and borrowed ones count.',
      rule: 'devices',
      fix: 'Check the devices signed in to your Google account and sign out of any that aren’t yours.',
      fixMission: 'gmail-recon-login',
      sources: GOOGLE_DEVICES,
    },
    googleState(),
  ],
  saints: ['snowden'],
};

const google = {
  accountId: 'google',
  company: 'Google',
  deskIntro: DESK_INTRO('Google'),
  desk: googleDesk(),
  entries: [
    stuffing('Google Account', 'google-fortify-password'),
    simSwap('google-fortify-2fa-upgrade'),
    phishing('Google', 'Add a passkey to your Google account and sign in with it every time.', 'google-fortify-2fa-upgrade'),
    nearYou(
      'A phone, laptop or tablet that’s still signed in to your Google Account opens your mail, files and everything you sign in to with Google, with no password at all. Old devices and borrowed ones count.',
      'Check the devices signed in to your Google account and sign out of any that aren’t yours.',
      'google-recon-login',
      GOOGLE_DEVICES,
    ),
    googleState(),
  ],
  saints: ['snowden'],
};

// --- Microsoft: Outlook and the Microsoft account --------------------------

const MS_POLICE = { subpoena: 'A subpoena gets Microsoft to hand over your name, email address, country and ZIP code, and sign-in IP addresses.' };
const msDesk = () => usDesk('Microsoft', { police: MS_POLICE }, MS_REQUESTS);
const MS_ACTIVITY = [{ label: 'Microsoft Support: What is the Recent activity page?', url: 'https://support.microsoft.com/en-us/accounts-billing/security/what-is-the-recent-activity-page' }];
const MS_PASSKEY = [{ label: 'Microsoft Support: Create and save a passkey', url: 'https://support.microsoft.com/en-us/accounts-billing/security/create-save-passkey' }];
const MS_SMS = { label: 'Microsoft Support: Microsoft to stop sending SMS codes for personal accounts', url: 'https://support.microsoft.com/en-us/accounts-billing/manage/microsoft-to-stop-sending-sms-codes-for-personal-accounts' };
const MS_SIM_HOW = `${SIM_HOW} Microsoft has said it’s phasing out text-message codes for personal accounts, calling them a leading source of fraud.`;

const msState = () => ({
  id: 'state',
  metaphor: 'vents',
  actor: `CIA · Chinese state hackers (Storm-0558, 2023) · ${PEGASUS_ACTOR}`,
  actorNote: `Microsoft calls Storm-0558 a China-based group with espionage aims. ${PEGASUS_NOTE}`,
  how: `${AROUND} ${CIA_LINE} In 2023 Microsoft said Storm-0558 had obtained a Microsoft signing key, forged sign-in tokens with it, and read email at about 25 organizations, government agencies among them, plus some related personal accounts, through Outlook on the web and Outlook.com. ${PEGASUS_LINE}`,
  rule: 'beyond',
  sources: [
    ...VAULT7,
    { label: 'Microsoft (2023): Mitigation for China-based threat actor activity', url: 'https://blogs.microsoft.com/on-the-issues/2023/07/11/mitigation-china-based-threat-actor/' },
    { label: 'Microsoft Security (2023): Analysis of Storm-0558 techniques for unauthorized email access', url: 'https://www.microsoft.com/en-us/security/blog/2023/07/14/analysis-of-storm-0558-techniques-for-unauthorized-email-access/' },
    ...PEGASUS,
  ],
});

const outlook = {
  accountId: 'outlook',
  company: 'Microsoft',
  deskIntro: DESK_INTRO('Microsoft'),
  desk: msDesk(),
  entries: [
    stuffing('Outlook', 'outlook-fortify-password'),
    simSwap('outlook-fortify-2fa-upgrade', { how: MS_SIM_HOW, sources: [MS_SMS] }),
    phishing('Microsoft', 'Add a passkey to your Microsoft account and sign in with it every time.', 'outlook-fortify-2fa-upgrade', MS_PASSKEY),
    nearYou(
      'A phone, laptop or tablet that’s still signed in opens your mail with no password at all. Old devices and borrowed ones count. Microsoft’s Recent activity page shows the last 30 days of sign-ins.',
      'Check your Microsoft account’s Recent activity and mark anything that wasn’t you.',
      'outlook-recon-login',
      MS_ACTIVITY,
    ),
    msState(),
  ],
  saints: ['snowden'],
};

const microsoft = {
  accountId: 'microsoft',
  company: 'Microsoft',
  deskIntro: DESK_INTRO('Microsoft'),
  desk: msDesk(),
  entries: [
    stuffing('Microsoft account', 'microsoft-fortify-password'),
    simSwap('microsoft-fortify-2fa-upgrade', { how: MS_SIM_HOW, sources: [MS_SMS] }),
    phishing('Microsoft', 'Add a passkey to your Microsoft account and sign in with it every time.', 'microsoft-fortify-2fa-upgrade', MS_PASSKEY),
    nearYou(
      'A phone, laptop or tablet that’s still signed in to your Microsoft account opens your files, mail and anything you sign in to with Microsoft, with no password at all. Microsoft’s Recent activity page shows the last 30 days of sign-ins.',
      'Check your Microsoft account’s Recent activity and mark anything that wasn’t you.',
      'microsoft-recon-login',
      MS_ACTIVITY,
    ),
    msState(),
  ],
  saints: ['snowden'],
};

// --- Apple: iCloud Mail and the Apple Account ------------------------------

const APPLE_POLICE = {
  subpoena: 'A subpoena gets Apple to hand over your name, address, email address and phone number, and iCloud connection logs with IP addresses (kept up to 25 days).',
  order: 'A 2703(d) court order adds your mail logs: who you wrote to and when (kept up to 25 days).',
  extra: 'With Advanced Data Protection turned on, a warrant no longer reaches your iCloud Backup, Photos, iCloud Drive or Notes: Apple doesn’t hold the keys. iCloud Mail, Contacts and Calendars aren’t covered, so a warrant still reaches them.',
};
const appleDesk = () => usDesk('Apple', {
  police: APPLE_POLICE,
  lines: {
    'local-police': { text: '', sources: [APPLE_ICLOUD_SECURITY, APPLE_ADP] },
    'uk-cloud-act': { text: 'Apple no longer offers Advanced Data Protection to new users in the UK, so for them the data it would cover stays on this desk.', sources: [APPLE_ADP_UK, APPLE_ICLOUD_SECURITY] },
  },
}, APPLE_LEGAL);
const APPLE_INTRO = 'Apple holds this data, so an agency that wants it asks Apple, not you. One setting changes this floor: Advanced Data Protection end-to-end encrypts your backups, photos, iCloud Drive and notes, so Apple can’t hand those over. It doesn’t cover iCloud Mail, contacts or calendars. The rest is here so you know exactly who can ask, and with what.';
const APPLE_DEVICES = [{ label: 'Apple Support: Review devices signed in to your Apple Account', url: 'https://support.apple.com/en-us/102649' }];
const APPLE_KEYS = [{ label: 'Apple Support: About Security Keys for Apple Account', url: 'https://support.apple.com/en-us/102637' }];
const APPLE_2FA = { label: 'Apple Support: Two-factor authentication for Apple Account', url: 'https://support.apple.com/en-us/102660' };
const APPLE_SIM = {
  how: 'The crew talks a carrier employee into moving your phone number onto a SIM the crew holds, or pays one to. Apple shows sign-in codes on your trusted devices, but it can also text one to your trusted phone number, and that text goes along with the number.',
  fix: 'Add security keys to your Apple Account. With keys on, a key or one of your trusted devices is the only way to sign in.',
  sources: [APPLE_2FA, ...APPLE_KEYS],
};
const APPLE_PHISH_FIX = 'Add security keys to your Apple Account (Apple asks for at least two).';
const APPLE_DEVICES_HOW = 'A phone, laptop or tablet that’s still signed in to your Apple Account can sync your iCloud data, receive your sign-in codes and even change your password. Old devices and borrowed ones count.';
const APPLE_DEVICES_FIX = 'Check the devices on your Apple Account and remove any that aren’t yours.';

const appleState = () => ({
  id: 'state',
  metaphor: 'vents',
  actor: `CIA · ${PEGASUS_ACTOR}`,
  actorNote: PEGASUS_NOTE,
  how: `These go around the locks, into the iPhone or Mac itself. The CIA’s hacking tools, iPhone and Mac tools among them, were exposed in the Vault 7 leak (2017). In 2021 Citizen Lab found FORCEDENTRY, a Pegasus exploit that came in through iMessage with no tap needed, on a Saudi activist’s phone.`,
  rule: 'beyond',
  narrows: 'Apple’s Lockdown Mode is an optional, extreme protection for the very few people personally targeted by attacks like these.',
  sources: [
    ...VAULT7,
    { label: 'Citizen Lab (2021): FORCEDENTRY, NSO Group iMessage zero-click exploit captured in the wild', url: 'https://citizenlab.ca/research/forcedentry-nso-group-imessage-zero-click-exploit-captured-in-the-wild/' },
    ...PEGASUS,
    { label: 'Apple Support: About Lockdown Mode', url: 'https://support.apple.com/en-us/105120' },
  ],
});

const appleInterior = (accountId, product) => ({
  accountId,
  company: 'Apple',
  deskIntro: APPLE_INTRO,
  desk: appleDesk(),
  entries: [
    stuffing(product, `${accountId}-fortify-password`),
    simSwap(`${accountId}-fortify-2fa-upgrade`, APPLE_SIM),
    // With security keys on, keys are the only way in (Apple 102637): no backdoor note.
    { ...phishing('Apple', APPLE_PHISH_FIX, `${accountId}-fortify-2fa-upgrade`, APPLE_KEYS, 'a security key'), sealedNote: null },
    nearYou(APPLE_DEVICES_HOW, APPLE_DEVICES_FIX, `${accountId}-recon-login`, APPLE_DEVICES),
    appleState(),
  ],
  saints: ['snowden'],
});

const icloud = appleInterior('icloud', 'iCloud Mail');
const apple_id = appleInterior('apple_id', 'your Apple Account');

// --- Yahoo ------------------------------------------------------------------

const yahoo = {
  accountId: 'yahoo',
  company: 'Yahoo',
  deskIntro: DESK_INTRO('Yahoo'),
  desk: usDesk('Yahoo', {
    police: {
      subpoena: 'A subpoena gets Yahoo to hand over your name, alternate email address, location, sign-in details and IP addresses.',
      content: 'Yahoo lists a search warrant, signed by a judge, as the way to get what you actually wrote.',
    },
  }, YAHOO_FAQ, YAHOO_US),
  entries: [
    stuffing('Yahoo Mail', 'yahoo-fortify-password'),
    simSwap('yahoo-fortify-2fa-upgrade'),
    phishing('Yahoo', 'Add a passkey to your Yahoo account and sign in with it every time.', 'yahoo-fortify-2fa-upgrade', [
      { label: 'Yahoo Help: Create or remove a passkey from your Yahoo account', url: 'https://help.yahoo.com/kb/SLN35635.html' },
      { label: 'Yahoo Help: 2-Step Verification with a security key', url: 'https://help.yahoo.com/kb/SLN35380.html' },
    ]),
    nearYou(
      'A phone, laptop or tablet that’s still signed in opens your mail with no password at all. Old devices and borrowed ones count.',
      'Check Current sign-ins on your Yahoo Account security page and sign out of any that aren’t yours.',
      'yahoo-recon-login',
      [{ label: 'Yahoo Help: Find and remove unusual activity on your Yahoo account', url: 'https://help.yahoo.com/kb/SLN2073.html' }],
    ),
    {
      id: 'state',
      metaphor: 'vents',
      actor: `CIA · Russian FSB officers (the Yahoo break-in, 2014) · ${PEGASUS_ACTOR}`,
      actorNote: `The FSB is Russia’s Federal Security Service. ${PEGASUS_NOTE}`,
      how: `${AROUND} ${CIA_LINE} In 2017 the US Justice Department charged two FSB officers, and two hackers working with them, over a break-in at Yahoo that began in 2014: data on at least 500 million accounts was stolen, and at least 6,500 accounts were broken into. ${PEGASUS_LINE}`,
      rule: 'beyond',
      sources: [
        ...VAULT7,
        { label: 'US Department of Justice (2017): U.S. charges Russian FSB officers and their criminal conspirators for hacking Yahoo and millions of email accounts', url: 'https://www.justice.gov/archives/opa/pr/us-charges-russian-fsb-officers-and-their-criminal-conspirators-hacking-yahoo-and-millions' },
        { label: 'Wikipedia: Yahoo data breaches', url: 'https://en.wikipedia.org/wiki/Yahoo_data_breaches' },
        ...PEGASUS,
      ],
    },
  ],
  saints: ['snowden'],
};

// --- Meta: Facebook ---------------------------------------------------------

const facebook = {
  accountId: 'facebook',
  company: 'Meta',
  deskIntro: DESK_INTRO('Meta'),
  desk: usDesk('Meta', {
    police: {
      subpoena: 'A subpoena gets Meta to hand over your name, email address, card details, how long you’ve had the account, and recent sign-in IP addresses.',
      order: 'A 2703(d) court order adds message headers: who you wrote to and when.',
      content: 'Meta requires a search warrant, signed by a judge, before handing over your messages, photos, videos and posts.',
      extra: 'Chats that are end-to-end encrypted are the exception: Meta can’t provide what was said in them, only message and call logs, and IP data.',
    },
    lines: {
      'local-police': { text: '', sources: [META_E2EE] },
      fbi: { text: 'Meta reads a National Security Letter as reaching only your name and how long you’ve had the account.', sources: [] },
    },
  }, META_LAW),
  entries: [
    stuffing('Facebook', 'facebook-fortify-password'),
    simSwap('facebook-fortify-2fa-upgrade'),
    phishing('Facebook', 'Add a passkey to your Facebook account and sign in with it every time.', 'facebook-fortify-2fa-upgrade', [
      { label: 'Meta (2025): Introducing passkeys on Facebook for an easier sign-in', url: 'https://about.fb.com/news/2025/06/introducing-passkeys-facebook-easier-sign-in/' },
    ]),
    nearYou(
      'A phone, laptop or tablet that’s still logged in opens your Facebook account with no password at all. Old devices and borrowed ones count.',
      'Check Where you’re logged in and log out of any session that isn’t yours.',
      'facebook-recon-login',
      [{ label: 'Facebook Help: Log out of Facebook on another device', url: 'https://www.facebook.com/help/211990645501187' }],
    ),
    {
      id: 'state',
      metaphor: 'vents',
      actor: `CIA · ${PEGASUS_ACTOR}`,
      actorNote: PEGASUS_NOTE,
      how: `These go around the locks, into the phone or laptop where Facebook is already signed in. ${CIA_LINE} ${PEGASUS_LINE}`,
      rule: 'beyond',
      sources: [...VAULT7, ...PEGASUS],
    },
  ],
  saints: ['snowden'],
};

// --- Proton (Swiss) ---------------------------------------------------------

const protonmail = {
  accountId: 'protonmail',
  company: 'Proton',
  deskIntro: 'Proton is a Swiss company, so only a Swiss order can make it hand anything over. The bodies and attachments of your mail are stored encrypted with keys Proton doesn’t have, so the desk can’t hand those over. Subject lines aren’t end-to-end encrypted. Nothing you do changes this floor. It’s here so you know exactly who can ask, and with what.',
  desk: [
    {
      id: 'swiss-order',
      actor: 'Swiss prosecutors and courts',
      tool: 'Swiss legal order',
      gets: 'A binding Swiss order can make Proton hand over the account details it has, and can make Proton start logging the IP address you connect from. It can’t reach the bodies and attachments of your mail: those are end-to-end encrypted, and Proton has no way to decrypt them. Subject lines aren’t end-to-end encrypted, and Proton says reaching them takes an order approved by a Swiss judge.',
      sources: [PROTON_TRANSPARENCY, PROTON_PRIVACY, PROTON_CLIMATE, PROTON_ENCRYPTION],
    },
    {
      id: 'foreign-via-swiss',
      actor: 'Foreign police and agencies, through Swiss authorities',
      actorNote: 'Swiss law bars Proton from handing data to foreign authorities directly, so FBI or French police requests have to go through Switzerland.',
      tool: 'International legal assistance request, then a Swiss order',
      gets: 'Proton rejects requests sent straight from other countries. Swiss authorities can take one up if it meets Swiss law, and then it arrives as a Swiss order. In 2021, in a case against French activists, an order issued that way had Proton collect information on a French climate activist’s account. Proton has said such an order can make it log your IP address; no messages were handed over.',
      sources: [PROTON_TRANSPARENCY, PROTON_CLIMATE, WIKI_PROTON],
    },
  ],
  entries: [
    stuffing('Proton', 'protonmail-fortify-password'),
    simSwap('protonmail-fortify-2fa-upgrade', {
      how: 'The crew talks a carrier employee into moving your phone number onto a SIM the crew holds, or pays one to. Proton’s two-step sign-in doesn’t use texts, but if your phone number is a recovery method, the crew, holding your password too, can have a two-step recovery code texted to it.',
      fix: 'Use an authenticator app or a security key for two-step sign-in, and take the phone number out of your recovery methods (a recovery phrase can stand in).',
      sources: [{ label: 'Proton Support: Two-factor authentication (2FA)', url: 'https://proton.me/support/two-factor-authentication-2fa' }],
    }),
    // A FIDO key signs only for Proton's real site. But adding a key leaves
    // an authenticator app on: "You can also have authenticator app 2FA and
    // security key 2FA enabled at the same time ... Any of your 2FA devices
    // will allow you to sign in" (Proton Support, two-factor-authentication-2fa,
    // checked 2026-10-20), so a password plus a phished code still gets in.
    { ...phishing('Proton', 'Add a security key to your Proton account.', 'protonmail-fortify-2fa-upgrade', [
      { label: 'Proton Support: Set up two-factor authentication with a security key', url: 'https://proton.me/support/2fa-security-key' },
      { label: 'Proton Support: Two-factor authentication (2FA)', url: 'https://proton.me/support/two-factor-authentication-2fa' },
    ], 'a security key'), sealedNote: 'Sealed while you sign in with the security key. If an authenticator code still works as a backup, a page that asks for your password and a code is the tell.' },
    nearYou(
      'A phone, laptop or tablet that’s still signed in opens your mail with no password at all, already decrypted. Old devices and borrowed ones count.',
      'Check Session management in your Proton settings and revoke any session that isn’t yours.',
      'protonmail-recon-login',
      [{ label: 'Proton Support: Logging out of sessions', url: 'https://proton.me/support/log-out-all-other-sessions' }],
    ),
    {
      id: 'state',
      metaphor: 'vents',
      actor: `CIA · ${PEGASUS_ACTOR}`,
      actorNote: PEGASUS_NOTE,
      how: `Encryption doesn’t help once the phone or laptop itself is taken over: mail is decrypted to be read, and spyware reads it there. ${CIA_LINE} ${PEGASUS_LINE}`,
      rule: 'beyond',
      sources: [...VAULT7, ...PEGASUS],
    },
  ],
  saints: ['zimmermann'],
};

export const MASTER_KEYS_INTERIORS = { gmail, outlook, icloud, yahoo, protonmail, apple_id, google, microsoft, facebook };
