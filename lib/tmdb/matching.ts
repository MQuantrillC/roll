import { normalizeTitle } from "@/lib/normalize";
import type { TmdbSearchResult } from "@/lib/tmdb/types";

export type MatchDecision =
  | { kind: "match"; result: TmdbSearchResult }
  | { kind: "ambiguous"; options: TmdbSearchResult[] }
  | { kind: "none" };

/**
 * Decide whether TMDB search results confidently identify a title.
 * A source year (e.g. Letterboxd CSV) narrows the candidates and
 * auto-resolves titles with many versions ("Dune", "Parasite").
 */
export function decideMatch(
  normalizedTitle: string,
  sourceYear: number | undefined,
  all: TmdbSearchResult[]
): MatchDecision {
  if (all.length === 0) return { kind: "none" };

  const inYear = sourceYear
    ? all.filter((r) => {
        const y = Number(r.release_date?.slice(0, 4));
        return Number.isInteger(y) && Math.abs(y - sourceYear) <= 1;
      })
    : [];
  const results = inYear.length > 0 ? inYear : all;

  const exact = results.filter((r) => normalizeTitle(r.title) === normalizedTitle);
  // Confident: exactly one exact-title match, or a single result overall.
  if (exact.length === 1) return { kind: "match", result: exact[0] };
  if (results.length === 1) return { kind: "match", result: results[0] };
  return { kind: "ambiguous", options: (exact.length > 1 ? exact : results).slice(0, 4) };
}
