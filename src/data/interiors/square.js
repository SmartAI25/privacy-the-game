// Building Interiors: The Square. Signal first, as the end-to-end encrypted
// contrast to the Master Keys: its records desk is one sticky note.
// Sources, checked 2026-10-20:
//  - signal.org/bigbrother: every published request (grand jury subpoenas,
//    search warrants, a Luxembourg MLAT order); "the only information we can
//    produce ... is the date and time a user registered with Signal and the
//    last date of a user's connectivity to the Signal service"; Signal
//    doesn't have messages, calls, profile, group or contact information.
//  - Signal Support, "Signal PIN": a PIN can serve as a registration lock;
//    with the lock on, registering the number on another device waits on the
//    PIN (or 7 days of inactivity). Bot-walled to curl; read in a browser.
//  - Signal Support, "Linked Devices": Desktop, iPad, iPhone or Android can
//    be linked by scanning a QR code with the phone; chats and the last 45
//    days of media can sync; review under Settings → Linked devices.
//  - Signal Support, "Set and manage disappearing messages": the message is
//    deleted from disk when the timer ends; not a defense against a
//    recipient who takes a photo of the screen.
//  - Wikipedia, Vault 7: Signal's and WhatsApp's encryption wasn't reported
//    cracked; it can be bypassed by capturing input on the device.
//  - Signal blog (2021), Cellebrite: software that physically extracts and
//    indexes data from phones in hand. EFF (2017), Digital Privacy at the
//    U.S. Border: agents may ask travelers to unlock devices and can seize
//    them if travelers decline.
//  - Apple Support, Lockdown Mode: optional, extreme protection for the very
//    few personally targeted.

const SIGNAL_BIGBROTHER = { label: 'Signal: Government requests (published subpoena and warrant responses)', url: 'https://signal.org/bigbrother/' };
const SIGNAL_PIN = { label: 'Signal Support: Signal PIN (registration lock)', url: 'https://support.signal.org/hc/en-us/articles/360007059792' };
const SIGNAL_LINKED = { label: 'Signal Support: Linked devices', url: 'https://support.signal.org/hc/en-us/articles/360007320551' };
const SIGNAL_DISAPPEARING = { label: 'Signal Support: Set and manage disappearing messages', url: 'https://support.signal.org/hc/en-us/articles/360007320771' };

const signal = {
  accountId: 'signal',
  company: 'Signal',
  deskIntro: 'Your messages live on your devices, not on Signal’s servers. So an agency that asks Signal gets one sticky note, and Signal says that’s all it has to give. Nothing you do changes this floor.',
  desk: [
    {
      id: 'any-request',
      actor: 'Any agency, any legal process',
      tool: 'Subpoena · search warrant · foreign legal assistance order',
      gets: 'The date and time your account was created, and its last connection date. Not your messages, contacts, groups or profile: Signal doesn’t have them to give.',
      sources: [SIGNAL_BIGBROTHER],
    },
  ],
  entries: [
    {
      id: 'number',
      metaphor: 'number',
      actor: 'A SIM-swap crew',
      how: 'The crew talks a carrier employee into moving your phone number onto a SIM the crew holds, then tries to register Signal with your number on its own phone. Without a registration lock, the crew can sign up as you. Your old messages aren’t on Signal’s servers, so those stay on your phone.',
      rule: 'reglock',
      fix: 'Turn on Registration Lock, so registering your number on a new phone needs your Signal PIN.',
      fixMission: 'signal-fortify-reglock',
      sources: [
        SIGNAL_PIN,
        { label: 'FBI IC3 (2022): Criminals increasing SIM swap schemes to steal millions', url: 'https://www.ic3.gov/PSA/2022/PSA220208' },
        { label: 'Wikipedia: SIM swap scam', url: 'https://en.wikipedia.org/wiki/SIM_swap_scam' },
      ],
    },
    {
      id: 'linked-device',
      metaphor: 'back-room',
      actor: 'Someone near you (partner, roommate, thief)',
      how: 'Linking Signal Desktop or a tablet takes your unlocked phone for a minute and a QR code. The linked device then gets your messages as you do, and can copy over your chats.',
      rule: 'devices',
      fix: 'Open Linked devices in Signal’s settings and unlink any you don’t use or recognize.',
      fixMission: 'signal-recon-devices',
      sources: [SIGNAL_LINKED],
    },
    {
      id: 'spyware',
      metaphor: 'vents',
      actor: 'CIA · a spyware vendor’s government customer (NSO Group’s Pegasus)',
      actorNote: 'NSO Group sells Pegasus to government agencies.',
      how: 'Signal’s encryption hasn’t been reported cracked. Spyware goes around it, into the phone itself, and reads messages before encryption or after arrival. The CIA’s phone hacking tools were exposed in the Vault 7 leak (2017). Citizen Lab has found Pegasus on the phones of journalists and activists.',
      rule: 'beyond',
      narrows: 'On an iPhone, Apple’s Lockdown Mode is an optional, extreme protection for the very few people personally targeted like this.',
      sources: [
        { label: 'Wikipedia: Vault 7', url: 'https://en.wikipedia.org/wiki/Vault_7' },
        { label: 'WikiLeaks: Vault 7 (2017)', url: 'https://wikileaks.org/ciav7p1/' },
        { label: 'Citizen Lab: NSO Group research', url: 'https://citizenlab.ca/tag/nso-group/' },
        { label: 'Wikipedia: Pegasus (spyware)', url: 'https://en.wikipedia.org/wiki/Pegasus_(spyware)' },
        { label: 'Apple Support: About Lockdown Mode', url: 'https://support.apple.com/en-us/105120' },
      ],
    },
    {
      id: 'unlocked-phone',
      metaphor: 'front-door',
      actor: 'Local police, the FBI or CBP border officers, with your phone in hand',
      actorNote: 'CBP is US Customs and Border Protection.',
      how: 'Your messages live on your phone, so whoever holds it unlocked can read them. Forensic kits like Cellebrite’s copy and index what’s on a phone in hand. At the US border, agents may ask you to unlock your phone, and can seize it if you decline.',
      rule: 'beyond',
      narrows: 'Disappearing messages limit what is there.',
      sources: [
        { label: 'Signal (2021): Exploiting vulnerabilities in Cellebrite UFED and Physical Analyzer', url: 'https://signal.org/blog/cellebrite-vulnerabilities/' },
        { label: 'EFF (2017): Digital privacy at the U.S. border', url: 'https://www.eff.org/wp/digital-privacy-us-border-2017' },
        SIGNAL_DISAPPEARING,
      ],
    },
  ],
  saints: ['zimmermann'],
};

export const SQUARE_INTERIORS = { signal };
