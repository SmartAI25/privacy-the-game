// Company-name keys, so one broker listed in several state registries dedupes.
const SUFFIXES = new Set(['inc', 'llc', 'corp', 'corporation', 'co', 'ltd', 'lp', 'holdings', 'company', 'limited']);

export function normalizeName(name) {
  const words = String(name)
    .toLowerCase()
    .replace(/&/g, ' and ') // "Dun & Bradstreet" = "Dun and Bradstreet"
    .replace(/[.']/g, '') // "l.l.c." -> "llc", "o'brien" -> "obrien"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  // Only trailing legal suffixes go; never strip the whole name.
  // "& Co." leaves a dangling "and" once "co" goes: drop it too.
  let stripped = false;
  while (words.length > 1 && (SUFFIXES.has(words[words.length - 1]) || (stripped && words[words.length - 1] === 'and'))) { words.pop(); stripped = true; }
  return words.join(' ');
}

export function slugify(name) {
  return normalizeName(name).replace(/ /g, '-');
}
