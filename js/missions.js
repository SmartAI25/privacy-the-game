const ACCOUNTS = [
  { id: "gmail",      name: "Gmail",          category: "email" },
  { id: "outlook",    name: "Outlook",        category: "email" },
  { id: "icloud",     name: "iCloud Mail",    category: "email" },
  { id: "yahoo",      name: "Yahoo Mail",     category: "email" },
  { id: "protonmail", name: "ProtonMail",     category: "email" },
  { id: "apple",      name: "Apple ID",       category: "identity" },
  { id: "google",     name: "Google",         category: "identity" },
  { id: "microsoft",  name: "Microsoft",      category: "identity" },
  { id: "facebook",   name: "Facebook Login", category: "identity" },
];

const URLS = {
  breach:         "https://haveibeenpwned.com",
  loginGmail:     "https://myaccount.google.com/notifications",
  loginOutlook:   "https://account.live.com/activity",
  loginIcloud:    "https://appleid.apple.com/account/manage",
  loginYahoo:     "https://login.yahoo.com/account/activity",
  loginProton:    "https://account.proton.me/security#logs",
  securityGmail:  "https://myaccount.google.com/security",
  securityOutlook:"https://account.live.com/proofs/manage/additional",
  securityIcloud: "https://appleid.apple.com/account/manage",
  securityYahoo:  "https://login.yahoo.com/account/security",
  securityProton: "https://account.proton.me/security",
  securityApple:  "https://appleid.apple.com/account/manage",
  securityGoogle: "https://myaccount.google.com/security",
  securityMs:     "https://account.microsoft.com/security",
  securityFb:     "https://www.facebook.com/settings?tab=security",
  privacyGmail:   "https://myaccount.google.com/data-and-privacy",
  privacyOutlook: "https://account.microsoft.com/privacy",
  privacyIcloud:  "https://privacy.apple.com",
  privacyYahoo:   "https://login.yahoo.com/account/personalinfo",
  privacyProton:  "https://account.proton.me/security#privacy",
  privacyApple:   "https://privacy.apple.com",
  privacyGoogle:  "https://myaccount.google.com/data-and-privacy",
  privacyMs:      "https://account.microsoft.com/privacy",
  privacyFb:      "https://www.facebook.com/settings?tab=privacy",
  recoveryGmail:  "https://myaccount.google.com/security",
  recoveryOutlook:"https://account.live.com/proofs/manage",
  recoveryIcloud: "https://appleid.apple.com/account/manage",
  recoveryYahoo:  "https://login.yahoo.com/account/security",
  recoveryProton: "https://account.proton.me/recovery",
  recoveryApple:  "https://appleid.apple.com/account/manage",
  recoveryGoogle: "https://myaccount.google.com/security",
  recoveryMs:     "https://account.microsoft.com/security",
  recoveryFb:     "https://www.facebook.com/settings?tab=security",
  tfaGmail:       "https://myaccount.google.com/signinoptions/two-step-verification",
  tfaOutlook:     "https://account.live.com/proofs/manage/additional",
  tfaIcloud:      "https://appleid.apple.com/account/manage",
  tfaYahoo:       "https://login.yahoo.com/account/security",
  tfaProton:      "https://account.proton.me/security#two-fa",
  tfaApple:       "https://appleid.apple.com/account/manage",
  tfaGoogle:      "https://myaccount.google.com/signinoptions/two-step-verification",
  tfaMs:          "https://account.microsoft.com/security",
  tfaFb:          "https://www.facebook.com/settings?tab=security",
  passwordGmail:  "https://myaccount.google.com/signinoptions/password",
  passwordOutlook:"https://account.live.com/password/change",
  passwordIcloud: "https://appleid.apple.com/account/manage",
  passwordYahoo:  "https://login.yahoo.com/account/security",
  passwordProton: "https://account.proton.me/security#password",
  passwordApple:  "https://appleid.apple.com/account/manage",
  passwordGoogle: "https://myaccount.google.com/signinoptions/password",
  passwordMs:     "https://account.microsoft.com/security",
  passwordFb:     "https://www.facebook.com/settings?tab=security",
};

const DEBRIEF_BREACH = {
  questions: [
    {
      id: "finding",
      prompt: "What did you find?",
      options: [
        { id: "clean", label: "No breaches found", tag: "SAFE", color: "green" },
        { id: "minor", label: "Found in 1–2 breaches", tag: "WARN", color: "amber" },
        { id: "major", label: "Found in 3+ breaches", tag: "CRIT", color: "red" },
        { id: "skip",  label: "Couldn’t check right now", tag: "SKIP", color: "muted" }
      ]
    }
  ]
};

const DEBRIEF_LOGIN_HISTORY = {
  questions: [
    {
      id: "finding",
      prompt: "Anything suspicious?",
      options: [
        { id: "clean",      label: "All logins look like me",             tag: "SAFE", color: "green" },
        { id: "suspicious",  label: "Found unfamiliar logins",            tag: "WARN", color: "amber" },
        { id: "compromised", label: "Definite unauthorized access",       tag: "CRIT", color: "red" },
        { id: "skip",        label: "Couldn’t check right now",      tag: "SKIP", color: "muted" }
      ]
    }
  ]
};

const DEBRIEF_PASSWORD = {
  questions: [
    {
      id: "action",
      prompt: "Did you reset your password?",
      options: [
        { id: "reset",  label: "Yes, changed to a new unique password", tag: "DONE", color: "green" },
        { id: "strong", label: "It was already unique and strong",       tag: "SAFE", color: "green" },
        { id: "skip",   label: "I’ll come back to this",           tag: "SKIP", color: "muted" }
      ]
    }
  ]
};

const DEBRIEF_TFA = {
  questions: [
    {
      id: "action",
      prompt: "Is two-factor authentication enabled?",
      options: [
        { id: "enabled", label: "Yes, just turned it on",       tag: "DONE", color: "green" },
        { id: "already", label: "It was already enabled",        tag: "SAFE", color: "green" },
        { id: "notsupported", label: "This service doesn’t offer it", tag: "N/A", color: "muted" },
        { id: "skip",    label: "I’ll come back to this",  tag: "SKIP", color: "muted" }
      ]
    }
  ]
};

const DEBRIEF_RECOVERY = {
  questions: [
    {
      id: "action",
      prompt: "Are your recovery options current?",
      options: [
        { id: "updated", label: "Yes, verified and updated",             tag: "DONE", color: "green" },
        { id: "current", label: "They were already up to date",          tag: "SAFE", color: "green" },
        { id: "removed", label: "Removed an old phone number or email",  tag: "FIXED", color: "amber" },
        { id: "skip",    label: "I’ll come back to this",           tag: "SKIP", color: "muted" }
      ]
    }
  ]
};

const DEBRIEF_PRIVACY = {
  questions: [
    {
      id: "action",
      prompt: "Did you review and adjust privacy settings?",
      options: [
        { id: "adjusted",  label: "Yes, tightened several settings",    tag: "DONE", color: "green" },
        { id: "already",   label: "They were already locked down",       tag: "SAFE", color: "green" },
        { id: "partial",   label: "Changed some, need to finish later", tag: "WIP",  color: "amber" },
        { id: "skip",      label: "I’ll come back to this",        tag: "SKIP", color: "muted" }
      ]
    }
  ]
};


// ─── Helper to look up a URL key ─────────────────────────────────────────────

function url(prefix, accountId) {
  const idMap = {
    gmail: "Gmail", outlook: "Outlook", icloud: "Icloud",
    yahoo: "Yahoo", protonmail: "Proton",
    apple: "Apple", google: "Google", microsoft: "Ms", facebook: "Fb"
  };
  return URLS[prefix + idMap[accountId]] || null;
}


// ═══════════════════════════════════════════════════════════════════════════════
// SURVEY MISSION
// ═══════════════════════════════════════════════════════════════════════════════

const surveyMission = {
  id: "survey-master-keys",
  district: "master-keys",
  phase: "survey",
  account: null,
  category: null,
  briefing: {
    title: "Account Survey: The Master Keys",
    why: "Before we storm any buildings, we need to know which buildings are yours. Not everyone has a Yahoo account. Some of you made one in 2004 to play fantasy football and genuinely forgot. That one still counts. Data brokers have longer memories than you do.",
    steps: [
      { text: "Look at the list of email and identity provider accounts below" },
      { text: "Check the ones you currently have — even if you rarely use them" },
      { text: "If you're not sure, check anyway — we'll sort it out in recon" }
    ],
    externalUrl: null,
    estimatedMinutes: 2,
    scoutSays: "Be honest with yourself here. That Microsoft account you made for a free trial of Office in college? It's still out there. It has your name, your old phone number, and an enthusiasm for PowerPoint templates that no longer represents who you are."
  },
  debrief: {
    questions: [
      {
        id: "accounts",
        prompt: "Which of these accounts do you have?",
        type: "checklist",
        options: ACCOUNTS.map(a => ({ id: a.id, label: a.name, category: a.category }))
      }
    ]
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// RECON: BREACH RECON MISSIONS (all 9 accounts)
// ═══════════════════════════════════════════════════════════════════════════════

const breachReconMissions = ACCOUNTS.map(a => ({
  id: `breach-recon-${a.id}`,
  district: "master-keys",
  phase: "recon",
  account: a.name,
  category: a.category,
  briefing: {
    title: `Breach Recon: ${a.name}`,
    why: null,   // loaded from DIALOGUE.briefing.breachRecon[accountId]
    steps: [
      { text: "Open haveibeenpwned.com" },
      { text: `Enter your ${a.name} email address` },
      { text: "Note how many breaches (if any) your email appears in" }
    ],
    externalUrl: URLS.breach,
    estimatedMinutes: 3,
    scoutSays: null  // loaded from DIALOGUE.briefing.breachRecon[accountId]
  },
  debrief: DEBRIEF_BREACH,
  dialogueKey: a.id
}));


// ═══════════════════════════════════════════════════════════════════════════════
// RECON: LOGIN HISTORY REVIEW (email accounts only — 5 missions)
// ═══════════════════════════════════════════════════════════════════════════════

const LOGIN_STEPS = {
  gmail: [
    { text: "Go to myaccount.google.com/notifications" },
    { text: "Click \"Review security events\" under Recent security activity" },
    { text: "Look for unfamiliar devices, locations, or times" }
  ],
  outlook: [
    { text: "Go to account.live.com/activity" },
    { text: "Review the list of recent sign-in attempts" },
    { text: "Check for unfamiliar locations or \"Unsuccessful sign-in\" entries" }
  ],
  icloud: [
    { text: "Go to appleid.apple.com and sign in" },
    { text: "Scroll to the Devices section" },
    { text: "Check that every listed device is one you own or recognize" }
  ],
  yahoo: [
    { text: "Go to login.yahoo.com/account/activity" },
    { text: "Review recent login activity" },
    { text: "Look for sign-ins from locations or devices you don't recognize" }
  ],
  protonmail: [
    { text: "Go to account.proton.me/security" },
    { text: "Scroll to \"Security logs\"" },
    { text: "Review recent authentication events for unfamiliar sessions" }
  ]
};

const emailAccounts = ACCOUNTS.filter(a => a.category === "email");

const loginHistoryMissions = emailAccounts.map(a => ({
  id: `login-history-${a.id}`,
  district: "master-keys",
  phase: "recon",
  account: a.name,
  category: a.category,
  briefing: {
    title: `Login History: ${a.name}`,
    why: "Breach databases tell you if your password leaked. Login history tells you if someone used it. Most email providers keep a log of every device, location, and IP address that's accessed your account recently. If there's a login from a city you've never visited on a device you've never owned — that's not a mystery. That's someone else being you, badly.",
    steps: LOGIN_STEPS[a.id],
    externalUrl: url("login", a.id),
    estimatedMinutes: 5,
    scoutSays: null  // loaded from DIALOGUE.briefing.loginHistory.scoutSays[]
  },
  debrief: DEBRIEF_LOGIN_HISTORY,
  dialogueKey: a.id
}));


// ═══════════════════════════════════════════════════════════════════════════════
// FORTIFY: PASSWORD RESET (all 9 accounts)
// ═══════════════════════════════════════════════════════════════════════════════

const PASSWORD_STEPS = {
  gmail:      [
    { text: "Go to myaccount.google.com/signinoptions/password" },
    { text: "Sign in and choose a new, unique password (use a password manager)" },
    { text: "Confirm the change" }
  ],
  outlook:    [
    { text: "Go to account.live.com/password/change" },
    { text: "Enter your current password, then a new unique password" },
    { text: "Save the new password in your password manager" }
  ],
  icloud:     [
    { text: "Go to appleid.apple.com and sign in" },
    { text: "Go to Sign-In and Security → Password" },
    { text: "Set a new unique password and save it in your password manager" }
  ],
  yahoo:      [
    { text: "Go to login.yahoo.com/account/security" },
    { text: "Click \"Change password\"" },
    { text: "Set a new unique password and save it in your password manager" }
  ],
  protonmail: [
    { text: "Go to account.proton.me/security" },
    { text: "Click \"Change password\" under Password" },
    { text: "Set a new unique password and save it in your password manager" }
  ],
  apple:      [
    { text: "Go to appleid.apple.com and sign in" },
    { text: "Go to Sign-In and Security → Password" },
    { text: "Set a new unique password (different from your iCloud password if separate)" }
  ],
  google:     [
    { text: "Go to myaccount.google.com/signinoptions/password" },
    { text: "Sign in and set a new unique password" },
    { text: "Save it in your password manager" }
  ],
  microsoft:  [
    { text: "Go to account.microsoft.com/security" },
    { text: "Click \"Change password\"" },
    { text: "Set a new unique password and save it in your password manager" }
  ],
  facebook:   [
    { text: "Go to facebook.com/settings → Security and Login" },
    { text: "Click \"Change password\"" },
    { text: "Set a new unique password and save it in your password manager" }
  ]
};

const passwordResetMissions = ACCOUNTS.map(a => ({
  id: `password-reset-${a.id}`,
  district: "master-keys",
  phase: "fortify",
  account: a.name,
  category: a.category,
  briefing: {
    title: `Password Reset: ${a.name}`,
    why: "A unique password is one that exists nowhere else in the universe. Not “nowhere else on this site” — nowhere. If you use the same password for Gmail and for that recipe site that got breached in 2019, those are the same password as far as the breach economy is concerned. Attackers don't hand-type your password into Gmail. They have scripts that try leaked credentials across thousands of sites per minute while they do something else. Your reused password is their background process.",
    steps: PASSWORD_STEPS[a.id],
    externalUrl: url("password", a.id),
    estimatedMinutes: 5,
    scoutSays: null  // loaded from DIALOGUE.briefing.passwordReset.scoutSays[]
  },
  debrief: DEBRIEF_PASSWORD,
  dialogueKey: a.id
}));


// ═══════════════════════════════════════════════════════════════════════════════
// FORTIFY: 2FA SETUP (all 9 accounts)
// ═══════════════════════════════════════════════════════════════════════════════

const TFA_STEPS = {
  gmail:      [
    { text: "Go to myaccount.google.com/signinoptions/two-step-verification" },
    { text: "Click \"Get started\" and follow the prompts" },
    { text: "Choose Authenticator app (preferred) or SMS as your second factor" }
  ],
  outlook:    [
    { text: "Go to account.live.com/proofs/manage/additional" },
    { text: "Turn on two-step verification" },
    { text: "Set up the Microsoft Authenticator app or another authenticator" }
  ],
  icloud:     [
    { text: "On your iPhone: Settings → [Your Name] → Sign-In & Security" },
    { text: "Tap \"Turn On Two-Factor Authentication\"" },
    { text: "Follow the prompts to verify your phone number" }
  ],
  yahoo:      [
    { text: "Go to login.yahoo.com/account/security" },
    { text: "Click \"Two-step verification\"" },
    { text: "Choose a phone number or authenticator app and follow the setup" }
  ],
  protonmail: [
    { text: "Go to account.proton.me/security" },
    { text: "Scroll to \"Two-factor authentication\" and click Enable" },
    { text: "Scan the QR code with your authenticator app and enter the verification code" }
  ],
  apple:      [
    { text: "On your iPhone: Settings → [Your Name] → Sign-In & Security" },
    { text: "Tap \"Turn On Two-Factor Authentication\" (if not already on)" },
    { text: "Verify your phone number for receiving codes" }
  ],
  google:     [
    { text: "Go to myaccount.google.com/signinoptions/two-step-verification" },
    { text: "Click \"Get started\"" },
    { text: "Set up Google Authenticator or a security key" }
  ],
  microsoft:  [
    { text: "Go to account.microsoft.com/security" },
    { text: "Select \"Advanced security options\"" },
    { text: "Turn on two-step verification and set up the Authenticator app" }
  ],
  facebook:   [
    { text: "Go to facebook.com/settings → Security and Login" },
    { text: "Find \"Two-Factor Authentication\" and click Edit" },
    { text: "Choose Authentication App and scan the QR code" }
  ]
};

const tfaSetupMissions = ACCOUNTS.map(a => ({
  id: `tfa-setup-${a.id}`,
  district: "master-keys",
  phase: "fortify",
  account: a.name,
  category: a.category,
  briefing: {
    title: `2FA Setup: ${a.name}`,
    why: "Two-factor authentication means even if someone has your password, they still need your phone, your fingerprint, or a hardware key to get in. It’s the deadbolt on top of the lock. Without it, your password is the only thing between your account and anyone with a laptop and a list. With it, they also need to physically steal something from you — and most cybercriminals are not committing to that level of cardio.",
    steps: TFA_STEPS[a.id],
    externalUrl: url("tfa", a.id),
    estimatedMinutes: 5,
    scoutSays: null
  },
  debrief: DEBRIEF_TFA,
  dialogueKey: a.id
}));


// ═══════════════════════════════════════════════════════════════════════════════
// FORTIFY: RECOVERY OPTIONS AUDIT (all 9 accounts)
// ═══════════════════════════════════════════════════════════════════════════════

const RECOVERY_STEPS = {
  gmail:      [
    { text: "Go to myaccount.google.com/security" },
    { text: "Check your recovery phone and recovery email under \"Ways we can verify it’s you\"" },
    { text: "Remove any phone numbers or emails you no longer control" }
  ],
  outlook:    [
    { text: "Go to account.live.com/proofs/manage" },
    { text: "Review your security info: phone numbers and alternate emails" },
    { text: "Remove old numbers, add current ones" }
  ],
  icloud:     [
    { text: "Go to appleid.apple.com → Sign-In and Security" },
    { text: "Check your trusted phone numbers and account recovery contacts" },
    { text: "Remove any numbers you no longer own" }
  ],
  yahoo:      [
    { text: "Go to login.yahoo.com/account/security" },
    { text: "Review recovery phone numbers and email addresses" },
    { text: "Update or remove any that are outdated" }
  ],
  protonmail: [
    { text: "Go to account.proton.me/recovery" },
    { text: "Check your recovery email and recovery phone" },
    { text: "Make sure both still belong to you" }
  ],
  apple:      [
    { text: "Go to appleid.apple.com → Sign-In and Security" },
    { text: "Review trusted phone numbers and recovery key settings" },
    { text: "Remove old trusted numbers, verify current ones" }
  ],
  google:     [
    { text: "Go to myaccount.google.com/security" },
    { text: "Review recovery phone and recovery email" },
    { text: "Update any outdated contact info" }
  ],
  microsoft:  [
    { text: "Go to account.microsoft.com/security" },
    { text: "Click \"Update my sign-in preferences\" or \"Security info\"" },
    { text: "Verify all phone numbers and backup emails are current" }
  ],
  facebook:   [
    { text: "Go to facebook.com/settings → Security and Login" },
    { text: "Review \"Setting up extra security\" for trusted contacts" },
    { text: "Check your email and phone under Personal Information settings" }
  ]
};

const recoveryAuditMissions = ACCOUNTS.map(a => ({
  id: `recovery-audit-${a.id}`,
  district: "master-keys",
  phase: "fortify",
  account: a.name,
  category: a.category,
  briefing: {
    title: `Recovery Audit: ${a.name}`,
    why: "Recovery options are the back door to your account — the phone number and backup email that let you reset your password when you forget it. They also let anyone who controls that phone number or backup email reset your password when they want to. If your recovery phone is a number you no longer own — congratulations, someone at a Verizon store just became your account’s legal next of kin.",
    steps: RECOVERY_STEPS[a.id],
    externalUrl: url("recovery", a.id),
    estimatedMinutes: 4,
    scoutSays: null
  },
  debrief: DEBRIEF_RECOVERY,
  dialogueKey: a.id
}));


// ═══════════════════════════════════════════════════════════════════════════════
// RECLAIM: PRIVACY SETTINGS REVIEW (all 9 accounts)
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVACY_STEPS = {
  gmail:      [
    { text: "Go to myaccount.google.com/data-and-privacy" },
    { text: "Review Web & App Activity, Location History, and YouTube History — pause anything you don’t need" },
    { text: "Check \"Ad personalization\" and turn it off if you prefer" }
  ],
  outlook:    [
    { text: "Go to account.microsoft.com/privacy" },
    { text: "Review your activity data: browsing, search, location, voice" },
    { text: "Clear what you don’t want stored and adjust privacy settings" }
  ],
  icloud:     [
    { text: "Go to privacy.apple.com" },
    { text: "Review what data Apple stores (you can request a copy)" },
    { text: "On your device: Settings → Privacy & Security → review app permissions" }
  ],
  yahoo:      [
    { text: "Go to login.yahoo.com/account/personalinfo" },
    { text: "Review what’s shared with advertisers under Ad Interest Manager" },
    { text: "Opt out of personalized ads where possible" }
  ],
  protonmail: [
    { text: "Go to account.proton.me → Settings" },
    { text: "Review \"Privacy and data collection\" settings" },
    { text: "Proton collects very little by design — verify defaults are still tight" }
  ],
  apple:      [
    { text: "On your device: Settings → Privacy & Security" },
    { text: "Review Location Services, Tracking, and Analytics & Improvements" },
    { text: "Turn off \"Share iPhone Analytics\" and \"Personalized Ads\"" }
  ],
  google:     [
    { text: "Go to myaccount.google.com/data-and-privacy" },
    { text: "Review all activity controls: Web & App Activity, Location, YouTube" },
    { text: "Visit adssettings.google.com and review/turn off ad personalization" }
  ],
  microsoft:  [
    { text: "Go to account.microsoft.com/privacy" },
    { text: "Review activity history and clear categories you don’t want tracked" },
    { text: "Check advertising preferences and opt out of personalized ads" }
  ],
  facebook:   [
    { text: "Go to facebook.com/settings → Privacy" },
    { text: "Set \"Who can see your future posts\" to Friends (or more restrictive)" },
    { text: "Go to Off-Facebook Activity and clear history, then manage future activity" }
  ]
};

const privacySettingsMissions = ACCOUNTS.map(a => ({
  id: `privacy-settings-${a.id}`,
  district: "master-keys",
  phase: "reclaim",
  account: a.name,
  category: a.category,
  briefing: {
    title: `Privacy Settings: ${a.name}`,
    why: "Your account’s privacy settings control who sees your data, what gets shared with third parties, and how much of your activity feeds advertising profiles. Most of these settings defaulted to \"share everything\" when you signed up, because the signup flow was designed by people whose bonuses depend on you sharing everything. Today we adjust the dials. Not all the way to zero — that breaks things — but to somewhere that reflects the fact that you’re a person, not a product.",
    steps: PRIVACY_STEPS[a.id],
    externalUrl: url("privacy", a.id),
    estimatedMinutes: 7,
    scoutSays: null
  },
  debrief: DEBRIEF_PRIVACY,
  dialogueKey: a.id
}));


// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT — ordered by phase progression
// ═══════════════════════════════════════════════════════════════════════════════

export const MISSIONS = [
  // Phase 1: Survey
  surveyMission,

  // Phase 2: Recon — breach checks, then login history
  ...breachReconMissions,
  ...loginHistoryMissions,

  // Phase 3: Fortify — passwords, then 2FA, then recovery
  ...passwordResetMissions,
  ...tfaSetupMissions,
  ...recoveryAuditMissions,

  // Phase 4: Reclaim — privacy settings
  ...privacySettingsMissions,
];

export { ACCOUNTS };
