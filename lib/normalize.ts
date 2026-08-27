/**
 * Normalize a title for duplicate detection.
 * "The Dark Knight", "the dark knight" and "- The Dark Knight " all
 * normalize to the same string. Punctuation that can distinguish real
 * titles is kept out of the comparison but never removed from the
 * stored title itself.
 */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[’'"“”‘]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ") // collapse punctuation to spaces
    .trim()
    .replace(/\s+/g, " ");
}
