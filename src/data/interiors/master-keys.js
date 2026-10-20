// Building Interiors: The Master Keys. The email and cloud accounts that can
// reset every other account. Task 1 has Gmail; the rest arrive in Task 7.
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
//    was accessing the Gmail accounts of Chinese human rights activists".
//    Wikipedia: traced to the Beijing-based Elderwood group, "with
//    associations with the People's Liberation Army".
//  - Pegasus: NSO Group supplies "authorized governments" (Wikipedia); Citizen
//    Lab has documented Pegasus on the phones of journalists and activists.
//  - Google Advanced Protection: for people at higher risk; requires a passkey
//    or security key and checks risky downloads more strictly.
import { localPolice, fbi, nsa702, iceHsi, ukCloudAct, withSources } from './lanes.js';

const GOOGLE_REQUESTS = { label: 'Google: how Google handles government requests for user information', url: 'https://policies.google.com/terms/information-requests' };
const GOOGLE_TRANSPARENCY = { label: 'Google Transparency Report: global requests for user information', url: 'https://transparencyreport.google.com/user-data/overview' };

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
const STATE_SOURCES = [
  { label: 'WikiLeaks: Vault 7 (2017)', url: 'https://wikileaks.org/ciav7p1/' },
  { label: 'Wikipedia: Vault 7', url: 'https://en.wikipedia.org/wiki/Vault_7' },
  { label: 'Google (2010): A new approach to China', url: 'https://googleblog.blogspot.com/2010/01/new-approach-to-china.html' },
  { label: 'Wikipedia: Operation Aurora', url: 'https://en.wikipedia.org/wiki/Operation_Aurora' },
  { label: 'Citizen Lab: NSO Group research', url: 'https://citizenlab.ca/tag/nso-group/' },
  { label: 'Wikipedia: Pegasus (spyware)', url: 'https://en.wikipedia.org/wiki/Pegasus_(spyware)' },
  { label: 'Google: Advanced Protection Program', url: 'https://landing.google.com/advancedprotection/' },
];

const DESK_INTRO = (company) => `${company} holds this data, so an agency that wants it asks ${company}, not you. Nothing you do changes this floor. It’s here so you know exactly who can ask, and with what.`;

const gmail = {
  accountId: 'gmail',
  company: 'Google',
  deskIntro: DESK_INTRO('Google'),
  desk: [
    localPolice('Google'),
    fbi('Google'),
    nsa702('Google', { prismNamed: true }),
    iceHsi('Google'),
    ukCloudAct('Google'),
  ].map((lane) => withSources(lane, GOOGLE_REQUESTS, GOOGLE_TRANSPARENCY)),
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
      fix: 'Add a passkey to your Google account.',
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
      sources: [{ label: 'Google Help: See devices with account access', url: 'https://support.google.com/accounts/answer/3067630' }],
    },
    {
      id: 'state',
      metaphor: 'vents',
      actor: 'CIA · Chinese state hackers (Operation Aurora, 2010) · a spyware vendor’s government customer (NSO Group’s Pegasus)',
      actorNote: 'Security researchers traced Aurora to Elderwood, a Beijing-based group with ties to China’s military. NSO Group sells Pegasus to government agencies.',
      how: 'These go around the locks: into the phone or laptop itself, or into the company. The CIA’s phone and computer hacking tools were exposed in the Vault 7 leak (2017). In 2010 Google said the Aurora attackers had gone after the Gmail accounts of Chinese human rights activists. Citizen Lab has found Pegasus on the phones of journalists and activists.',
      rule: 'beyond',
      narrows: 'For people at higher risk, Google’s Advanced Protection Program requires a passkey or security key to sign in and is stricter about risky downloads.',
      sources: STATE_SOURCES,
    },
  ],
  saints: ['snowden'],
};

export const MASTER_KEYS_INTERIORS = { gmail };
