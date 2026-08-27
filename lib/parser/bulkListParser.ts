import { normalizeTitle } from "@/lib/normalize";

export interface ParsedItem {
  title: string;
  normalized: string;
  /** Release year when the source provides one (e.g. Letterboxd CSV). */
  year?: number;
}

export interface ParseResult {
  items: ParsedItem[];
  duplicates: string[]; // titles that appeared more than once (first kept)
  /** Which format was detected. */
  source: "lines" | "csv" | "mal-xml";
}

/**
 * Deterministic bulk-list parser. Accepts almost any pasted format:
 *
 * - plain lines, "-" / "*" / "•" bullets, "1." / "1)" / "01 -" numbering,
 *   surrounding quotes, messy indentation and blank lines
 * - Letterboxd CSV exports (watchlist.csv / watched.csv — any CSV with a
 *   "Name" column; a "Year" column is used to disambiguate TMDB matches)
 * - MyAnimeList XML exports (<series_title> / <manga_title> entries)
 *
 * It intentionally does NOT strip punctuation inside titles ("Dune: Part
 * Two", "M*A*S*H", "8½" survive intact) — only leading list decoration
 * and surrounding quotes are removed.
 */
export function parseBulkList(text: string): ParseResult {
  const normalized = text.replace(/\r\n?/g, "\n");

  const malTitles = parseMalXml(normalized);
  if (malTitles) return dedupe(malTitles, "mal-xml");

  const csvItems = parseCsv(normalized);
  if (csvItems) return dedupe(csvItems, "csv");

  const lineItems: ParsedItem[] = [];
  for (const raw of normalized.split("\n")) {
    const title = cleanLine(raw);
    if (!title) continue;
    lineItems.push({ title, normalized: normalizeTitle(title) });
  }
  return dedupe(lineItems, "lines");
}

function dedupe(items: ParsedItem[], source: ParseResult["source"]): ParseResult {
  const seen = new Set<string>();
  const out: ParsedItem[] = [];
  const duplicates: string[] = [];
  for (const item of items) {
    if (!item.normalized) continue;
    if (seen.has(item.normalized)) {
      duplicates.push(item.title);
      continue;
    }
    seen.add(item.normalized);
    out.push(item);
  }
  return { items: out, duplicates, source };
}

// ---------- plain lines ----------

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

// ---------- CSV (Letterboxd exports & friends) ----------

/**
 * Returns items when the text looks like a CSV with a "Name"/"Title"
 * column in its header row (Letterboxd: `Date,Name,Year,Letterboxd URI`).
 * Returns null otherwise so the caller falls back to line parsing.
 */
function parseCsv(text: string): ParsedItem[] | null {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return null;

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  if (header.length < 2) return null;

  const nameIdx = header.findIndex((h) => h === "name" || h === "title");
  if (nameIdx === -1) return null;
  const yearIdx = header.findIndex((h) => h === "year");

  const items: ParsedItem[] = [];
  for (const line of lines.slice(1)) {
    const cols = splitCsvLine(line);
    const title = (cols[nameIdx] ?? "").trim();
    if (!title) continue;
    const yearRaw = yearIdx >= 0 ? Number((cols[yearIdx] ?? "").trim()) : NaN;
    const year = Number.isInteger(yearRaw) && yearRaw > 1870 && yearRaw < 2100 ? yearRaw : undefined;
    items.push({ title, normalized: normalizeTitle(title), year });
  }
  return items.length > 0 ? items : null;
}

/** Minimal CSV field splitter with support for quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field);
      field = "";
    } else {
      field += c;
    }
  }
  out.push(field);
  return out;
}

// ---------- MyAnimeList XML export ----------

/**
 * MAL exports wrap each entry's title in <series_title> (anime) or
 * <manga_title> (manga), usually inside CDATA. Returns null when the
 * text doesn't look like a MAL export.
 */
function parseMalXml(text: string): ParsedItem[] | null {
  if (!/<(series|manga)_title>/.test(text)) return null;

  const items: ParsedItem[] = [];
  const re = /<(?:series|manga)_title>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/(?:series|manga)_title>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const title = m[1].trim().replace(/\s+/g, " ");
    if (!title) continue;
    items.push({ title, normalized: normalizeTitle(title) });
  }
  return items.length > 0 ? items : null;
}
