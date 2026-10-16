export function normalizeSearchText(text: string): string { return text.normalize("NFKC").toLowerCase(); }
export function tokens(text: string): string[] { return normalizeSearchText(text).match(/[\p{L}\p{N}]+/gu) ?? []; }

export interface TokenSpan { term: string; start: number; end: number; }
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Search normalized text, but keep each token's conservative original-text range. */
export function tokenSpans(text: string): TokenSpan[] {
  const normalized = normalizeSearchText(text);
  const starts: number[] = [], ends: number[] = [];
  let joined = "";
  for (const part of graphemes.segment(text)) {
    const piece = part.segment.normalize("NFKC"); joined += piece;
    for (const character of piece) {
      // Default Unicode case conversion expands some characters. Contextual
      // sigma changes the character, but not its range or UTF-16 length.
      for (let unit = 0; unit < character.toLowerCase().length; unit++) {
        starts.push(part.index); ends.push(part.index + part.segment.length);
      }
    }
  }
  if (joined !== text.normalize("NFKC") || starts.length !== normalized.length) {
    throw new Error("This passage could not be mapped to its original text safely. Refine the search or use Find evidence to inspect the note.");
  }
  return [...normalized.matchAll(/[\p{L}\p{N}]+/gu)].map(match => ({
    term: match[0], start: starts[match.index]!, end: ends[match.index + match[0].length - 1]!
  }));
}
