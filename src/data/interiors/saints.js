// Building Interiors: the saints. Scout's name for the people whose work made
// this map knowable. Tributes honor the work and tell the hard parts plainly:
// no speculation about motives or private lives, current names and pronouns.
// Order is the spec's. Facts checked 2026-10-20 against the linked sources:
//  - Swartz (1986–2013): at 14, in the working group that wrote RSS 1.0;
//    downloaded about 2.7 million PACER court records in 2008 (no charges);
//    charged in 2011 over JSTOR downloads at MIT, facing up to 35 years, raised by the September 2012
//    superseding indictment; died
//    by suicide on 2013-01-11, at 26 (Wikipedia).
//  - Snowden (born 1983): NSA contractor at Booz Allen Hamilton; gave
//    documents to Greenwald, Poitras, Gellman and MacAskill in June 2013;
//    charged under the Espionage Act; passport revoked; in Russia since
//    2013-06-23, a Russian citizen since 2022 (Wikipedia, the Guardian).
//  - Klein (1945–2025): at AT&T 22+ years (New York, then California, San
//    Francisco from 1998; Wikipedia; EFF's obituary says "most of that in San
//    Francisco", so the copy only claims his last years there); in early 2006 brought EFF evidence
//    that AT&T routed copies of internet traffic to an NSA-controlled room
//    (641A) in San Francisco; Hepting v. AT&T; Congress granted the telecoms
//    retroactive immunity in 2008; died 2025-03-08 (EFF, Wikipedia).
//  - Zimmermann (born 1954): released PGP with source code in 1991; a
//    three-year criminal investigation over export rules ended in 1996
//    without charges; MIT Press printed the source code as a book (Wikipedia).
//  - Ellsberg (1931–2023): RAND analyst; released the Pentagon Papers in 1971;
//    charged under the Espionage Act; all charges dismissed in 1973 over
//    government misconduct; died 2023-06-16, at 92 (Wikipedia, National
//    Archives).
//  - Manning (born 1987): Army intelligence analyst; disclosed the Iraq and
//    Afghanistan war logs and diplomatic cables to WikiLeaks; arrested 2010;
//    sentenced to 35 years in 2013; President Obama commuted it in January
//    2017 to the nearly seven years served (Wikipedia).
//  - Drake (born 1957): NSA senior executive; raised Trailblazer waste with
//    his bosses, the inspectors general and Congress; indicted 2010 under the
//    Espionage Act; the ten charges were dropped in 2011, a misdemeanor plea,
//    probation; the judge called it "unconscionable" to bring such charges
//    and drop them on the eve of trial (Wikipedia).
//  - Binney (born 1943): NSA technical director, 30+ years; ThinThread
//    encrypted Americans' identifying information and needed a court order to
//    decrypt; retired 2001-10-31; joined a 2002 inspector-general complaint;
//    FBI agents raided his home in 2007; never charged (Wikipedia).
//  - Poitras (born 1964): documentary filmmaker; one of the first journalists
//    to meet Snowden in Hong Kong; Citizenfour won the Academy Award for Best
//    Documentary Feature; repeatedly stopped and questioned at the border
//    before that (Wikipedia).

const wiki = (title, page) => ({ label: `Wikipedia: ${title}`, url: `https://en.wikipedia.org/wiki/${page}` });

// Edward Snowden's alcove: the Master Keys accounts named in the 2013 PRISM
// documents (or run by a company named there).
const PRISM_ACCOUNTS = ['gmail', 'google', 'outlook', 'microsoft', 'yahoo', 'icloud', 'apple_id', 'facebook'];

/** @typedef {{ id: string, name: string, title: string, years: string, tribute: string, story: string, sources: {label: string, url: string}[], accounts: string[] }} Saint */

/** @type {Record<string, Saint>} */
export const SAINTS = {
  swartz: {
    id: 'swartz',
    name: 'Saint Aaron Swartz',
    title: 'Public access to research and court records',
    years: '1986–2013',
    tribute: 'Aaron spent his short life opening up knowledge that sat behind paywalls. I keep his name close.',
    story: 'At 14, Aaron was part of the working group that wrote RSS 1.0, an early version of the web-feed format. In 2008 he downloaded about 2.7 million federal court records from PACER, the courts’ paid records system; federal prosecutors brought no charges. In 2011 federal prosecutors charged him over downloading academic articles from JSTOR at MIT, with a possible sentence of up to 35 years, and later charges raised it further. He died by suicide in January 2013, at 26, before the case went to trial.',
    sources: [wiki('Aaron Swartz', 'Aaron_Swartz')],
    accounts: [],
  },
  snowden: {
    id: 'snowden',
    name: 'Saint Edward Snowden',
    title: 'The 2013 NSA disclosures',
    years: 'born 1983',
    tribute: 'Much of this desk got easier to name after 2013, because of Edward. I think of him every time I draw it.',
    story: 'Edward was an NSA contractor. In June 2013 he gave journalists, among them Glenn Greenwald, Laura Poitras and Ewen MacAskill, documents describing programs like PRISM, which collected data from the biggest email and cloud companies. The US charged him under the Espionage Act and revoked his passport. He has lived in exile in Russia ever since.',
    sources: [
      wiki('Edward Snowden', 'Edward_Snowden'),
      { label: 'The Guardian (2013): Edward Snowden, the whistleblower behind the NSA surveillance revelations', url: 'https://www.theguardian.com/world/2013/jun/09/edward-snowden-nsa-whistleblower-surveillance' },
      { label: 'The Guardian (2013): NSA Prism program taps in to user data of Apple, Google and others', url: 'https://www.theguardian.com/world/2013/jun/06/us-tech-giants-nsa-data' },
    ],
    accounts: PRISM_ACCOUNTS,
  },
  klein: {
    id: 'klein',
    name: 'Saint Mark Klein',
    title: 'AT&T Room 641A',
    years: '1945–2025',
    tribute: 'Mark was a technician who knew what the wires in that room were for, and said so. Quiet work, and brave.',
    story: 'Mark worked at AT&T for more than 22 years, his last years in San Francisco. In 2006 he brought the Electronic Frontier Foundation evidence that AT&T was routing copies of internet traffic into a secret room there controlled by the NSA: Room 641A. His documents were key evidence in EFF’s lawsuit, Hepting v. AT&T. In 2008 Congress gave the phone companies retroactive immunity, and the case was dismissed. He died in March 2025, at 79.',
    sources: [
      wiki('Mark Klein', 'Mark_Klein'),
      wiki('Room 641A', 'Room_641A'),
      { label: 'EFF: Hepting v. AT&T', url: 'https://www.eff.org/cases/hepting' },
      { label: 'EFF (2025): In Memoriam: Mark Klein, AT&T whistleblower who revealed NSA mass spying', url: 'https://www.eff.org/deeplinks/2025/03/memoriam-mark-klein-att-whistleblower-about-nsa-mass-spying' },
    ],
    accounts: [],
  },
  zimmermann: {
    id: 'zimmermann',
    name: 'Saint Phil Zimmermann',
    title: 'PGP, encryption for everyone',
    years: 'born 1954',
    tribute: 'Phil gave strong encryption to anyone who wanted it. The locks on these doors are cousins of his.',
    story: 'In 1991 Phil released PGP, strong email encryption anyone could use, and published its source code. At the time US export rules treated strong encryption software as a munition, and he spent three years under criminal investigation. MIT Press printed the source code as a book, and the case was dropped in 1996 without charges.',
    sources: [
      wiki('Phil Zimmermann', 'Phil_Zimmermann'),
      { label: 'Phil Zimmermann’s own site', url: 'https://www.philzimmermann.com/' },
    ],
    accounts: ['protonmail', 'signal'],
  },
  ellsberg: {
    id: 'ellsberg',
    name: 'Saint Daniel Ellsberg',
    title: 'The Pentagon Papers',
    years: '1931–2023',
    tribute: 'Daniel showed the country the Pentagon’s own secret history of the war, and spent the rest of his life standing beside the next ones.',
    story: 'Daniel was a military analyst at RAND. In 1971 he gave the Pentagon Papers, a secret history of US decisions in the Vietnam War, to The New York Times, The Washington Post and other papers. He was charged under the Espionage Act, and in 1973 a judge dismissed every charge because of government misconduct, including a break-in at his psychiatrist’s office. He spoke up for later whistleblowers until his death in 2023, at 92.',
    sources: [
      wiki('Daniel Ellsberg', 'Daniel_Ellsberg'),
      wiki('Pentagon Papers', 'Pentagon_Papers'),
      { label: 'US National Archives: the Pentagon Papers', url: 'https://www.archives.gov/research/pentagon-papers' },
    ],
    accounts: [],
  },
  manning: {
    id: 'manning',
    name: 'Saint Chelsea Manning',
    title: 'The Iraq and Afghanistan war logs',
    years: 'born 1987',
    tribute: 'Chelsea paid for what the public got to know with years of her life. She’s still here, and still speaking out.',
    story: 'Chelsea was an Army intelligence analyst in Iraq. In 2010 she gave WikiLeaks the Iraq and Afghanistan war logs and hundreds of thousands of diplomatic cables. She was arrested that year and in 2013 sentenced to 35 years. In January 2017 President Obama commuted her sentence, after nearly seven years in confinement.',
    sources: [wiki('Chelsea Manning', 'Chelsea_Manning')],
    accounts: [],
  },
  drake: {
    id: 'drake',
    name: 'Saint Thomas Drake',
    title: 'NSA whistleblower before Snowden',
    years: 'born 1957',
    tribute: 'Thomas tried every proper door first. That counts for a lot with me.',
    story: 'Thomas was a senior executive at the NSA. He raised concerns about waste in a program called Trailblazer with his bosses, the inspectors general and the intelligence committees in Congress, and later spoke with a reporter. In 2010 he was indicted under the Espionage Act. In 2011 all ten charges were dropped; he pleaded to one misdemeanor and got probation, and the judge called it ‘unconscionable’ to bring such heavy charges and then drop them on the eve of trial.',
    sources: [wiki('Thomas Drake', 'Thomas_Andrews_Drake')],
    accounts: [],
  },
  binney: {
    id: 'binney',
    name: 'Saint William Binney',
    title: 'NSA whistleblower before Snowden',
    years: 'born 1943',
    tribute: 'Bill built a system that kept Americans’ names locked unless a court said otherwise. Privacy can be designed in. He showed how.',
    story: 'Bill spent more than 30 years at the NSA and served as a technical director. His team’s system, ThinThread, encrypted Americans’ identifying details and needed a court order to unlock them. He retired in October 2001 and joined a 2002 complaint to the Defense Department’s inspector general. In 2007 FBI agents raided his home. He was never charged.',
    sources: [wiki('William Binney', 'William_Binney_(intelligence_official)')],
    accounts: [],
  },
  poitras: {
    id: 'poitras',
    name: 'Saint Laura Poitras',
    title: 'Carried the Snowden documents out to the public',
    years: 'born 1964',
    tribute: 'Laura kept the camera steady while the story was still dangerous to tell. Because of her, you can watch it happen.',
    story: 'Laura is a documentary filmmaker, and was one of the first journalists to meet Edward Snowden in Hong Kong in 2013. She reported on the documents and made Citizenfour, which won the Academy Award for Best Documentary Feature. Before any of that, by her own account, she had been stopped and questioned at US borders on dozens of trips.',
    sources: [wiki('Laura Poitras', 'Laura_Poitras'), wiki('Citizenfour', 'Citizenfour')],
    accounts: [],
  },
};

/** @returns {Saint[]} */
export function saintsForAccount(accountId) {
  return Object.values(SAINTS).filter((s) => s.accounts.includes(accountId));
}
