import { normalizeTitle } from "@/lib/normalize";

export interface ParsedItem {
  title: string;
  normalized: string;
}

export interface ParseResult {
  items: ParsedItem[];
  duplicates: string[]; // titles that appeared more than once (first kept)
}

/**
 * Deterministic bulk-list parser. Accepts almost any pasted format:
 * plain lines, "-" / "*" / "•" bullets, "1." / "1)" / "01 -" numbering,
 * surrounding quotes, messy indentation and blank lines.
 *
 * It intentionally does NOT strip punctuation inside titles ("Dune: Part
 * Two", "M*A*S*H", "8½" survive intact) — only leading list decoration
 * and surrounding quotes are removed.
 */
export function parseBulkList(text: string): ParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");

  const items: ParsedItem[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const raw of lines) {
    const title = cleanLine(raw);
    if (!title) continue;

    const normalized = normalizeTitle(title);
    if (!normalized) continue;

    if (seen.has(normalized)) {
      duplicates.push(title);
      continue;
    }
    seen.add(normalized);
    items.push({ title, normalized });
  }

  return { items, duplicates };
}

function cleanLine(raw: string): string {
  let s = raw.trim();
  if (!s) return "";

  // Leading bullets: -, –, —, *, •, ·, > (possibly repeated with spaces)
  s = s.replace(/^(?:[-–—*•·>]+\s*)+/, "");

  // Leading numbering: "1.", "1)", "(1)", "1 -", "01.", "12:" etc.
  // Only strip when followed by separator + text, so titles that are
  // purely numeric ("1917", "300") are left alone.
  s = s.replace(/^\(?\d{1,3}\)?\s*[.):\-–]\s+/, "");
  s = s.replace(/^\(?\d{1,3}\)?[.)]\s*/, "");

  s = s.trim();

  // Surrounding quotes (straight or curly), only when they wrap the line
  const quoted = s.match(/^["'“‘](.+)["'”’]$/);
  if (quoted) s = quoted[1].trim();

  // Collapse internal runs of whitespace
  s = s.replace(/\s+/g, " ");

  return s;
}
