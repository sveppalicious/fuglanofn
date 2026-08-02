/**
 * Icelandic sorting is not ASCII sorting — Á, Ð, Í, Ó, Ú, Ý, Þ, Æ and Ö are
 * letters in their own right, not decorated versions of A, D, I and so on. Þ, Æ
 * and Ö come after Z, at the very end of the alphabet.
 *
 * This does not use `Intl.Collator("is-IS")`. Icelandic is a small locale and
 * plenty of runtimes ship without its collation data; when that happens
 * `Intl.Collator` does not throw, it silently resolves to the default locale and
 * files Æðarfugl next to Akurgæs. Because the same list is sorted on the server
 * during static generation and again in the browser when the user changes the
 * sort, a runtime that disagrees with Node would also produce a hydration
 * mismatch. An explicit table is a few lines and behaves identically everywhere.
 *
 * c, q, w and z are not part of the modern Icelandic alphabet but occur in
 * scientific and foreign names, and take their conventional slots.
 */
const ALPHABET = "aábcdðeéfghiíjklmnoópqrstuúvwxyýzþæö";

const LETTER_RANK = new Map<string, number>();
for (let i = 0; i < ALPHABET.length; i += 1) {
  LETTER_RANK.set(ALPHABET[i], 100 + i);
}

// Separators sort before letters so "Anas acuta" precedes "Anasarcus".
const SEPARATOR_RANK = new Map<string, number>([
  [" ", 0],
  ["-", 1],
  ["'", 2],
  ["’", 2],
  [".", 3],
]);

function rank(ch: string): number {
  const letter = LETTER_RANK.get(ch);
  if (letter !== undefined) return letter;
  const separator = SEPARATOR_RANK.get(ch);
  if (separator !== undefined) return separator;
  if (ch >= "0" && ch <= "9") return 10 + ch.charCodeAt(0) - 48;
  // Anything unforeseen lands after the alphabet, in a stable order.
  return 1000 + ch.codePointAt(0)!;
}

export function compareNames(a: string, b: string): number {
  if (a === b) return 0;

  const x = Array.from(a.toLowerCase());
  const y = Array.from(b.toLowerCase());
  const shared = Math.min(x.length, y.length);

  for (let i = 0; i < shared; i += 1) {
    const diff = rank(x[i]) - rank(y[i]);
    if (diff !== 0) return diff;
  }

  if (x.length !== y.length) return x.length - y.length;

  // Same letters, different case: settle it deterministically rather than
  // returning 0 and letting the sort be unstable across engines.
  return a < b ? -1 : a > b ? 1 : 0;
}

export function byName<T>(key: (item: T) => string) {
  return (a: T, b: T) => compareNames(key(a), key(b));
}
