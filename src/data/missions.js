import { ACCOUNTS } from './accounts.js';
import { VAULT_CAPITOL_MISSIONS } from './missions-vault-capitol.js';
import { MISSIONS_SQUARE_ARCHIVES_MARKETPLACE } from './missions-square-archives-marketplace.js';
import { PERIMETER_MISSIONS } from './missions-perimeter.js';
import { RECLAMATION_MISSIONS } from './missions-reclamation.js';
import { FREEWAY_MISSIONS } from './missions-freeway.js';
import { FOUNDRY_MISSIONS } from './missions-foundry.js';
import { GRID_MISSIONS } from './missions-grid.js';
import { CLINIC_MISSIONS } from './missions-clinic.js';
import { TRAIL_MISSIONS } from './missions-trail.js';
import { OSINT_SIEVE_MISSIONS } from './missions-osint-sieve.js';

const BREACH_DEBRIEF = [
  {
    id: 'finding',
    label: 'What did you find?',
    options: [
      { value: 'no-breaches', text: 'No breaches found', severity: 'safe' },
      { value: '1-2-breaches', text: 'Found in 1-2 breaches', severity: 'warn' },
      { value: '3plus-breaches', text: 'Found in 3+ breaches', severity: 'crit' },
      { value: 'skip', text: 'Couldn\'t check right now', severity: 'skip' },
    ],
  },
];

const LOGIN_DEBRIEF = [
  {
    id: 'finding',
    label: 'What did you find?',
    options: [
      { value: 'no-breaches', text: 'No unrecognized logins', severity: 'safe' },
      { value: '1-2-breaches', text: 'Found suspicious activity', severity: 'warn' },
      { value: '3plus-breaches', text: 'Confirmed unauthorized access', severity: 'crit' },
      { value: 'skip', text: 'Couldn\'t check right now', severity: 'skip' },
    ],
  },
];

const PASSWORD_DEBRIEF = [
  {
    id: 'action',
    label: 'Did you update your password?',
    options: [
      { value: 'reset-password', text: 'Yes, changed to a new unique password', severity: 'safe' },
      { value: 'already-strong', text: 'It was already unique and strong', severity: 'safe' },
      { value: 'later', text: 'I\'ll come back to this', severity: 'skip' },
    ],
  },
];

const TWO_FA_DEBRIEF = [
  {
    id: 'action',
    label: 'Did you set up two-factor authentication?',
    options: [
      { value: 'enabled-2fa', text: 'Yes, 2FA is now enabled', severity: 'safe' },
      { value: 'already-enabled', text: 'It was already enabled', severity: 'safe' },
      { value: 'later', text: 'I\'ll come back to this', severity: 'skip' },
    ],
  },
];

const PRIVACY_DEBRIEF = [
  {
    id: 'action',
    label: 'Did you review and tighten privacy settings?',
    options: [
      { value: 'tightened', text: 'Yes, reviewed and locked down', severity: 'safe' },
      { value: 'already-tight', text: 'Settings were already tight', severity: 'safe' },
      { value: 'later', text: 'I\'ll come back to this', severity: 'skip' },
    ],
  },
];

function scoutBreach(clean, mild, severe) {
  return {
    'no-breaches': clean,
    '1-2-breaches': mild,
    '3plus-breaches': severe,
    'skip': '"No rush. This mission will be here when you\'re ready."',
  };
}

function scoutLogin(clean, suspicious, confirmed) {
  return {
    'no-breaches': clean,
    '1-2-breaches': suspicious,
    '3plus-breaches': confirmed,
    'skip': '"Take your time -- we\'ll circle back."',
  };
}

const CHAPTER_1_MISSIONS = [
  // ══════════════════════════════════════════════════════
  // GMAIL
  // ══════════════════════════════════════════════════════
  {
    id: 'gmail-recon-breach',
    accountId: 'gmail',
    phase: 'recon',
    title: 'Breach Recon: Gmail',
    briefing: 'Data brokers buy and sell leaked credentials by the million. If your Gmail password appeared in a breach, it\'s already loaded into automated attack scripts hitting login pages around the clock. Gmail is the master key -- password resets for most of your other accounts flow through it.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed, just the search box', url: 'https://haveibeenpwned.com' },
      { text: 'Type your Gmail address in the big search box and hit the "pwned?" button' },
      { text: 'Green screen = "No pwnage found" -- your email wasn\'t in any known breaches' },
      { text: 'Red screen = breaches found. Scroll down to see which ones. Each entry shows the company that was breached, when it happened, and what data was exposed (email, password, etc.)' },
      { text: 'If it says "Passwords" in any breach -- that means your actual password was leaked. You MUST change it in the Fortify phase.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Gmail is the master key. Most of your password resets flow through it -- lose this and you lose access to everything downstream."',
      debrief: scoutBreach(
        '"Clean -- that\'s a solid start. Your email fortress is holding."',
        '"Found some exposure. Not unusual -- the important thing is we caught it."',
        '"That\'s a lot of exposure. Good thing we\'re here. Let\'s lock it down."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'gmail-recon-login',
    accountId: 'gmail',
    phase: 'recon',
    title: 'Login History: Gmail',
    briefing: 'Your Google account logs every sign-in: device, location, browser. An unrecognized login means someone else has been inside your account, reading your mail and resetting your other passwords.',
    steps: [
      { text: 'Open Google Security -- you may need to sign in first, that\'s normal', url: 'https://myaccount.google.com/security' },
      { text: 'Scroll down to "Your devices". You\'ll see a list of phones, laptops, and tablets signed into your Google account.' },
      { text: 'Each device shows a name (like "iPhone" or "MacBook Pro"), an operating system version, and when it was last used. Old OS versions mean old devices.' },
      { text: 'See a device you don\'t recognize? Tap it, then tap "Sign out". If it\'s yours but old, sign out anyway -- you can always sign back in.' },
      { text: 'Now scroll to "Recent security activity". This shows sign-ins, password changes, and recovery email changes. Look for any you didn\'t do.' },
      { text: 'If you see a sign-in from a city you\'ve never been to, or a device you don\'t own -- that\'s suspicious. We\'ll deal with it in the Fortify phase.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Every sign-in leaves a trace. If someone else has been in here, we need to know -- and cut them off."',
      debrief: scoutLogin(
        '"All clear. No strangers in the house."',
        '"Something\'s off. Time to change the locks -- password reset and 2FA are next."',
        '"Confirmed intruder. We\'re going to fortify this immediately."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'gmail-fortify-password',
    accountId: 'gmail',
    phase: 'fortify',
    title: 'Password Reset: Gmail',
    briefing: 'A unique, long password is the single best defense for any account. If your Gmail password is reused anywhere -- or was exposed in a breach -- changing it closes that door permanently.',
    steps: [
      { text: 'Open Google Security -- sign in if prompted', url: 'https://myaccount.google.com/security' },
      { text: 'Scroll to "How you sign in to Google". Tap "Password". Google may ask you to sign in again -- that\'s normal.' },
      { text: 'Open your password manager (1Password, Bitwarden, Apple Keychain, etc.) and generate a new password -- 16+ characters, random.' },
      { text: 'Paste the new password into Google\'s form. Save it in your password manager BEFORE clicking Change.' },
      { text: 'Click "Change Password". Google will sign you out of some devices -- you\'ll re-sign-in with the new password.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"The strongest wall in your city. Make this one count -- long, unique, stored in a password manager."',
      debrief: {
        'reset-password': '"Fresh password locked in. One less door they can walk through."',
        'already-strong': '"Already unique and strong -- you\'re ahead of the game."',
        'later': '"Come back when you\'re ready. This one matters."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'gmail-fortify-2fa',
    accountId: 'gmail',
    phase: 'fortify',
    title: '2FA Setup: Gmail',
    briefing: 'Two-factor authentication means a stolen password alone isn\'t enough. Even if someone has your credentials, they can\'t get in without the second factor on your device.',
    steps: [
      { text: 'Open Google 2-Step Verification -- sign in if prompted', url: 'https://myaccount.google.com/signinoptions/two-step-verification' },
      { text: 'If it says "2-Step Verification is OFF" -- tap "Get Started" and follow the setup.' },
      { text: 'Google will ask you to choose a second factor. Best options, in order: 1) Security key (like YubiKey) 2) Google Authenticator app 3) Google prompts on your phone 4) SMS (worst, but better than nothing)' },
      { text: 'If you pick an authenticator app: download Google Authenticator or Authy from your phone\'s app store, scan the QR code, type the 6-digit code to confirm.' },
      { text: 'Google will give you backup codes -- screenshot them or write them down and store them somewhere safe. You\'ll need these if you lose your phone.' },
      { text: 'If it already says "2-Step Verification is ON" -- check what method you\'re using. If it\'s SMS only, consider adding an authenticator app as a more secure option.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"A password is a lock. 2FA is a deadbolt. Both together is how you keep people out."',
      debrief: {
        'enabled-2fa': '"Deadbolt installed. Even with the key, they\'re not getting in."',
        'already-enabled': '"Already locked down with 2FA. That\'s the way."',
        'later': '"This one\'s worth coming back to. It\'s the biggest single upgrade."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'gmail-reclaim-privacy',
    accountId: 'gmail',
    phase: 'reclaim',
    title: 'Privacy Review: Gmail',
    briefing: 'Google collects a staggering amount of data by default: search history, location timeline, ad profile, app permissions. Most of it can be dialed back without losing functionality.',
    steps: [
      { text: 'Open Google Privacy Checkup', url: 'https://myaccount.google.com/privacycheckup' },
      { text: 'Review each section: Web & App Activity, Location History, YouTube History' },
      { text: 'Pause or auto-delete what you don\'t need' },
      { text: 'Review third-party app access and revoke anything unnecessary' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Google knows more about you than you think. This is where you decide how much of that you\'re comfortable with."',
      debrief: {
        'tightened': '"Data footprint reduced. Less for brokers to harvest."',
        'already-tight': '"Already locked down -- well done."',
        'later': '"Privacy settings are a maze. Take your time."',
      },
    },
    estimatedMinutes: 10,
  },

  // ══════════════════════════════════════════════════════
  // OUTLOOK
  // ══════════════════════════════════════════════════════
  {
    id: 'outlook-recon-breach',
    accountId: 'outlook',
    phase: 'recon',
    title: 'Breach Recon: Outlook',
    briefing: 'Outlook and Hotmail addresses have been targets of massive breaches over the years. A leaked Outlook password gives attackers access to your Microsoft ecosystem -- OneDrive, Office, Teams, and everything linked through Microsoft SSO.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type your Outlook or Hotmail email address in the search box and tap "pwned?"' },
      { text: 'Green screen = no breaches found for this address. You\'re clear.' },
      { text: 'Red screen = breaches found. Scroll down -- each entry shows the breached company, date, and what data leaked (email, password, IP address, etc.)' },
      { text: 'If any breach lists "Passwords" -- your actual password was exposed. Changing it in the Fortify phase is critical.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Outlook is a gateway to the whole Microsoft universe. If this one\'s compromised, OneDrive, Teams, and Office go with it."',
      debrief: scoutBreach(
        '"No breaches. The Microsoft gate holds."',
        '"Some exposure found. Let\'s make sure that password is fresh."',
        '"Multiple breaches. This password needs to change today."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'outlook-recon-login',
    accountId: 'outlook',
    phase: 'recon',
    title: 'Login History: Outlook',
    briefing: 'Microsoft tracks recent sign-ins with timestamps and locations. Unfamiliar entries mean someone else has had access to your email, files, and any service you sign into with Microsoft.',
    steps: [
      { text: 'Open Microsoft Recent Activity -- sign in with your Outlook/Hotmail email and password if prompted', url: 'https://account.live.com/Activity' },
      { text: 'You\'ll see a list of sign-ins. Each one shows: date and time, the app used (Outlook, Edge, OneDrive), the device/browser, and the city/country.' },
      { text: 'Look at the locations. Sign-ins from cities you\'ve never been to are suspicious. Tap "Show more activity" to see older entries.' },
      { text: 'Each entry has a green check (successful) or red X (failed). Multiple failed attempts from one location means someone was trying to guess your password.' },
      { text: 'If you see something suspicious: scroll to the top and tap "Secure your account". Microsoft will walk you through changing your password and reviewing recovery info.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Microsoft logs every sign-in with the city and device. Look for places you\'ve never been -- that\'s someone else in your inbox."',
      debrief: scoutLogin(
        '"All known devices. Nobody\'s been snooping."',
        '"Suspicious activity spotted. Good catch -- let\'s shut that down."',
        '"Unauthorized access confirmed. Password change and 2FA are now urgent."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'outlook-fortify-password',
    accountId: 'outlook',
    phase: 'fortify',
    title: 'Password Reset: Outlook',
    briefing: 'Your Microsoft password protects not just email but OneDrive, Office 365, and any app using Microsoft SSO. A unique, strong password here closes the door to your entire Microsoft life.',
    steps: [
      { text: 'Open Microsoft security page -- sign in if prompted', url: 'https://account.microsoft.com/security' },
      { text: 'Click "Change password" (or tap "Password security" then "Change my password" on mobile).' },
      { text: 'Microsoft will ask for your current password first. Enter it.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it in the password manager BEFORE submitting.' },
      { text: 'Enter the new password twice and click "Save". Microsoft may sign you out of some apps -- just sign back in with the new password.' },
      { text: 'If Microsoft asks you to "make my account more secure" -- that\'s their prompt to set up 2FA. You can do it now or in the next mission.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"This password guards your entire Microsoft world. Make it unique, make it long."',
      debrief: {
        'reset-password': '"New password set. The Microsoft gate is reinforced."',
        'already-strong': '"Already solid. Moving on."',
        'later': '"Don\'t leave this one too long -- it\'s a high-value target."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'outlook-fortify-2fa',
    accountId: 'outlook',
    phase: 'fortify',
    title: '2FA Setup: Outlook',
    briefing: 'Microsoft supports authenticator apps, security keys, and phone verification. An authenticator app is the best balance of security and convenience -- SMS can be intercepted via SIM swapping.',
    steps: [
      { text: 'Open Microsoft security page -- sign in if prompted', url: 'https://account.microsoft.com/security' },
      { text: 'Look for "Two-step verification" and tap "Turn on". If you don\'t see it, tap "Advanced security options" first.' },
      { text: 'Microsoft will recommend the Microsoft Authenticator app. You can also use Google Authenticator, Authy, or any TOTP app.' },
      { text: 'If using an authenticator app: download it on your phone, tap "Set up Authenticator app" on the Microsoft page, scan the QR code with the app, and enter the 6-digit code to verify.' },
      { text: 'Microsoft will give you a recovery code. Save it somewhere safe -- password manager or printed on paper. You need this if you lose your phone.' },
      { text: 'If it\'s already on: check what method you\'re using. If it\'s just SMS, add an authenticator app as a stronger second option.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"Two factors beat one factor, every time. Authenticator app over SMS if you can."',
      debrief: {
        'enabled-2fa': '"Two-step is live. Your Microsoft account just got a lot harder to crack."',
        'already-enabled': '"Already protected. Nice."',
        'later': '"This one\'s high priority. Come back soon."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'outlook-reclaim-privacy',
    accountId: 'outlook',
    phase: 'reclaim',
    title: 'Privacy Review: Outlook',
    briefing: 'Microsoft collects browsing history, search data, and ad preferences across its ecosystem. The privacy dashboard lets you see and delete what\'s been collected, and limit future tracking.',
    steps: [
      { text: 'Open Microsoft Privacy Dashboard -- sign in if prompted', url: 'https://account.microsoft.com/privacy' },
      { text: 'You\'ll see categories: Browsing history, Search history, Location activity, Voice activity, Media activity. Tap each one.' },
      { text: 'For each category: review what Microsoft has collected, then tap "Clear" to delete it. This removes it from Microsoft\'s servers.' },
      { text: 'Scroll down to "Ad settings". Tap it and toggle OFF "See personalized ads in your browser" and "See personalized ads wherever I use my Microsoft account".' },
      { text: 'Check "App access" -- which apps are connected to your Microsoft account? Remove any you don\'t use.' },
      { text: 'If you use Cortana or Bing: check those sections too. Bing search history and Cortana voice recordings are stored here.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Microsoft\'s been keeping tabs. Let\'s see what they\'ve got and decide what stays."',
      debrief: {
        'tightened': '"Privacy tightened. Less data flowing to the ad machine."',
        'already-tight': '"Already locked down. Someone\'s been paying attention."',
        'later': '"It\'s a big dashboard. Chip away at it when you can."',
      },
    },
    estimatedMinutes: 10,
  },

  // ══════════════════════════════════════════════════════
  // ICLOUD
  // ══════════════════════════════════════════════════════
  {
    id: 'icloud-recon-breach',
    accountId: 'icloud',
    phase: 'recon',
    title: 'Breach Recon: iCloud Mail',
    briefing: 'Your iCloud address is tied to your Apple ID, which controls your photos, documents, device backups, and the ability to remotely wipe your devices. A leaked iCloud password is one of the most dangerous exposures possible.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type your @icloud.com or @me.com email address in the search box and tap "pwned?"' },
      { text: 'Green screen = no breaches found. Your iCloud email is clean.' },
      { text: 'Red screen = breaches found. Scroll down -- each breach shows the company, date, and what data leaked.' },
      { text: 'If "Passwords" appears in any breach -- your password was exposed. Because iCloud = Apple ID, this is urgent. Change it in the Fortify phase.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"iCloud is one of the big three identity providers. If someone gets these credentials, they get your photos, documents, location history, and can remote-wipe your devices."',
      debrief: scoutBreach(
        '"Clean. Your Apple fortress stands."',
        '"Some exposure. With iCloud the stakes are high -- let\'s move to fortify."',
        '"Multiple breaches on an Apple ID is serious. Password change is non-negotiable."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'icloud-recon-login',
    accountId: 'icloud',
    phase: 'recon',
    title: 'Login History: iCloud',
    briefing: 'Apple shows which devices are signed into your Apple ID. An unfamiliar device means someone else has access to your iCloud data -- photos, backups, Find My, and potentially your physical location.',
    steps: [
      { text: 'Open Apple ID account page -- sign in with your Apple ID if prompted', url: 'https://account.apple.com/account/manage' },
      { text: 'Scroll down to "Devices". You\'ll see every iPhone, iPad, Mac, Apple Watch, and Apple TV signed into this Apple ID.' },
      { text: 'Each device shows a name and model. Tap on any device to see its OS version and serial number. Older OS versions (like macOS 13) mean it\'s a device from years ago.' },
      { text: 'To figure out which device is which: on your Mac, go to Apple menu > About This Mac to see its name and serial number. On iPhone: Settings > General > About.' },
      { text: 'See a device you don\'t recognize? Tap it and tap "Remove from Account". If the button isn\'t available on the web, go to your Mac (System Settings > Apple ID) or iPhone (Settings > [your name] > scroll to devices).' },
      { text: 'Old devices you don\'t use anymore should be removed too -- they still have access to your iCloud data until you remove them.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Apple shows every device signed into your account. If there\'s a stranger on the list, they can see your photos and track your location."',
      debrief: scoutLogin(
        '"All your devices. Nobody\'s riding along."',
        '"Something unexpected in there. Remove unknown devices and change your password."',
        '"Unknown device confirmed. Remove it now, then we\'ll fortify."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'icloud-fortify-password',
    accountId: 'icloud',
    phase: 'fortify',
    title: 'Password Reset: iCloud',
    briefing: 'Your Apple ID password is the key to your entire Apple ecosystem. A unique, strong password here protects your iPhone backups, photos, payment methods, and every app using Sign in with Apple.',
    steps: [
      { text: 'Open Apple ID account page -- sign in if prompted', url: 'https://account.apple.com/account/manage' },
      { text: 'Tap "Sign-In and Security" in the sidebar. Then tap "Password".' },
      { text: 'Apple will ask for your current password first. Enter it.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it BEFORE you submit the change.' },
      { text: 'Enter the new password twice and tap "Change Password". Apple may sign you out of some devices -- sign back in with the new password.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"This is the big one. Your Apple ID password protects everything Apple -- phone backups, photos, payment methods, Find My."',
      debrief: {
        'reset-password': '"Apple ID secured with a fresh password. Major win."',
        'already-strong': '"Already unique and strong. Your Apple life is well-guarded."',
        'later': '"High priority. This one protects a lot of sensitive data."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'icloud-fortify-2fa',
    accountId: 'icloud',
    phase: 'fortify',
    title: '2FA Setup: iCloud',
    briefing: 'Apple\'s two-factor authentication sends a verification code to your trusted devices. Without it, anyone with your password can access your entire iCloud account from any device.',
    steps: [
      { text: 'Open Apple ID account page -- sign in if prompted', url: 'https://account.apple.com/account/manage' },
      { text: 'Tap "Sign-In and Security". Look for "Two-Factor Authentication" -- it will say On or Off.' },
      { text: 'If it says OFF: tap it and follow the prompts. Apple will ask for a trusted phone number where it can send verification codes.' },
      { text: 'If it says ON: check that your trusted phone number is current. If you changed numbers, update it here.' },
      { text: 'Apple\'s 2FA sends a popup with a 6-digit code to your other Apple devices. No separate app needed -- it\'s built into iOS and macOS.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"Apple\'s 2FA sends codes to your trusted devices. Without it, a password is all someone needs."',
      debrief: {
        'enabled-2fa': '"Two-factor is live on your Apple ID. Excellent."',
        'already-enabled': '"Already on -- Apple makes this pretty seamless."',
        'later': '"Come back to this soon. Apple ID without 2FA is a risk."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'icloud-reclaim-privacy',
    accountId: 'icloud',
    phase: 'reclaim',
    title: 'Privacy Review: iCloud',
    briefing: 'Apple collects less than Google or Microsoft, but there\'s still data to manage: app tracking, analytics sharing, and which apps have access to your contacts, photos, and location.',
    steps: [
      { text: 'On your iPhone: go to Settings > Privacy & Security. Tap "Tracking". Make sure "Allow Apps to Request to Track" is OFF -- this blocks cross-app tracking.' },
      { text: 'Still in Privacy & Security: tap "Location Services". For each app, change "Always" to "While Using" or "Never". Only maps and weather really need "Always".' },
      { text: 'Tap "Camera" and "Microphone" in the same menu. Turn off access for any app that doesn\'t need it. A flashlight app doesn\'t need your microphone.' },
      { text: 'Go to Settings > Privacy & Security > Analytics & Improvements. Turn off "Share iPhone Analytics" and "Improve Siri & Dictation" to stop sending usage data to Apple.' },
      { text: 'On the web: open Apple\'s privacy portal to see or delete data Apple has collected', url: 'https://privacy.apple.com' },
      { text: 'On the privacy portal: you can request a copy of your data (takes a few days) or request deletion of specific categories.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Apple\'s better than most on privacy, but there\'s still data to review. App tracking permissions are the big one."',
      debrief: {
        'tightened': '"Privacy tightened. Fewer apps tracking you across the web."',
        'already-tight': '"Already locked down. Apple\'s privacy tools are solid when you use them."',
        'later': '"The settings are scattered across device and web. Take your time."',
      },
    },
    estimatedMinutes: 10,
  },

  // ══════════════════════════════════════════════════════
  // YAHOO
  // ══════════════════════════════════════════════════════
  {
    id: 'yahoo-recon-breach',
    accountId: 'yahoo',
    phase: 'recon',
    title: 'Breach Recon: Yahoo Mail',
    briefing: 'Yahoo suffered two of the largest data breaches in history -- 3 billion accounts in 2013 and 500 million in 2014. If you\'ve ever had a Yahoo account, your data was almost certainly exposed.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type your @yahoo.com email address in the search box and tap "pwned?"' },
      { text: 'Green screen = somehow clean. You may be the luckiest Yahoo user alive.' },
      { text: 'Red screen = breaches found. With Yahoo, you\'ll almost certainly see their own breaches listed -- the 2013 breach hit 3 billion accounts.' },
      { text: 'Scroll through the breach list. If "Passwords" appears -- your password was in the leak. It\'s been on dark-web dump lists for years. Change it immediately in the Fortify phase.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Yahoo had two of the biggest breaches ever. Three billion accounts. If you\'ve ever used Yahoo, expect to find something."',
      debrief: scoutBreach(
        '"Somehow clean. You might be the luckiest Yahoo user alive."',
        '"Expected. Yahoo\'s breaches were massive. Let\'s make sure your current password is fresh."',
        '"Multiple breaches -- that\'s par for Yahoo unfortunately. Fortify time."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'yahoo-recon-login',
    accountId: 'yahoo',
    phase: 'recon',
    title: 'Login History: Yahoo',
    briefing: 'Yahoo tracks recent account activity. Given Yahoo\'s breach history, checking for unauthorized access is especially important -- old compromised credentials could still be in use.',
    steps: [
      { text: 'Open Yahoo Account Security -- sign in with your Yahoo email and password', url: 'https://login.yahoo.com/account/security' },
      { text: 'Tap "View login activity" or "Recent activity" (the label varies). You\'ll see a list of sign-ins with dates, locations, and device types.' },
      { text: 'Each entry shows a city/country and what type of device or browser was used. Look for locations you\'ve never been to.' },
      { text: 'If you see something unfamiliar: note the date and location. We\'ll change the password in the next phase to lock them out.' },
      { text: 'Also check "Connected apps" on this page -- any old apps or services that still have access to your Yahoo account should be revoked.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"With Yahoo\'s breach history, checking who\'s been in here is essential."',
      debrief: scoutLogin(
        '"No intruders. Maybe they\'ve forgotten about this one."',
        '"Suspicious activity. Change that password before they come back."',
        '"Unauthorized access confirmed. Lock it down now."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'yahoo-fortify-password',
    accountId: 'yahoo',
    phase: 'fortify',
    title: 'Password Reset: Yahoo',
    briefing: 'If your Yahoo password predates their mega-breaches, it\'s been circulating on the dark web for years. Even if you\'ve changed it since, make sure it\'s truly unique and not reused from another account.',
    steps: [
      { text: 'Open Yahoo Account Security -- sign in if prompted', url: 'https://login.yahoo.com/account/security' },
      { text: 'Tap "Change password". Yahoo will ask for your current password first.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it in the password manager BEFORE submitting.' },
      { text: 'Enter the new password twice and tap "Continue". Yahoo may ask you to re-sign in on your other devices.' },
      { text: 'If Yahoo offers to enable "Account Key" (passwordless sign-in) -- that\'s their version of passkeys. It\'s optional but more secure than a password.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Given Yahoo\'s history, if this password is old, it\'s been on every dark-web dump list for years."',
      debrief: {
        'reset-password': '"Fresh password on Yahoo. No more coasting on leaked credentials."',
        'already-strong': '"Already updated. Good discipline."',
        'later': '"If this password is old, it\'s urgent. Come back soon."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'yahoo-fortify-2fa',
    accountId: 'yahoo',
    phase: 'fortify',
    title: '2FA Setup: Yahoo',
    briefing: 'Yahoo supports two-step verification via phone and authenticator apps. Given their breach history, 2FA is especially important here -- it\'s the safety net for when passwords get leaked.',
    steps: [
      { text: 'Open Yahoo Account Security -- sign in if prompted', url: 'https://login.yahoo.com/account/security' },
      { text: 'Look for "Two-step verification" and tap it. If it says OFF, tap "Enable".' },
      { text: 'Yahoo will ask for a phone number to send verification codes. Enter your current mobile number.' },
      { text: 'Yahoo sends a code to your phone. Enter it to confirm.' },
      { text: 'If it says already ON: check what method is set up. You can also add an authenticator app by tapping "Authenticator app" option if available.' },
      { text: 'TIP: Yahoo also offers "Account Key" -- a passwordless option where you approve sign-ins from your phone. It\'s under the same security page.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"After those breaches, 2FA on Yahoo isn\'t optional -- it\'s damage control."',
      debrief: {
        'enabled-2fa': '"2FA active on Yahoo. Even if credentials leak again, they can\'t get in."',
        'already-enabled': '"Good. Already protected."',
        'later': '"Priority here. Yahoo\'s track record makes this essential."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'yahoo-reclaim-privacy',
    accountId: 'yahoo',
    phase: 'reclaim',
    title: 'Privacy Review: Yahoo',
    briefing: 'Yahoo (now part of Yahoo Inc.) collects and shares data for advertising. Their privacy controls let you opt out of personalized ads and data sales, and manage what\'s been collected.',
    steps: [
      { text: 'Open Yahoo Privacy Dashboard', url: 'https://legal.yahoo.com/us/en/yahoo/privacy/dashboard/index.html' },
      { text: 'You\'ll see "Your Privacy Controls" with several toggles. Go through each one.' },
      { text: 'Turn OFF "Personalized advertising" -- this stops Yahoo from using your data to target ads.' },
      { text: 'Turn OFF "Content personalization" -- this stops Yahoo from using your reading/browsing history to customize what you see.' },
      { text: 'Look for "Data sales" or "Do Not Sell My Information" and opt out. Under CCPA, Yahoo must honor this.' },
      { text: 'Check "Connected accounts and apps" -- revoke access for any services you no longer use.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Yahoo monetizes your data pretty aggressively. Their privacy dashboard lets you claw some of it back."',
      debrief: {
        'tightened': '"Data sharing reduced. Less of you flowing to the ad network."',
        'already-tight': '"Already opted out. Impressive."',
        'later': '"It\'s worth doing eventually. Yahoo shares a lot by default."',
      },
    },
    estimatedMinutes: 8,
  },

  // ══════════════════════════════════════════════════════
  // PROTONMAIL
  // ══════════════════════════════════════════════════════
  {
    id: 'protonmail-recon-breach',
    accountId: 'protonmail',
    phase: 'recon',
    title: 'Breach Recon: ProtonMail',
    briefing: 'ProtonMail itself has strong security, but your Proton email address may have been exposed through breaches of other services where you used it to sign up. The risk is credential stuffing -- attackers trying your leaked password on Proton.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type your @protonmail.com or @proton.me email address in the search box and tap "pwned?"' },
      { text: 'Green screen = no breaches. Proton itself hasn\'t been breached, and your address hasn\'t appeared in other breaches either.' },
      { text: 'Red screen = your Proton address was found in a breach of another service. Scroll down -- this means you used this email to sign up for something that got breached.' },
      { text: 'If "Passwords" appears in any breach entry, check: did you use the same password on that breached site as your Proton account? If yes, change your Proton password in the Fortify phase.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Proton\'s servers are solid, but your Proton address might be in breaches from other sites where you used it to register."',
      debrief: scoutBreach(
        '"Clean. The bunker holds."',
        '"Third-party exposure -- not Proton\'s fault, but your password could still be at risk."',
        '"Multiple exposures. If your Proton password is reused, change it now."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'protonmail-recon-login',
    accountId: 'protonmail',
    phase: 'recon',
    title: 'Login History: ProtonMail',
    briefing: 'Proton logs authentication events. Checking your security log reveals any successful or failed login attempts from unfamiliar locations.',
    steps: [
      { text: 'Open Proton Account Security -- sign in with your Proton credentials', url: 'https://account.proton.me/u/0/mail/security' },
      { text: 'Scroll down to "Security logs". You\'ll see a list of authentication events -- successful sign-ins, failed attempts, and password changes.' },
      { text: 'Each entry shows a timestamp and an IP address. Failed login attempts from unknown IPs mean someone tried to break in.' },
      { text: 'Now check "Session management" or "Active sessions". This shows every device/browser currently signed into your Proton account.' },
      { text: 'See a session you don\'t recognize? Tap the X or "Revoke" to end it. That immediately signs out that device.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Proton keeps detailed security logs. Let\'s make sure nobody\'s cracked the vault."',
      debrief: scoutLogin(
        '"All recognized sessions. The vault is secure."',
        '"Unfamiliar session spotted. Revoke it and change your password."',
        '"Breach confirmed on a privacy-focused provider. Lock it down and enable 2FA."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'protonmail-fortify-password',
    accountId: 'protonmail',
    phase: 'fortify',
    title: 'Password Reset: ProtonMail',
    briefing: 'Proton uses zero-knowledge encryption -- they can\'t read your mail even if compelled. But that means a lost or compromised password is catastrophic. Make it strong and backed up.',
    steps: [
      { text: 'Open Proton Account Security -- sign in if prompted', url: 'https://account.proton.me/u/0/mail/security' },
      { text: 'Tap "Account password" or "Change password". Proton will ask for your current password first.' },
      { text: 'IMPORTANT: Proton uses your password to encrypt your email. If you lose this password, Proton CANNOT recover your mail. There is no "forgot password" that gives you your data back.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it in the password manager AND write it down on paper stored somewhere safe.' },
      { text: 'Enter the new password twice and submit. Proton will re-encrypt your mailbox -- this may take a moment.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Proton encrypts with your password. Lose it and you lose your mail permanently. Strong AND backed up."',
      debrief: {
        'reset-password': '"New password on the bunker. Strong and backed up, right?"',
        'already-strong': '"Already solid. Proton users tend to be security-conscious."',
        'later': '"Don\'t wait too long -- Proton\'s encryption makes this password irreplaceable."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'protonmail-fortify-2fa',
    accountId: 'protonmail',
    phase: 'fortify',
    title: '2FA Setup: ProtonMail',
    briefing: 'Proton supports TOTP authenticator apps and security keys for two-factor authentication. Given Proton\'s role as a privacy-first provider, 2FA here completes the security picture.',
    steps: [
      { text: 'Open Proton Account Security -- sign in if prompted', url: 'https://account.proton.me/u/0/mail/security' },
      { text: 'Scroll to "Two-factor authentication". If it says Disabled, tap "Enable".' },
      { text: 'Proton shows a QR code. Open your authenticator app (Google Authenticator, Authy, etc.) and scan it.' },
      { text: 'Your authenticator app now shows a 6-digit code that changes every 30 seconds. Enter the current code to verify.' },
      { text: 'Proton will show you recovery codes. SAVE THESE. Put them in your password manager AND print them. If you lose your phone, these are the only way back in.' },
      { text: 'If it\'s already enabled: check that your authenticator app still works by verifying the current code matches.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"If you chose Proton for privacy, 2FA completes the picture. Don\'t leave the front door unlocked on the most secure house."',
      debrief: {
        'enabled-2fa': '"2FA on Proton. The bunker is fully fortified."',
        'already-enabled': '"Already enabled. Expected from a Proton user."',
        'later': '"The irony of an unprotected Proton account. Come back to this."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'protonmail-reclaim-privacy',
    accountId: 'protonmail',
    phase: 'reclaim',
    title: 'Privacy Review: ProtonMail',
    briefing: 'Proton is privacy-focused by design, but there are still settings worth reviewing: default email encryption, metadata protection, and whether your recovery email could be a leak vector.',
    steps: [
      { text: 'Open Proton Account Security -- sign in if prompted', url: 'https://account.proton.me/u/0/mail/security' },
      { text: 'Check your recovery email. If it\'s a Gmail or Outlook address, anyone who compromises that account can reset your Proton password. Consider using a different recovery method.' },
      { text: 'Check "Recovery phrase" -- if you haven\'t saved one, set it up now. This is your backup if you lose access to both your password and recovery email.' },
      { text: 'In Proton Mail settings: check "Auto-show embedded images" -- loading images in emails tells the sender you opened it. Consider setting this to "Manual".' },
      { text: 'Review "Addresses" -- if you have aliases, check that they\'re all still needed. Each alias is another identifier linked to your account.' },
      { text: 'Proton is already the most private email option. These are fine-tuning adjustments, not critical fixes.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Proton\'s already privacy-first, but check your recovery email -- a Gmail recovery address links your identities."',
      debrief: {
        'tightened': '"Settings tuned. Proton is as private as it can be."',
        'already-tight': '"Already dialed in. Your privacy game is strong."',
        'later': '"Worth a look when you have time. Small details matter here."',
      },
    },
    estimatedMinutes: 8,
  },

  // ══════════════════════════════════════════════════════
  // APPLE ID
  // ══════════════════════════════════════════════════════
  {
    id: 'apple_id-recon-breach',
    accountId: 'apple_id',
    phase: 'recon',
    title: 'Breach Recon: Apple ID',
    briefing: 'Your Apple ID controls access to every Apple service -- App Store purchases, iCloud, Find My, Apple Pay. While Apple itself hasn\'t had a major breach, your Apple ID email may appear in breaches from other services.',
    steps: [
      { text: 'Open haveibeenpwned.com', url: 'https://haveibeenpwned.com' },
      { text: 'Enter the email associated with your Apple ID' },
      { text: 'Check for any breaches -- cross-service credential reuse is the risk' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Apple\'s own security is strong, but if you used the same email elsewhere and it leaked, attackers try those credentials everywhere."',
      debrief: scoutBreach(
        '"No exposure. The spire stands tall."',
        '"Some third-party exposure. Make sure your Apple password is unique."',
        '"Significant exposure. If your Apple ID password matches anything leaked, change it now."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'apple_id-recon-login',
    accountId: 'apple_id',
    phase: 'recon',
    title: 'Login History: Apple ID',
    briefing: 'Apple shows all devices currently signed into your Apple ID. Every device on this list has access to your iCloud data, photos, and Find My location. An unknown device is a serious red flag.',
    steps: [
      { text: 'Open Apple ID account page -- you\'ll need to sign in with your Apple ID email and password. If you have 2FA on, Apple will send a code to one of your devices.', url: 'https://account.apple.com/account/manage' },
      { text: 'Once signed in, scroll down to "Devices" or tap "Devices" in the sidebar. You\'ll see every iPhone, iPad, Mac, Apple Watch, and Apple TV signed into your Apple ID.' },
      { text: 'Each device shows a name (like "MacBook Pro" or "iPhone 15"), a model, and an OS version number. The OS version tells you how old the device is -- macOS 13 is from 2022, macOS 15 is from 2024. If you\'re on macOS 26 now and see "macOS 13", that\'s a 4-year-old device.' },
      { text: 'Don\'t recognize a device? Tap on it to see more details: serial number, phone number, IMEI. Check the serial number against your own device (on Mac: Apple menu > About This Mac; on iPhone: Settings > General > About).' },
      { text: 'To remove a device: tap on it, then tap "Remove from Account". NOTE: you might not be able to remove some devices from the web -- you may need to do it from your Mac (System Settings > Apple ID > Devices) or iPhone (Settings > [your name] > scroll down to devices).' },
      { text: 'If you see a device you definitely don\'t own -- remove it AND change your Apple ID password immediately. That device has access to your photos, location, messages, and Apple Pay.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Every device on this list can see your photos, track your location, and read your iMessages. If there\'s a \'MacBook Pro 2\' and you only own one MacBook -- that\'s a problem. Tap each device and check the serial number against yours."',
      debrief: scoutLogin(
        '"All accounted for. Your Apple ecosystem is clean."',
        '"Unknown device found. Remove it and consider changing your password."',
        '"Unauthorized device confirmed. Remove, change password, enable 2FA -- in that order."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'apple_id-fortify-password',
    accountId: 'apple_id',
    phase: 'fortify',
    title: 'Password Reset: Apple ID',
    briefing: 'Your Apple ID password guards the App Store, Apple Pay, iCloud Keychain, Find My, and Sign in with Apple. If this password is compromised, an attacker can lock you out of your own devices.',
    steps: [
      { text: 'Open Apple ID account page -- sign in if prompted', url: 'https://account.apple.com/account/manage' },
      { text: 'Tap "Sign-In and Security" in the sidebar (or scroll to it on mobile).' },
      { text: 'Tap "Password". Apple will ask you to enter your current password first.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it in the password manager BEFORE you submit.' },
      { text: 'Enter the new password twice and tap "Change Password". Apple may sign you out of some devices -- just sign back in with the new password.' },
      { text: 'TIP: If you use iCloud Keychain, the new password will sync to your devices automatically. If you use a separate password manager, make sure it\'s saved there.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"This one guards Apple Pay, your keychain, and the ability to wipe your devices. Save the new password in your password manager BEFORE you click Change."',
      debrief: {
        'reset-password': '"Apple ID password refreshed. That\'s your most personal account secured."',
        'already-strong': '"Already strong and unique. Good."',
        'later': '"This is a high-value target. Don\'t sit on it too long."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'apple_id-fortify-2fa',
    accountId: 'apple_id',
    phase: 'fortify',
    title: '2FA Setup: Apple ID',
    briefing: 'Apple\'s two-factor authentication sends a verification code to your trusted devices when you sign in on a new device. It\'s one of the most seamless 2FA implementations available.',
    steps: [
      { text: 'Open Apple ID account page -- sign in if prompted', url: 'https://account.apple.com/account/manage' },
      { text: 'Tap "Sign-In and Security". Look for "Two-Factor Authentication" -- it will say On or Off.' },
      { text: 'If it says OFF: tap it, then follow the prompts. Apple will ask for a trusted phone number -- this is where they\'ll send a code if you lose access to your devices.' },
      { text: 'If it says ON: you\'re good! Check that your trusted phone number is still current. If you changed phone numbers, update it here.' },
      { text: 'Apple\'s 2FA works by sending a popup to your other Apple devices with a 6-digit code. No app needed -- it\'s built into iOS/macOS.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"Apple\'s 2FA is the easiest one to set up -- it\'s built right into your devices. No separate app needed. Just make sure the trusted phone number is current."',
      debrief: {
        'enabled-2fa': '"2FA active. Your Apple world is locked down."',
        'already-enabled': '"Already on. Apple pushes this hard, and for good reason."',
        'later': '"Quick setup. Worth doing today."',
      },
    },
    estimatedMinutes: 3,
  },
  {
    id: 'apple_id-reclaim-privacy',
    accountId: 'apple_id',
    phase: 'reclaim',
    title: 'Privacy Review: Apple ID',
    briefing: 'Review which apps use Sign in with Apple and what data they have access to. Also review app permissions on your devices -- camera, microphone, contacts, and location access.',
    steps: [
      { text: 'Open Apple ID account page -- sign in if prompted', url: 'https://account.apple.com/account/manage' },
      { text: 'Tap "Sign-In and Security", then scroll to "Sign in with Apple". You\'ll see a list of apps that use your Apple ID to log in.' },
      { text: 'For each app: do you still use it? If not, tap it and tap "Stop Using Apple ID". This revokes the app\'s access to your Apple ID info.' },
      { text: 'Now on your iPhone: go to Settings > Privacy & Security. Tap each category -- Location Services, Camera, Microphone, Contacts. Review which apps have access.' },
      { text: 'Look for apps you don\'t use anymore that still have Camera or Microphone access. Toggle them OFF.' },
      { text: 'Under Location Services: set apps to "While Using" instead of "Always" where possible. "Always" means the app tracks you even when it\'s closed.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Sign in with Apple is convenient, but every app on that list has some access to your identity. And on your phone, check which apps can use your camera and microphone -- you\'d be surprised what has access."',
      debrief: {
        'tightened': '"App access cleaned up. Less exposure surface."',
        'already-tight': '"Already minimal. Well done."',
        'later': '"The Sign in with Apple list tends to grow quietly. Worth a periodic review."',
      },
    },
    estimatedMinutes: 8,
  },

  // ══════════════════════════════════════════════════════
  // GOOGLE ACCOUNT
  // ══════════════════════════════════════════════════════
  {
    id: 'google-recon-breach',
    accountId: 'google',
    phase: 'recon',
    title: 'Breach Recon: Google Account',
    briefing: 'Your Google Account is an identity provider -- "Sign in with Google" connects it to dozens or hundreds of other services. A compromised Google password unlocks everything behind that SSO.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type your Gmail address in the search box and tap "pwned?". Check results the same way as the Gmail breach recon.' },
      { text: 'Now open Google\'s built-in Password Checkup -- this scans ALL passwords saved in your Google account, not just the Google one', url: 'https://passwords.google.com/checkup' },
      { text: 'Sign in if prompted. Google will scan your saved passwords against known breaches. It takes a minute.' },
      { text: 'Results show three categories: "Compromised passwords" (change these NOW), "Reused passwords" (risky), and "Weak passwords" (should improve). Tap each category to see which accounts.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Google is an identity provider -- Sign in with Google links it to everything. A breach here cascades."',
      debrief: scoutBreach(
        '"No exposure on the Google account. The identity hub is intact."',
        '"Some exposure. With Google SSO linking so many services, lock this down."',
        '"Widespread exposure on your identity provider. This is priority one."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'google-recon-login',
    accountId: 'google',
    phase: 'recon',
    title: 'Login History: Google Account',
    briefing: 'Google provides detailed security events including sign-ins, password changes, and third-party app access. Reviewing this reveals whether anyone else has been using your account as their own identity provider.',
    steps: [
      { text: 'Open Google Security -- sign in if prompted', url: 'https://myaccount.google.com/security' },
      { text: 'Scroll to "Your devices". Each entry shows a device name, last used time, and location. Sign out any you don\'t recognize by tapping the device then "Sign out".' },
      { text: 'Scroll to "Recent security activity". This shows sign-ins, password changes, and recovery email changes. Anything you didn\'t do is a red flag.' },
      { text: 'Now scroll to "Third-party apps with account access". These are apps and services using "Sign in with Google". Tap "Manage third-party access".' },
      { text: 'Review each app. If you don\'t use it anymore, tap it and tap "Remove Access". Old apps can still read your Google data even if you\'ve forgotten about them.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Google\'s security dashboard is thorough. Check devices, recent activity, and third-party apps that have access."',
      debrief: scoutLogin(
        '"Everything checks out. No unwanted guests."',
        '"Something\'s off. Revoke suspicious access and change your password."',
        '"Unauthorized access to your identity provider. Fortify immediately."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'google-fortify-password',
    accountId: 'google',
    phase: 'fortify',
    title: 'Password Reset: Google Account',
    briefing: 'Your Google Account password protects Gmail, Drive, Photos, YouTube, and every app using Sign in with Google. Making this password unique and strong is one of the highest-value security actions you can take.',
    steps: [
      { text: 'Open Google Security -- sign in if prompted', url: 'https://myaccount.google.com/security' },
      { text: 'Scroll to "How you sign in to Google". Tap "Password". Google may ask you to re-enter your current password.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it in the password manager BEFORE submitting.' },
      { text: 'Paste the new password into Google\'s form and tap "Change Password".' },
      { text: 'Google may sign you out of some devices. Just sign back in with the new password on each device as needed.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"This password is the skeleton key to your digital life. Gmail, Drive, Photos, YouTube, and hundreds of SSO connections."',
      debrief: {
        'reset-password': '"New password on the identity hub. Everything downstream is safer now."',
        'already-strong': '"Already unique and strong. Good discipline on a critical account."',
        'later': '"This is the highest-value password change you can make. Come back soon."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'google-fortify-2fa',
    accountId: 'google',
    phase: 'fortify',
    title: '2FA Setup: Google Account',
    briefing: 'Google supports multiple 2FA methods: authenticator apps, security keys, phone prompts, and backup codes. For an identity provider account, the strongest option you\'re comfortable with is the right choice.',
    steps: [
      { text: 'Open Google 2-Step Verification -- sign in if prompted', url: 'https://myaccount.google.com/signinoptions/two-step-verification' },
      { text: 'If it says "2-Step Verification is OFF" -- tap "Get Started" and follow the setup prompts.' },
      { text: 'Google will ask you to choose a method. From most to least secure: 1) Security key (like YubiKey) 2) Google Authenticator app 3) Google prompts (tap "Yes" on your phone) 4) SMS (better than nothing)' },
      { text: 'If using an authenticator app: download Google Authenticator or Authy from your app store. Scan the QR code. Enter the 6-digit code to verify.' },
      { text: 'Google will show backup codes. Screenshot them or write them down. Store in your password manager AND on paper. These are your way back in if you lose your phone.' },
      { text: 'If already ON: check what method you\'re using. If it\'s just SMS, consider adding an authenticator app as a stronger option.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"Google offers the most 2FA options of anyone. Security key is best, authenticator app is great, phone prompt is fine. Pick what you\'ll actually use."',
      debrief: {
        'enabled-2fa': '"2FA on the identity hub. This single action protects everything behind Google SSO."',
        'already-enabled': '"Already protected. Make sure you have backup codes saved somewhere safe."',
        'later': '"This is arguably the single most important 2FA setup. Prioritize it."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'google-reclaim-privacy',
    accountId: 'google',
    phase: 'reclaim',
    title: 'Privacy Review: Google Account',
    briefing: 'Google\'s Privacy Checkup walks through what data is collected and shared. Web & App Activity, Location History, YouTube History, and ad personalization can all be tightened without losing core functionality.',
    steps: [
      { text: 'Open Google Privacy Checkup -- sign in if prompted', url: 'https://myaccount.google.com/privacycheckup' },
      { text: 'First section: "Web & App Activity". This records every Google search, every website you visit in Chrome, and every app you use. Tap "Manage" and either pause it entirely or set auto-delete to 3 months.' },
      { text: 'Next: "Location History" (now called "Timeline"). This tracks everywhere you go with your phone. Tap "Manage" and either turn it off or set auto-delete to 3 months.' },
      { text: 'Next: "YouTube History". This tracks every video you watch and search for. Pause it or set auto-delete.' },
      { text: 'Scroll to "Ad personalization". Tap "Go to ad settings" and toggle OFF "Ad personalization is ON". This stops Google from building an ad profile from your data.' },
      { text: 'Final check: open "Data & privacy" in your Google Account settings. Scroll to "Apps and services" to see everywhere you\'ve used "Sign in with Google". Revoke access for apps you don\'t use.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Google\'s Privacy Checkup is comprehensive. This is where you decide how much of your digital life Google gets to index."',
      debrief: {
        'tightened': '"Data collection dialed back. A significant reduction in your exposure surface."',
        'already-tight': '"Already locked down. You\'re ahead of most."',
        'later': '"It\'s a deep settings tree. Chip away at it when you can."',
      },
    },
    estimatedMinutes: 10,
  },

  // ══════════════════════════════════════════════════════
  // MICROSOFT
  // ══════════════════════════════════════════════════════
  {
    id: 'microsoft-recon-breach',
    accountId: 'microsoft',
    phase: 'recon',
    title: 'Breach Recon: Microsoft Account',
    briefing: 'Your Microsoft Account is both a consumer identity (Xbox, Outlook, OneDrive) and an enterprise gateway (Office 365, Teams, Azure). A breach here opens doors on both sides of your digital life.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type your Microsoft account email in the search box and tap "pwned?"' },
      { text: 'Green screen = no breaches. Your Microsoft identity is clear.' },
      { text: 'Red screen = breaches found. Pay special attention to LinkedIn (owned by Microsoft) -- a 2012 LinkedIn breach exposed 164 million accounts. If you used the same password for LinkedIn and Microsoft, change it now.' },
      { text: 'If "Passwords" appears in any breach: your password was leaked. Change it immediately in the Fortify phase.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Microsoft spans consumer and enterprise. Xbox, Outlook, OneDrive, Office, Teams -- all behind one account."',
      debrief: scoutBreach(
        '"Clean. The corporate tower is unbreached."',
        '"Some exposure. Make sure this password isn\'t shared with your work accounts."',
        '"Multiple breaches on a Microsoft account is a wide blast radius. Lock it down."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'microsoft-recon-login',
    accountId: 'microsoft',
    phase: 'recon',
    title: 'Login History: Microsoft Account',
    briefing: 'Microsoft\'s recent activity page shows sign-ins with timestamps, locations, and device info. Unfamiliar activity here could mean someone has access to your Office documents, OneDrive files, and email.',
    steps: [
      { text: 'Open Microsoft Recent Activity -- sign in with your Microsoft account if prompted', url: 'https://account.live.com/Activity' },
      { text: 'You\'ll see a list of sign-ins. Each shows: date/time, the app (Outlook, Xbox, OneDrive), the device/browser, and the city.' },
      { text: 'Look for cities you\'ve never been to, or devices you don\'t own. Tap "Show more activity" to see older entries.' },
      { text: 'Green checks = successful sign-ins. Red Xs = failed attempts. Multiple failed attempts from one location means someone tried to guess your password.' },
      { text: 'If you see something suspicious: tap "Secure your account" at the top of the page. Microsoft will walk you through securing it.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Microsoft logs sign-ins in detail. Let\'s see if the corporate tower has had any uninvited visitors."',
      debrief: scoutLogin(
        '"All clear. No unauthorized access."',
        '"Suspicious login found. Time to change credentials."',
        '"Confirmed unauthorized access. Password change and 2FA are immediate priorities."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'microsoft-fortify-password',
    accountId: 'microsoft',
    phase: 'fortify',
    title: 'Password Reset: Microsoft Account',
    briefing: 'Your Microsoft password protects Outlook, OneDrive, Office, Xbox, and any service using Microsoft SSO. Microsoft also supports passwordless sign-in via the Authenticator app if you want to go further.',
    steps: [
      { text: 'Open Microsoft security page -- sign in if prompted', url: 'https://account.microsoft.com/security' },
      { text: 'Tap "Change password" (or "Password security" > "Change my password" on mobile).' },
      { text: 'Enter your current password when asked.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it BEFORE submitting.' },
      { text: 'Enter the new password twice and tap "Save". You may need to re-sign in on some devices.' },
      { text: 'TIP: Microsoft also supports passwordless sign-in via the Authenticator app -- if you want to eliminate passwords entirely, look for "Go passwordless" in security settings.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Microsoft offers passwordless sign-in via their Authenticator app. Worth considering if you want to eliminate password risk entirely."',
      debrief: {
        'reset-password': '"New password on the Microsoft account. The tower is reinforced."',
        'already-strong': '"Already strong and unique. Solid."',
        'later': '"Don\'t leave this one open. It\'s a wide-reaching account."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'microsoft-fortify-2fa',
    accountId: 'microsoft',
    phase: 'fortify',
    title: '2FA Setup: Microsoft Account',
    briefing: 'Microsoft supports authenticator apps, security keys, phone verification, and passwordless sign-in. Their Authenticator app includes a one-tap approval flow that\'s fast and secure.',
    steps: [
      { text: 'Open Microsoft security page -- sign in if prompted', url: 'https://account.microsoft.com/security' },
      { text: 'Tap "Advanced security options". Then look for "Two-step verification" and tap "Turn on".' },
      { text: 'Microsoft will recommend the Microsoft Authenticator app. You can also use Google Authenticator, Authy, or any TOTP authenticator app.' },
      { text: 'If using an authenticator: download the app on your phone, tap "Set up Authenticator app" on the Microsoft page, scan the QR code, enter the 6-digit code to verify.' },
      { text: 'Microsoft will provide a recovery code. Save it somewhere safe -- password manager and/or paper. You need this if you lose your phone.' },
      { text: 'Microsoft Authenticator has a one-tap approval feature -- when you sign in, your phone pops up "Approve?" and you tap Yes. No codes to type.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"Microsoft\'s Authenticator has a nice one-tap approval. Set it up and you won\'t even need to type codes."',
      debrief: {
        'enabled-2fa': '"2FA active on Microsoft. One-tap approval is slick, right?"',
        'already-enabled': '"Already set up. Good."',
        'later': '"Quick to set up, big security payoff. Come back to this."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'microsoft-reclaim-privacy',
    accountId: 'microsoft',
    phase: 'reclaim',
    title: 'Privacy Review: Microsoft Account',
    briefing: 'Microsoft collects browsing history (via Edge), search data (via Bing), Cortana interactions, and diagnostic data from Windows. Their privacy dashboard lets you view and clear this data.',
    steps: [
      { text: 'Open Microsoft Privacy Dashboard -- sign in if prompted', url: 'https://account.microsoft.com/privacy' },
      { text: 'You\'ll see categories: Browsing history, Search history, Location activity, Voice activity, Media activity, and more. Tap into each one.' },
      { text: 'For each category: review what Microsoft has collected, then tap "Clear" or "Delete" to remove it from their servers.' },
      { text: 'Tap "Ad settings". Toggle OFF both "See personalized ads in your browser" and "See personalized ads wherever I use my Microsoft account".' },
      { text: 'If you use Windows: on your PC, go to Settings > Privacy & Security > Diagnostics & feedback. Set diagnostic data to "Required" instead of "Optional" to reduce what\'s sent.' },
      { text: 'Check "App access" for connected apps. Remove any you don\'t use -- they may still have access to your Microsoft data.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"If you use Windows or Edge, Microsoft has been collecting. The privacy dashboard lets you see the pile and start clearing it."',
      debrief: {
        'tightened': '"Data collection reduced. Your Microsoft footprint just got smaller."',
        'already-tight': '"Already cleaned up. You know the drill."',
        'later': '"It\'s a big dashboard. Worth spending ten minutes on eventually."',
      },
    },
    estimatedMinutes: 10,
  },

  // ══════════════════════════════════════════════════════
  // FACEBOOK LOGIN
  // ══════════════════════════════════════════════════════
  {
    id: 'facebook-recon-breach',
    accountId: 'facebook',
    phase: 'recon',
    title: 'Breach Recon: Facebook',
    briefing: 'Facebook has been involved in multiple data incidents, including a 2019 breach that exposed 533 million phone numbers. Your Facebook credentials may also be targeted because Facebook Login is used as SSO for many third-party apps.',
    steps: [
      { text: 'Open Have I Been Pwned -- no account needed', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email address you use for Facebook in the search box and tap "pwned?"' },
      { text: 'Also try your phone number (with country code, like +15551234567) -- the 2019 Facebook breach leaked phone numbers specifically.' },
      { text: 'Green screen = clean. Red screen = breaches found -- scroll down to see which ones.' },
      { text: 'If you see "Facebook" in the breach list -- that\'s the 2019 breach. 533 million phone numbers were exposed. If your phone number was in it, be extra careful about SIM-swap attacks.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Facebook\'s 2019 breach hit 533 million accounts. If you\'ve been on Facebook more than a few years, expect to find something."',
      debrief: scoutBreach(
        '"Clean. Lucky, given Facebook\'s track record."',
        '"Found some exposure. Facebook\'s breach history makes this unsurprising."',
        '"Multiple breaches. Facebook Login connects to a lot of apps -- this is wider than it looks."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'facebook-recon-login',
    accountId: 'facebook',
    phase: 'recon',
    title: 'Login History: Facebook',
    briefing: 'Facebook tracks active sessions and login locations. An unrecognized session means someone else can post as you, message your contacts, and access any app using Facebook Login.',
    steps: [
      { text: 'Open Facebook Security Settings -- sign in if prompted', url: 'https://www.facebook.com/settings?tab=security' },
      { text: 'Scroll to "Where you\'re logged in". You\'ll see a list of devices with locations and "last active" times.' },
      { text: 'Each entry shows a device type (iPhone, Chrome on Windows, etc.) and a city. Look for devices or cities you don\'t recognize.' },
      { text: 'See something unfamiliar? Tap the three dots next to it and tap "Log out". This ends that session immediately.' },
      { text: 'If you see many suspicious sessions: scroll to the bottom and tap "Log out of all sessions". This signs out EVERYWHERE -- you\'ll need to sign back in on your own devices.' },
      { text: 'Also check "Recognized devices" below -- these are devices Facebook trusts to skip security checks. Remove any you don\'t recognize.' },
    ],
    debriefQs: LOGIN_DEBRIEF,
    scoutDialog: {
      briefing: '"Facebook shows every active session. If someone\'s in there, they can impersonate you to everyone who trusts you."',
      debrief: scoutLogin(
        '"All known sessions. Nobody\'s wearing your face."',
        '"Suspicious session found. End it and change your password."',
        '"Unauthorized access to your social identity. End all sessions, change password, enable 2FA."',
      ),
    },
    estimatedMinutes: 5,
  },
  {
    id: 'facebook-fortify-password',
    accountId: 'facebook',
    phase: 'fortify',
    title: 'Password Reset: Facebook',
    briefing: 'Your Facebook password protects your social identity and every app using Facebook Login. Because Facebook is a common SSO provider, a compromised Facebook password can cascade to dozens of other services.',
    steps: [
      { text: 'Open Facebook Security Settings -- sign in if prompted', url: 'https://www.facebook.com/settings?tab=security' },
      { text: 'Tap "Change password". Facebook asks for your current password first, then the new one twice.' },
      { text: 'Open your password manager and generate a new password -- 16+ characters, random. Save it in the password manager BEFORE submitting.' },
      { text: 'Enter the new password and tap "Save Changes".' },
      { text: 'Facebook may ask "Log out of other devices?" -- tap YES if you found suspicious sessions in the recon phase. Otherwise it\'s optional.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Facebook Login connects to a lot of apps. This password is wider than just social media."',
      debrief: {
        'reset-password': '"New password on Facebook. Every app using Facebook Login is safer now."',
        'already-strong': '"Already unique. Good -- Facebook is a high-value target."',
        'later': '"If Facebook Login connects to other apps, this password matters more than you think."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'facebook-fortify-2fa',
    accountId: 'facebook',
    phase: 'fortify',
    title: '2FA Setup: Facebook',
    briefing: 'Facebook supports authenticator apps, security keys, and SMS for two-factor authentication. An authenticator app is recommended -- SMS can be intercepted via SIM swapping, which is a known attack vector on social media accounts.',
    steps: [
      { text: 'Open Facebook Security Settings -- sign in if prompted', url: 'https://www.facebook.com/settings?tab=security' },
      { text: 'Scroll to "Two-factor authentication" and tap "Edit" or "Use two-factor authentication".' },
      { text: 'Facebook will show you three options: Authentication app (recommended), SMS text message, or Security key. Pick "Authentication app".' },
      { text: 'If using an authenticator: open your authenticator app (Google Authenticator, Authy, etc.), scan the QR code Facebook shows, and enter the 6-digit code to verify.' },
      { text: 'Facebook will ask you to set up recovery options -- save the recovery codes somewhere safe. Password manager AND paper.' },
      { text: 'IMPORTANT: avoid SMS for Facebook 2FA. Social media accounts are common SIM-swap targets -- attackers port your number to their SIM and intercept the SMS codes.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: '"Social media accounts are SIM-swap targets. Use an authenticator app, not SMS."',
      debrief: {
        'enabled-2fa': '"2FA active on Facebook. Much harder to hijack now."',
        'already-enabled': '"Already set up. Smart."',
        'later': '"Social media accounts are common targets. Don\'t wait too long."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'facebook-reclaim-privacy',
    accountId: 'facebook',
    phase: 'reclaim',
    title: 'Privacy Review: Facebook',
    briefing: 'Facebook collects and sells more data than almost any other platform. Their privacy settings are intentionally complex, but you can significantly reduce your exposure: limit ad tracking, restrict who sees your posts, and revoke app permissions.',
    steps: [
      { text: 'Open Facebook Privacy Settings -- sign in if prompted', url: 'https://www.facebook.com/settings?tab=privacy' },
      { text: 'Under "Your Activity": set "Who can see your future posts?" to "Friends". This is the single biggest setting -- it stops strangers from reading your posts.' },
      { text: 'Tap "Limit past posts" to change all your old public posts to Friends-only in one click. Facebook asks you to confirm -- tap "Limit Old Posts".' },
      { text: 'Go to Settings > Apps and websites. You\'ll see every app that uses Facebook Login. Remove any you don\'t actively use by tapping "Remove".' },
      { text: 'Now the big one: go to Settings > Your Facebook information > Off-Facebook activity. This shows websites and apps that share your activity WITH Facebook -- even when you\'re not on Facebook.', url: 'https://www.facebook.com/off_facebook_activity/' },
      { text: 'Tap "Clear history" to delete all off-Facebook activity. Then tap "Manage future activity" and toggle it OFF. This is a massive data pipeline and most people don\'t know it exists.' },
      { text: 'Final: Settings > Ad Preferences > Ad Settings. Turn off "Data about your activity from partners" and "Ads shown off of Facebook".' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"Facebook\'s privacy settings are deliberately confusing. Off-Facebook Activity is the big one -- it tracks you across the entire web."',
      debrief: {
        'tightened': '"Off-Facebook Activity cleared. That\'s a massive data pipeline you just shut off."',
        'already-tight': '"Already locked down. Impressive -- most people never find those settings."',
        'later': '"The Off-Facebook Activity setting alone is worth coming back for."',
      },
    },
    estimatedMinutes: 15,
  },
];

// Merge all chapter missions into one array -- exported as MISSIONS
// so every existing import picks up the full set
export const MISSIONS = [
  ...CHAPTER_1_MISSIONS,
  ...VAULT_CAPITOL_MISSIONS,
  ...MISSIONS_SQUARE_ARCHIVES_MARKETPLACE,
  ...PERIMETER_MISSIONS,
  ...RECLAMATION_MISSIONS,
  ...FREEWAY_MISSIONS,
  ...FOUNDRY_MISSIONS,
  ...GRID_MISSIONS,
  ...CLINIC_MISSIONS,
  ...TRAIL_MISSIONS,
  ...OSINT_SIEVE_MISSIONS,
];

export function getMissionsForDistrict(districtId) {
  return MISSIONS.filter((m) => ACCOUNTS[m.accountId]?.district === districtId);
}

export function getMissionsForAccount(accountId) {
  return MISSIONS.filter((m) => m.accountId === accountId);
}
