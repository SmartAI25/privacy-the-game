// Missions for The Vault (Chapter 2) and The Capitol (Chapter 6)
// Uses the same debrief schemas as missions.js -- redefined here for standalone use,
// merged by the integration code.

const BREACH_DEBRIEF = [
  {
    id: 'finding',
    label: 'What did you find?',
    options: [
      { value: 'no-breaches', text: 'No breaches found', severity: 'safe' },
      { value: '1-2-breaches', text: 'Found in 1-2 breaches', severity: 'warn' },
      { value: '3plus-breaches', text: 'Found in 3+ breaches', severity: 'crit' },
      { value: 'skip', text: `Couldn't check right now`, severity: 'skip' },
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
      { value: 'skip', text: `Couldn't check right now`, severity: 'skip' },
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
      { value: 'later', text: `I'll come back to this`, severity: 'skip' },
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
      { value: 'later', text: `I'll come back to this`, severity: 'skip' },
    ],
  },
];

const ALERTS_DEBRIEF = [
  {
    id: 'action',
    label: 'Did you set up transaction alerts?',
    options: [
      { value: 'enabled-alerts', text: 'Yes, alerts are on', severity: 'safe' },
      { value: 'already-enabled', text: 'They were already on', severity: 'safe' },
      { value: 'later', text: `I'll come back to this`, severity: 'skip' },
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
      { value: 'later', text: `I'll come back to this`, severity: 'skip' },
    ],
  },
];

const ACCOUNT_CLAIMED_DEBRIEF = [
  {
    id: 'action',
    label: 'Did you claim your account?',
    options: [
      { value: 'claimed', text: 'Yes, I created / verified my account', severity: 'safe' },
      { value: 'already-had', text: 'I already had an account', severity: 'safe' },
      { value: 'later', text: `I'll come back to this`, severity: 'skip' },
    ],
  },
];

function scoutBreach(clean, mild, severe) {
  return {
    'no-breaches': clean,
    '1-2-breaches': mild,
    '3plus-breaches': severe,
    'skip': `"No rush. This mission will be here when you're ready."`,
  };
}

function scoutLogin(clean, suspicious, confirmed) {
  return {
    'no-breaches': clean,
    '1-2-breaches': suspicious,
    '3plus-breaches': confirmed,
    'skip': `"Take your time -- we'll circle back."`,
  };
}

export const VAULT_CAPITOL_MISSIONS = [

  // ══════════════════════════════════════════════════════
  // THE VAULT -- Chapter 2
  // "Your money lives here."
  // ══════════════════════════════════════════════════════

  // ── PRIMARY BANK ──────────────────────────────────────
  {
    id: 'primary_bank-recon-breach',
    accountId: 'primary_bank',
    phase: 'recon',
    title: 'Breach Recon: Primary Bank',
    briefing: 'A compromised bank login is not a nuisance -- it is a loss. Actual money, actually gone. Banks will reimburse fraud in most cases, but the process involves weeks of frozen accounts, provisional credits, and phone calls with hold music composed by someone who hates you.',
    steps: [
      { text: 'Open Have I Been Pwned — no account needed, just the search box', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email you use for your bank\'s online login into the search box. Hit the "pwned?" button.' },
      { text: 'Green screen = no breaches found for that email. Red screen = breaches found — scroll down to see which companies were breached and what data leaked.' },
      { text: 'If any breach says "Passwords" in the data types — that means your actual password was exposed. If you use the same password for your bank, change it immediately.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: `This is where it stops being theoretical. A breached bank credential is someone else's direct line to your checking account.`,
      debrief: scoutBreach(
        `"Clean. Your bank's front door is holding. That's real money you just protected."`,
        `"Some exposure. Could be from the bank, could be from any service that shares your email. Either way -- new password time."`,
        `"Multiple breaches. The stakes here are denominated in dollars. Let's fortify."`,
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'primary_bank-fortify-password',
    accountId: 'primary_bank',
    phase: 'fortify',
    title: 'Secure Login: Primary Bank',
    briefing: `If your bank password is the same as any other account -- any other account at all -- it's already been tried against your bank by automated scripts. Your password manager can generate a unique one. Let it do its job.`,
    steps: [
      { text: 'Open your bank\'s website or app and sign in. If you\'re not sure of the URL, search "[bank name] online banking" — don\'t click ad links, use the actual bank domain.' },
      { text: 'Look for **Settings**, **Security**, or **Profile** — it\'s usually in a menu behind your name or a gear icon. Tap it.' },
      { text: 'Find **Change Password** or **Update Password**. Some banks put this under "Sign-in & Security" or "Access Management".' },
      { text: 'Open your password manager (1Password, Bitwarden, Apple Keychain, etc.) and generate a new password — 16+ characters, random. Save it in the password manager BEFORE you submit the change.' },
      { text: 'Paste the new password into the bank\'s form, confirm it, and tap **Save** or **Update**. Your bank may log you out — just sign back in with the new password to verify it works.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Your password manager knows the drill by now. Generate, save, move on. The rhythm from Chapter 1 works here too."',
      debrief: {
        'reset-password': `"Fresh password on the vault door. That's real money locked down."`,
        "already-strong": `"Already unique. You treat your bank password with the respect it deserves."`,
        "later": `"The stakes here are measured in your actual bank balance. Come back soon."`,
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: "primary_bank-fortify-2fa",
    accountId: "primary_bank",
    phase: "fortify",
    title: "2FA Setup: Primary Bank",
    briefing: "Most banks offer SMS-based 2FA, and some now support authenticator apps. Even SMS -- which can be bypassed by SIM swapping -- is dramatically better than nothing. Turn on whatever they offer.",
    steps: [
      { text: 'Log into your bank\'s website — you may need your new password from the last mission.' },
      { text: 'Go to **Settings** or **Security**. Look for **Two-Factor Authentication**, **Two-Step Verification**, **Extra Security**, or **Login Verification** — banks call it different things.' },
      { text: 'If they offer an authenticator app option: choose that. Open your authenticator app (Google Authenticator, Authy, etc.), scan the QR code, enter the 6-digit code to confirm.' },
      { text: 'If they only offer SMS: enter your phone number. They\'ll text you a code — type it in to verify. SMS isn\'t perfect but it\'s way better than nothing.' },
      { text: 'If you don\'t see a 2FA option at all: your bank may not offer it (some don\'t). Move on — the strong password from the last mission is your main defense.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: `A bank without 2FA is a vault with just a combination lock. Turn on whatever they offer -- we'll take SMS over nothing.`,
      debrief: {
        'enabled-2fa': '"2FA on the bank. Even a SIM swapper now needs your phone AND your password."',
        'already-enabled': '"Already enabled. Ahead of 80% of bank customers."',
        'later': '"Real money behind this door. Come back soon."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'primary_bank-fortify-alerts',
    accountId: 'primary_bank',
    phase: 'fortify',
    title: 'Transaction Alerts: Primary Bank',
    briefing: 'Transaction alerts tell you the moment money moves. Set them for every transaction over $1 -- not $100, not $50. Fraud starts with small test charges ($1, $5) to see if the card works before the big hit. If you catch the $1, you stop the $1,000.',
    steps: [
      { text: 'Log into your bank\'s website or app.' },
      { text: 'Look for **Notifications**, **Alerts**, or **Alert Preferences** — usually under Settings or in the main menu.' },
      { text: 'Find transaction alerts. Set the threshold to **$0** or **$1** — you want to know about EVERY charge, including the small test charges that thieves use before the big hit.' },
      { text: 'Also turn on alerts for: **new payees added**, **large withdrawals** (over $100 or whatever feels right), and **login attempts from new devices**.' },
      { text: 'Choose how you want to be notified — **push notifications** if you check your phone, **email** if you don\'t. Pick whichever one you actually read.' },
    ],
    debriefQs: ALERTS_DEBRIEF,
    scoutDialog: {
      briefing: `A $1.00 charge from 'INTL DIGITAL SVCS\` is not a rounding error -- it's a thief testing your card before they max it out. Set alerts for everything over $1.`,
      debrief: {
        'enabled-alerts': `"Alerts on. You'll know about charges before the thief's coffee gets cold."`,
        "already-enabled": `"Already watching every dollar. Good instinct."`,
        "later": `"The alert setup takes two minutes. It catches fraud before it becomes a problem."`,
      },
    },
    estimatedMinutes: 3,
  },

  // ── CREDIT CARD PORTAL ────────────────────────────────
  {
    id: "credit_card-recon-breach",
    accountId: "credit_card",
    phase: "recon",
    title: "Breach Recon: Credit Card",
    briefing: "Your credit card portal stores your card number, billing address, and transaction history. The email you registered with has probably appeared in breaches from other services -- and if you reused the password, your credit card account is one automated login attempt from compromise.",
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email you use for your credit card\'s online portal into the search box. Hit "pwned?"' },
      { text: 'Green = no breaches. Red = breaches found. Scroll down to see which companies were breached. Look especially for retail and financial services — those are the ones most likely to share password formats with your card portal.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Credit card portals are less targeted than banks, but the email you registered with is in every breach database. If the password matches…"',
      debrief: scoutBreach(
        '"Clean. No exposure on the credit card front."',
        '"Some exposure. The card portal is only as safe as its password."',
        '"Multiple breaches. Change the password and check your recent statements for small test charges."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: "credit_card-fortify-password",
    accountId: "credit_card",
    phase: "fortify",
    title: "Secure Login: Credit Card",
    briefing: "Your credit card portal password protects your card number, your billing address, and your credit limit. Generate a new one in your password manager -- you know the drill from Chapter 1.",
    steps: [
      { text: 'Log into your credit card portal (Chase, Amex, Discover, Capital One, etc.). If you\'re not sure of the URL, check the back of your card for a website or search "[card company] login".' },
      { text: 'Look for **Account Settings**, **Profile**, or **Security** — usually behind a gear icon or your name in the top right.' },
      { text: 'Find **Change Password** or **Update Password**. Open your password manager, generate a new random password (16+ characters), and save it BEFORE you submit the change.' },
      { text: 'After changing the password, look for **Two-Factor Authentication** or **Enhanced Security** on the same page. If it\'s available, turn it on — most card companies offer SMS at minimum.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Password manager, generate, save. The rhythm carries over. This one guards your credit limit."',
      debrief: {
        "reset-password": '"New password on the credit card portal. One less door to your wallet."',
        "already-strong": '"Already unique. Moving on."',
        "later": '"Someone with this password can see your full card number. Worth fixing."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: "credit_card-fortify-alerts",
    accountId: "credit_card",
    phase: "fortify",
    title: "Transaction Alerts: Credit Card",
    briefing: "Same as the bank: set alerts for every transaction over $1. Credit cards are actually safer than debit cards for fraud (easier to dispute, doesn't drain your bank account directly), but you still want to catch it immediately.",
    steps: [
      { text: 'Log into your credit card portal.' },
      { text: 'Find **Notifications** or **Alerts** — look under Settings, Account, or in the main menu.' },
      { text: 'Set transaction alerts for **every purchase** — set the threshold to **$0** or **$1**. Fraudsters test stolen cards with tiny charges first.' },
      { text: 'Also turn on alerts for: **new authorized users added**, **balance over a threshold** (like 80% of your limit), and **payment due dates**.' },
    ],
    debriefQs: ALERTS_DEBRIEF,
    scoutDialog: {
      briefing: '"Credit cards have better fraud protection than debit cards, but you still want to know immediately. The first sign of a stolen card is a $1 test charge."',
      debrief: {
        "enabled-alerts": '"Alerts on. Your credit card now reports every transaction in real time."',
        "already-enabled": `"Already monitoring. The Vault's perimeter alarm is working."`,
        "later": '"Two minutes of setup catches fraud in real time. Worth it."',
      },
    },
    estimatedMinutes: 3,
  },

  // ── PAYPAL ────────────────────────────────────────────
  {
    id: "paypal-recon-breach",
    accountId: "paypal",
    phase: "recon",
    title: "Breach Recon: PayPal",
    briefing: "PayPal is the most credential-stuffed service on the internet. In 2022, attackers accessed 35,000 accounts by trying passwords leaked from other sites. If you used the same password on PayPal and on that recipe site that got breached in 2019, your PayPal password is compromised too.",
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type your PayPal email into the search box. Hit "pwned?"' },
      { text: 'If breaches show up: remember, PayPal\'s own 2022 incident wasn\'t a hack — attackers just tried passwords leaked from OTHER sites. 35,000 worked. If your PayPal password matches anything else, it\'s been tried.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: `"PayPal's 2022 breach wasn't even a hack -- attackers just tried passwords from other breaches and 35,000 of them worked. That's what password reuse does."`,
      debrief: scoutBreach(
        `"Clean. Your PayPal credentials aren't in the usual databases."`,
        `"Some exposure. If this password is shared with anything -- anything -- it's been tried on PayPal."`,
        `"Multiple breaches. Your email has been in enough dumps that automated tools are definitely trying it on PayPal. New password, now."`,
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: "paypal-fortify-password",
    accountId: "paypal",
    phase: "fortify",
    title: "Secure Login: PayPal",
    briefing: "PayPal connects to your bank and your cards. A unique password here is the difference between your money staying yours and a fraud dispute. Generate one in your password manager.",
    steps: [
      { text: 'Open PayPal Security Settings — you\'ll need to sign in first', url: 'https://www.paypal.com/myaccount/settings/security' },
      { text: 'You\'ll see a list of security options. Find **Password** and tap **Update** next to it.' },
      { text: 'Open your password manager, generate a new random password (16+ characters), save it, then paste it into PayPal\'s form and tap **Save**.' },
      { text: 'Back on the security page, find **2-step verification** and tap **Set up**. PayPal will ask you to choose SMS or an authenticator app — pick the authenticator app if you have one (Google Authenticator, Authy, etc.).' },
      { text: 'If you chose authenticator app: open it, scan the QR code PayPal shows you, then type the 6-digit code to confirm. If SMS: enter your phone number and verify with the texted code.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"Password and 2FA in one visit. Your password manager generates the password, your authenticator app handles the second factor. Two minutes, two layers."',
      debrief: {
        "reset-password": '"New PayPal password and 2FA. Your money just got a fresh lock and a deadbolt."',
        "already-strong": '"Already unique with 2FA. Good -- PayPal is one of the few accounts where that discipline directly protects your bank balance."',
        "later": `"The credential-stuffing bots don't take breaks. Come back to this."`,
      },
    },
    estimatedMinutes: 5,
  },

  // ── VENMO ─────────────────────────────────────────────
  {
    id: "venmo-recon-breach",
    accountId: "venmo",
    phase: "recon",
    title: "Breach Recon: Venmo",
    briefing: "Venmo connects directly to your bank account or debit card. It's also the app where your transaction history defaults to public -- everyone can see who you pay and what you write in the memo. A breach here hits your money and your privacy simultaneously.",
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email or phone number you use for Venmo into the search box. Hit "pwned?"' },
      { text: 'Check the results — Venmo connects to your bank account, so any breach exposure here means your bank-linked payment app might be at risk.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: `"Venmo connects to your bank and defaults your transactions to public. It's optimized for convenience, not for the moment someone else has your password."`,
      debrief: scoutBreach(
        '"Clean. Your Venmo credentials are off the market."',
        '"Some exposure. This one connects to your bank. New password."',
        `"Multiple breaches. Change the password and check if anyone's sent themselves money from your account."`,
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'venmo-fortify-password',
    accountId: 'venmo',
    phase: 'fortify',
    title: 'Secure Login: Venmo',
    briefing: `Venmo makes sending money frictionless -- tap, amount, send. That's great for you and catastrophic if someone else has your password. New password plus payment PIN in one visit.`,
    steps: [
      { text: 'Open Venmo Security Settings — you\'ll need to sign in', url: 'https://account.venmo.com/settings/security' },
      { text: 'Find **Password** and tap **Change**. Open your password manager, generate a new random password, save it, then paste it in and confirm.' },
      { text: 'Now find **Security Lock** and turn it ON. This requires your PIN, Face ID, or fingerprint for every payment — so even if someone has your phone unlocked, they can\'t send your money.' },
      { text: 'Venmo will ask you to set a PIN. Use something DIFFERENT from your phone unlock PIN and your bank PIN. Write it in your password manager.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: `"New password plus payment PIN. Even if someone gets your password, they still can't send your money without your face or your fingerprint."`,
      debrief: {
        "reset-password": `"Venmo locked: new password and payment PIN. Your frictionless payment app now has friction for attackers."`,
        "already-strong": `"Already unique with payment PIN. Good instinct on a direct-to-bank app."`,
        "later": `"This one connects to your bank. Don't sit on it."`,
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'venmo-reclaim-privacy',
    accountId: 'venmo',
    phase: 'reclaim',
    title: 'Privacy Lockdown: Venmo',
    briefing: `Venmo's default transaction privacy is public. Every payment you make -- the amount, the recipient, the memo -- is visible to anyone. A BuzzFeed reporter tracked the President's Venmo transactions in 2021. Two taps fix this.`,
    steps: [
      { text: 'Open Venmo Privacy Settings — sign in if prompted', url: 'https://account.venmo.com/settings/privacy' },
      { text: 'Find **Default Privacy Setting**. It\'s probably set to "Public" or "Friends". Change it to **Private**. This means future transactions are only visible to you and the recipient.' },
      { text: 'Find **Friends List** and set its visibility to **Private** too. A public friends list reveals your social connections.' },
      { text: 'Now scroll through your past transactions in the app. Any that say "Public" or have the globe icon — tap them and change to **Private**. Yes, your old rent payments and dinner splits have been public this whole time.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: `"Venmo defaults all transactions to public. Your rent, your dinner split, your therapist copay. A reporter found the President's Venmo in ten minutes. Fix this."`,
      debrief: {
        "tightened": `"Transactions set to private. Your financial life just disappeared from public view."`,
        "already-tight": `"Already private. You're one of the few Venmo users who found the setting."`,
        'later': '"This is the single highest-impact privacy setting in The Vault. Two taps."',
      },
    },
    estimatedMinutes: 3,
  },

  // ── CASH APP ──────────────────────────────────────────
  {
    id: 'cashapp-recon-breach',
    accountId: 'cashapp',
    phase: 'recon',
    title: 'Breach Recon: Cash App',
    briefing: `Cash App had a major breach in 2022 when a former employee downloaded data on 8.2 million users -- names, brokerage account numbers, portfolio values. The insider threat is the one your password can't stop, but securing the account limits what anyone can do with the stolen data.`,
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email or phone number you use for Cash App into the search box. Hit "pwned?"' },
      { text: 'Check the results. Cash App\'s own 2022 breach was an insider — a former employee downloaded 8.2 million users\' data. Your info may have been exposed even if you did everything right.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: `"Cash App's 2022 breach was an inside job -- a former employee walked out with 8.2 million users\` data. The insider threat is the one the firewall doesn't see."`,
      debrief: scoutBreach(
        `"Clean. Your Cash App credentials aren't in the usual databases."`,
        `"Some exposure. Could be from Cash App's breach or another service."`,
        `"Multiple breaches. Secure the account and check your balance."`,
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: "cashapp-fortify-password",
    accountId: "cashapp",
    phase: "fortify",
    title: "Secure Login: Cash App",
    briefing: `Cash App uses magic-link login -- they send a code to your email or phone. That means whoever controls your email controls your Cash App. The password to secure here is your email's. While you're in the app, enable Security Lock.`,
    steps: [
      { text: 'Open Cash App on your phone. Tap your **profile icon** (top right corner), then tap **Security & Privacy**.' },
      { text: 'Find **Security Lock** and turn it ON. This makes every payment require your PIN, Face ID, or fingerprint — even if your phone is already unlocked.' },
      { text: 'Cash App will ask you to set a PIN. Pick something DIFFERENT from your phone unlock PIN and your bank PIN. Save it in your password manager.' },
      { text: 'Cash App uses "magic link" login — it emails or texts you a code instead of a password. That means whoever controls your email controls your Cash App. Make sure your email has a strong password + 2FA (if you did Chapter 1, this is already done).' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: `"Cash App's magic link means your email IS your password. If you secured your email in Chapter 1, half the work is done. Security Lock finishes the job."`,
      debrief: {
        "reset-password": '"Security Lock enabled. Every Cash App payment now requires your face or your fingerprint."',
        "already-strong": '"Already locked. You understand the magic-link chain of trust."',
        "later": `"If your email was secured in Chapter 1, you're halfway there. The Security Lock is the other half."`,
      },
    },
    estimatedMinutes: 3,
  },

  // ── CRYPTO EXCHANGE ───────────────────────────────────
  {
    id: "crypto_exchange-recon-breach",
    accountId: "crypto_exchange",
    phase: "recon",
    title: "Breach Recon: Crypto Exchange",
    briefing: "Crypto is the one place where stolen money is gone forever. No chargebacks, no fraud department, no reversal. The blockchain does not care about your feelings. Exchanges like Coinbase, Kraken, and Gemini have all had credential-related incidents.",
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email you use for your crypto exchange (Coinbase, Kraken, Gemini, Robinhood, etc.) into the search box. Hit "pwned?"' },
      { text: 'Any breaches at all here are serious — crypto accounts are the highest-value targets because stolen crypto is irreversible. No chargebacks, no fraud department, no refunds.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"A stolen bank password costs you weeks of paperwork. A stolen crypto password costs you your balance, permanently. No chargebacks on the blockchain."',
      debrief: scoutBreach(
        '"Clean. Your exchange credentials are off the grid."',
        '"Some exposure on a crypto account. This is priority-zero. New password, authenticator app, hardware key if they support it."',
        '"Multiple breaches. Change the password, enable every security option the exchange offers, and consider moving assets to cold storage."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: "crypto_exchange-fortify-lockdown",
    accountId: "crypto_exchange",
    phase: "fortify",
    title: "Full Lockdown: Crypto Exchange",
    briefing: "Crypto accounts deserve the strongest security you have. New password, authenticator app (NOT SMS -- SIM swapping specifically targets crypto holders), withdrawal address whitelisting, and check for rogue API keys. All in one visit.",
    steps: [
      { text: 'Log into your crypto exchange. If you\'re not sure which one you have, check your email for "Coinbase", "Kraken", "Gemini", or "Robinhood" welcome emails.' },
      { text: 'Go to **Settings** or **Security**. Find **Change Password**. Open your password manager, generate a 20+ character random password, save it, then paste and confirm.' },
      { text: 'Now find **Two-Factor Authentication**. Choose **authenticator app** or **hardware security key** — NOT SMS. SIM swapping attacks specifically target crypto holders because stolen crypto can\'t be reversed.' },
      { text: 'Look for **Withdrawal Address Whitelisting** or **Address Book** — turn it ON. This means only pre-approved wallet addresses can receive your funds. Even if someone gets your password + 2FA, they can\'t send your crypto to their wallet.' },
      { text: 'Go to **API Keys** or **API Management**. You\'ll see a list of keys (may be empty). If there are any you didn\'t create, or created for a service you no longer use — tap **Revoke** or **Delete** on each one.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"SIM swapping exists because of crypto. Attackers port your number, receive your SMS codes, drain your exchange. Authenticator app or hardware key. Never SMS on crypto."',
      debrief: {
        "reset-password": '"Crypto account locked down: new password, authenticator 2FA, whitelisted addresses. The vault within the Vault."',
        "already-strong": `"Already locked down. Make sure withdrawal whitelisting is on -- that's the kill switch even if everything else fails."`,
        "later": '"The urgency here is proportional to your balance. No chargebacks in crypto."',
      },
    },
    estimatedMinutes: 10,
  },

  // ── INVESTMENT ACCOUNT ────────────────────────────────
  {
    id: "investment_account-recon-breach",
    accountId: "investment_account",
    phase: "recon",
    title: "Breach Recon: Investment Account",
    briefing: "Your brokerage or retirement account probably holds more money than your bank account -- but probably has a weaker password. Fidelity had a breach in 2024 exposing 77,000 customers' personal data. These accounts hold your retirement savings, your SSN, and your bank routing numbers.",
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email you use for your brokerage account (Fidelity, Schwab, Vanguard, E-Trade, Robinhood, etc.) into the search box. Hit "pwned?"' },
      { text: 'Any breaches here are worth taking seriously — your brokerage probably holds more money than your bank account, and it also stores your SSN and bank routing numbers.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Your retirement account probably holds more money than your bank account. It also probably has a password you set during signup and never thought about again."',
      debrief: scoutBreach(
        '"Clean. Your retirement nest egg is off the radar."',
        '"Some exposure. This account likely holds more than your checking account. Treat the password accordingly."',
        '"Multiple breaches. New password, 2FA, and check for unauthorized trades or beneficiary changes."',
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: "investment_account-fortify-password",
    accountId: "investment_account",
    phase: "fortify",
    title: "Secure Login: Investment Account",
    briefing: "New password and 2FA on the account that holds your retirement savings. Fidelity and Schwab support security keys. For an account measured in decades of savings, use the strongest option available.",
    steps: [
      { text: 'Log into your brokerage account. If you haven\'t logged in for a while, you may need to verify your identity — that\'s normal for financial accounts.' },
      { text: 'Go to **Security Settings** or **Profile & Settings**. Find **Change Password**. Generate a new 16+ character random password in your password manager, save it, then paste and confirm.' },
      { text: 'On the same security page, find **Two-Factor Authentication**. Fidelity and Schwab support security keys (YubiKey); most others offer authenticator apps. Enable the strongest option available.' },
      { text: 'While you\'re here: look for **Beneficiary** or **Transfer on Death** designations. This is who gets your investments if something happens to you. Make sure the names are correct and current — an attacker who changes your beneficiary is playing a very long game.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: `"Password, 2FA, and a beneficiary check -- all in one visit. An attacker who changes your beneficiary and waits is playing a longer game than most people think about."`,
      debrief: {
        "reset-password": `"Investment account secured: new password, 2FA, beneficiaries verified. Your retirement just got a full security upgrade."`,
        "already-strong": `"Already strong with 2FA. Did you check the beneficiaries? That's the silent risk."`,
        'later': '"The balance in this account is the urgency. Come back proportionally."',
      },
    },
    estimatedMinutes: 8,
  },


  // ══════════════════════════════════════════════════════
  // THE CAPITOL -- Chapter 6
  // "Legal identity. Compromise here is identity theft
  //  in the fullest sense."
  // ══════════════════════════════════════════════════════

  // ── SSA (SOCIAL SECURITY) ─────────────────────────────
  {
    id: "ssa-recon-claim",
    accountId: "ssa",
    phase: "recon",
    title: "Claim Your SSA Account",
    briefing: "The most important thing about your my Social Security account is whether it exists. If you haven't created one, an identity thief can create one using your SSN -- and control your Social Security record. The 2017 Equifax breach put 147 million SSNs on the market. Yours is almost certainly out there. Claim it first.",
    steps: [
      { text: 'Open the my Social Security page — you may need to create an account or sign in through Login.gov or ID.me', url: 'https://www.ssa.gov/myaccount/' },
      { text: 'If you DON\'T have an account yet: tap **Create an Account**. This is important — it prevents someone else from creating an account with your SSN. You\'ll verify your identity through Login.gov or ID.me (photo ID + selfie).' },
      { text: 'If you DO have an account: sign in. Once in, check that your **mailing address** is correct — an address change is how benefits get redirected to someone else.' },
      { text: 'Check your **phone number** and **direct deposit** info. If anything looks wrong, update it and look for recent activity you didn\'t initiate — benefit applications, address changes, or bank account changes.' },
    ],
    debriefQs: ACCOUNT_CLAIMED_DEBRIEF,
    scoutDialog: {
      briefing: `"The Equifax breach put 147 million SSNs on the market. Your SSN is not a secret anymore -- it's a shared key. The defense is claiming the account before someone else does."`,
      debrief: {
        "claimed": '"Account claimed. You just prevented someone else from filing for Social Security benefits as you."',
        "already-had": '"Already claimed. Verify the contact info is still yours -- address changes are how benefits get redirected."',
        "later": '"This is a race. If someone claims it first, the cleanup takes months. Prioritize this."',
      },
    },
    estimatedMinutes: 10,
  },
  {
    id: "ssa-fortify-lockdown",
    accountId: "ssa",
    phase: "fortify",
    title: "Secure & Lock: SSA Account",
    briefing: "Your SSA account routes through Login.gov or ID.me. Whichever one you have, lock it down with a unique password and 2FA -- this same login protects your SSA, your IRS, your VA benefits, and any other federal service. Also consider SSA's Self Lock feature, which blocks E-Verify queries against your SSN.",
    steps: [
      { text: 'Log into my Social Security — note whether you sign in through **Login.gov** or **ID.me**. Whichever one it is, that\'s the identity provider to secure.', url: 'https://www.ssa.gov/myaccount/' },
      { text: 'If Login.gov: go to account.login.gov > **Your account** > **Authentication methods**. Change your password (use password manager, 16+ characters). Add an authenticator app if you haven\'t.', url: 'https://secure.login.gov/account' },
      { text: 'If ID.me: go to account.id.me > **Sign-In & Security**. Change your password and verify that **Multi-factor authentication** is enabled (ID.me typically uses SMS or their app).', url: 'https://account.id.me/security' },
      { text: 'Back in your SSA account: look for **Self Lock** — this blocks E-Verify queries against your SSN, which prevents someone from using your SSN to get hired. Not all accounts show this option.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: `"Login.gov or ID.me is the skeleton key to federal services. Secure it once and you've locked down SSA, IRS, VA, and state unemployment. One action, multiple buildings."`,
      debrief: {
        "reset-password": '"Federal identity provider secured. Every government service behind it is now harder to breach."',
        "already-strong": `"Already locked down. The Capitol's front gate was pre-fortified."`,
        "later": '"This one login protects multiple government accounts. High priority."',
      },
    },
    estimatedMinutes: 10,
  },

  // ── IRS (TAX ACCOUNT) ────────────────────────────────
  {
    id: "irs-recon-claim",
    accountId: "irs",
    phase: "recon",
    title: "Claim Your IRS Account",
    briefing: "Tax identity theft is a $5.7 billion annual industry. Someone files a return with your SSN before you do, claims a fat refund, and you spend 18 months proving you're you. Step one: claim your IRS online account before they do.",
    steps: [
      { text: 'Open IRS Online Account — you\'ll sign in through ID.me (photo ID + selfie verification)', url: 'https://www.irs.gov/payments/your-online-account' },
      { text: 'If you DON\'T have an account: tap **Create Account**. You\'ll go through ID.me identity verification — have your driver\'s license or passport ready, plus your phone for a selfie. This takes about 10 minutes but prevents someone else from filing taxes as you.' },
      { text: 'If you DO have an account: sign in and tap **Tax Records** or **View Tax Return Transcript**. You should recognize every filing listed.' },
      { text: 'Look for: returns you didn\'t file, addresses you\'ve never lived at, or bank accounts you don\'t recognize in the direct deposit info. Any of these means someone has used your identity.' },
    ],
    debriefQs: ACCOUNT_CLAIMED_DEBRIEF,
    scoutDialog: {
      briefing: `"Tax identity theft: someone files your return, takes your refund, and you find out when the IRS rejects your real return months later. Claim the account. File first."`,
      debrief: {
        "claimed": `"IRS account claimed. You just made it much harder for someone to file a tax return in your name."`,
        "already-had": `"Already claimed. Check the return history -- phantom tax returns are the canary for tax identity theft."`,
        'later': `"This is time-sensitive if you haven't filed this year's return yet. Claim it."`,
      },
    },
    estimatedMinutes: 10,
  },
  {
    id: 'irs-fortify-ip-pin',
    accountId: 'irs',
    phase: 'fortify',
    title: 'Get an IRS Identity Protection PIN',
    briefing: `The IRS Identity Protection PIN is a six-digit number that must be included on any tax return filed with your SSN. Without it, the return gets rejected -- even if the thief has your SSN, your name, and your address. It's effectively 2FA for your tax identity. Free, takes five minutes.`,
    steps: [
      { text: 'Open the IRS IP PIN page', url: 'https://www.irs.gov/identity-theft-fraud-scams/get-an-identity-protection-pin' },
      { text: 'Tap **Get an IP PIN**. You\'ll sign in through ID.me — if you just created an account in the last mission, you can use the same login.' },
      { text: 'The IRS will show you a 6-digit IP PIN. **Write it down** or screenshot it. Store it with your tax documents — your tax preparer will need it when filing your return.' },
      { text: 'You\'ll get a new PIN every January, either by mail (CP01A notice) or through your IRS online account. The old one expires each year.' },
    ],
    debriefQs: TWO_FA_DEBRIEF,
    scoutDialog: {
      briefing: `"The IP PIN is the single most effective defense against tax identity theft. Even if someone has your SSN, they can't file a return without this number. Free. Five minutes."`,
      debrief: {
        "enabled-2fa": '"IP PIN obtained. Your tax return now requires a secret only you know. The $5.7 billion fraud industry just lost access to your refund."',
        'already-enabled': `"Already have one. You're in the minority of taxpayers who've taken this step."`,
        'later': '"Five minutes now saves 18 months of identity theft recovery later. Come back."',
      },
    },
    estimatedMinutes: 5,
  },
  {
    id: 'irs-reclaim-verify',
    accountId: 'irs',
    phase: 'reclaim',
    title: 'Verify Tax Records: IRS',
    briefing: 'Log into your IRS account and verify that your filing address, direct deposit bank account, and tax transcript are correct. The classic tax fraud move is changing the refund bank account -- your return gets filed, your refund goes to their bank.',
    steps: [
      { text: 'Log into your IRS online account — sign in through ID.me', url: 'https://www.irs.gov/payments/your-online-account' },
      { text: 'Check your **mailing address** — is it where you actually live? A changed address is how tax refunds get redirected.' },
      { text: 'Check your **bank account** for direct deposit — is it YOUR bank? Look at the last 4 digits of the routing and account numbers. If you don\'t recognize them, someone may have changed where your refund goes.' },
      { text: 'Tap **Tax Records** or **View Transcript**. Look at each filing — do you recognize them all? Any you don\'t recognize is a red flag for tax identity theft.' },
      { text: 'Verify your **IP PIN** is active for the current/next tax year. If you set one up in the last mission, it should show here.' },
    ],
    debriefQs: PRIVACY_DEBRIEF,
    scoutDialog: {
      briefing: '"The classic move: change the refund bank account. Your return gets filed, your refund goes to their bank, and you find out when the IRS rejects your real return. Check the deposit info."',
      debrief: {
        'tightened': '"Bank details verified, IP PIN confirmed. Your tax refund will go to your bank, not theirs."',
        'already-tight': `"Already reviewed. The Capitol's treasury is secure."`,
        "later": `"Check the direct deposit info at minimum. That's where the money goes."`,
      },
    },
    estimatedMinutes: 10,
  },

  // ── STATE DMV ─────────────────────────────────────────
  {
    id: 'state_dmv-recon-claim',
    accountId: 'state_dmv',
    phase: 'recon',
    title: 'Claim Your DMV Account',
    briefing: `Your driver's license number is in more databases than you think -- every landlord application, car rental, background check, and bar that scanned your ID made a copy. If your state has an online DMV portal, claim the account so no one can create one with your license number and change your address.`,
    steps: [
      { text: 'Search **"[your state] DMV online account"** in your browser. For example: "California DMV online account" or "Texas DMV online account". Look for the official .gov domain.' },
      { text: 'If you DON\'T have an account: tap **Create Account** or **Register**. You\'ll typically need your driver\'s license number, last 4 of SSN, and date of birth.' },
      { text: 'If you DO have an account: sign in and check your **address** — is it current? An address change on your license lets someone get a duplicate ID at their address.' },
      { text: 'Look for any **duplicate license requests** or **address change history** you didn\'t initiate. Also verify your license status shows as "Valid" and not "Suspended" (which could mean someone caused issues with a duplicate).' },
    ],
    debriefQs: ACCOUNT_CLAIMED_DEBRIEF,
    scoutDialog: {
      briefing: `"A duplicate license at someone else's address is a skeleton key for identity verification. Banks, police, and landlords all accept a driver's license as proof of identity."`,
      debrief: {
        'claimed': '"DMV account claimed. One fewer way for someone to get a copy of your license at their address."',
        'already-had': `"Already claimed. Verify the address -- that's the attack vector."`,
        "later": `"State DMV portals vary. Some don't exist. If yours does, claim it."`,
      },
    },
    estimatedMinutes: 10,
  },
  {
    id: 'state_dmv-fortify-password',
    accountId: 'state_dmv',
    phase: 'fortify',
    title: 'Secure Login: State DMV',
    briefing: 'State government IT is… variable. Some states have modern systems. Some run on code older than their interns. A strong, unique password compensates for a lot. If they offer 2FA, enable it -- you might be their only user who does.',
    steps: [
      { text: 'Log into your state DMV online account (the one you found or created in the last mission).' },
      { text: 'Look for **Account Settings**, **Profile**, or **Security** — state DMV sites vary a lot in layout. If you can\'t find it, try looking for a gear icon or "My Account".' },
      { text: 'Find **Change Password**. Open your password manager, generate a new random password (16+ characters), save it, then paste and confirm.' },
      { text: 'Check if 2FA is available — some state DMV sites offer it, many don\'t. If they have it, enable it. If not, the strong password is your main defense.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: '"State government IT budgets are not generous. Your strong password might be the most sophisticated security in their entire stack."',
      debrief: {
        'reset-password': `"DMV account secured. You've done what you can with what they give you."`,
        "already-strong": `"Already strong. Impressive, given how forgettable DMV passwords tend to be."`,
        "later": `"Your license number is an identity verification skeleton key. Worth securing."`,
      },
    },
    estimatedMinutes: 5,
  },

  // ── HEALTHCARE PORTAL ─────────────────────────────────
  {
    id: "healthcare_portal-recon-breach",
    accountId: "healthcare_portal",
    phase: "recon",
    title: "Breach Recon: Healthcare",
    briefing: `Healthcare records are worth 10x more than credit card numbers on the dark web. They contain your SSN, your insurance info, your prescriptions, and your medical history -- all in one record. The 2015 Anthem breach exposed 78.8 million records. Medical identity theft puts someone else's blood type in your chart.`,
    steps: [
      { text: 'Open Have I Been Pwned', url: 'https://haveibeenpwned.com' },
      { text: 'Type the email you use for Healthcare.gov, your health insurance portal, or patient portals like MyChart. Hit "pwned?"' },
      { text: 'Healthcare breaches are especially dangerous because the stolen data is comprehensive — SSN, insurance ID, prescriptions, medical history, all in one record. If breaches show up, take note of which ones.' },
    ],
    debriefQs: BREACH_DEBRIEF,
    scoutDialog: {
      briefing: '"Healthcare records are the most valuable stolen data on the dark web. SSN, insurance, prescriptions, medical history -- all in one record. And medical identity theft can literally affect your care."',
      debrief: scoutBreach(
        '"Clean. Your healthcare credentials are off the market."',
        '"Some exposure. Healthcare breaches are especially dangerous because the data is comprehensive."',
        `"Multiple breaches. New password, 2FA, and check your insurance statements for claims you didn't make."`,
      ),
    },
    estimatedMinutes: 3,
  },
  {
    id: 'healthcare_portal-fortify-password',
    accountId: 'healthcare_portal',
    phase: 'fortify',
    title: 'Secure Login: Healthcare',
    briefing: 'Healthcare IT security budgets are notoriously thin. Your password is probably the strongest security layer between your medical records and the outside world. If the portal offers 2FA, consider it a minor miracle and enable it.',
    steps: [
      { text: 'Log into your main healthcare portal — this might be Healthcare.gov, your insurance company\'s website, or a patient portal like MyChart. Sign in with your existing credentials.', url: 'https://www.healthcare.gov/login/' },
      { text: 'Look for **Account Settings** or **Security**. Find **Change Password**. Open your password manager, generate a 16+ character random password, save it, then paste and confirm.' },
      { text: 'Check if the portal offers **Two-Factor Authentication** or **Extra Security** — many healthcare portals are behind on this, but some have added it. Turn it on if available.' },
      { text: 'If you use MyChart or another patient portal separately: log into that one too and change its password. These often have separate logins from your insurance portal.' },
      { text: 'While you\'re in, check your **insurance claims** — look for any medical visits or prescriptions you don\'t recognize. That could mean someone is using your insurance identity.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: `Healthcare IT is underfunded. Your password is compensating for the entire industry's security budget. Make it count.`,
      debrief: {
        'reset-password': '"Healthcare portal secured. Your medical records have a real lock now."',
        'already-strong': `"Already strong. You're ahead of the healthcare IT curve."`,
        'later': '"Healthcare records are worth more than credit cards on the dark web. Worth fixing."',
      },
    },
    estimatedMinutes: 5,
  },

  // ── STUDENT LOANS ─────────────────────────────────────
  {
    id: 'student_loans-recon-claim',
    accountId: 'student_loans',
    phase: 'recon',
    title: 'Claim Your StudentAid Account',
    briefing: 'Your FSA ID can sign legal documents electronically -- including new federal loan applications. Nelnet, one of the largest servicers, had a breach in 2022 exposing 2.5 million borrowers" personal data. Claim your StudentAid.gov account and verify no one has filed for aid in your name.',
    steps: [
      { text: 'Open StudentAid.gov — you\'ll sign in through Login.gov (if you set that up for the SSA mission, use the same login)', url: 'https://studentaid.gov/fsa-id/sign-in/landing' },
      { text: 'If you DON\'T have an account: tap **Create Account**. You\'ll go through Login.gov identity verification. This prevents someone from applying for federal student aid using your identity.' },
      { text: 'Once signed in, tap **My Aid** in the menu. You\'ll see a list of every federal student loan and grant associated with your SSN.' },
      { text: 'Look through the list — do you recognize every loan? Any loan you didn\'t take out means someone used your identity for federal financial aid. If you find one, contact the FSA ombudsman immediately.' },
    ],
    debriefQs: ACCOUNT_CLAIMED_DEBRIEF,
    scoutDialog: {
      briefing: `"Your FSA ID signs legal documents. An attacker with your FSA ID could take out federal loans in your name. Claim the account, check 'My Aid' for ghost loans."`,
      debrief: {
        'claimed': '"StudentAid account claimed. No one can apply for federal aid as you without being noticed."',
        'already-had': `"Already claimed. Check 'My Aid' for loans you don't recognize -- that's the canary."`,
        'later': `"The FSA ID signs legal documents. Don't leave this unclaimed."`,
      },
    },
    estimatedMinutes: 10,
  },
  {
    id: "student_loans-fortify-password",
    accountId: "student_loans",
    phase: "fortify",
    title: "Secure Login: Student Loans",
    briefing: `StudentAid.gov goes through Login.gov -- if you already secured Login.gov for your SSA account, this might already be done. Check, and also secure your individual loan servicer's account separately.`,
    steps: [
      { text: 'If you secured Login.gov during the SSA missions, StudentAid.gov is already protected — they share the same login. Verify by signing in and confirming 2FA is still active.', url: 'https://secure.login.gov/account' },
      { text: 'Now log into your **individual loan servicer\'s** website separately — this is the company that actually handles your payments (Nelnet, MOHELA, Great Lakes, FedLoan, etc.). It has its own separate login.' },
      { text: 'Change that password too — open your password manager, generate a new one, save it, paste and confirm. This should be a DIFFERENT password from Login.gov.' },
      { text: 'While you\'re in the servicer account: check your **autopay bank account** (is it your bank?) and **contact info** (is it your address?). A changed bank account means someone could be redirecting your payment confirmations.' },
    ],
    debriefQs: PASSWORD_DEBRIEF,
    scoutDialog: {
      briefing: `"If you secured Login.gov for SSA, StudentAid.gov is already protected -- they share the same identity provider. But your individual loan servicer has its own login. Secure that too."`,
      debrief: {
        "reset-password": `"Student loan accounts secured across both portals. The Capitol's education wing is locked."`,
        'already-strong': '"Already strong on both. The Login.gov chain is doing its job."',
        'later': '"Check if Login.gov 2FA carried over. If it did, you just need the servicer password."',
      },
    },
    estimatedMinutes: 5,
  },
];