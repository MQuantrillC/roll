import { canonicalKey, type Item } from "@/lib/types";
import { pickOne, secureRng, type Rng } from "@/lib/decision/random";
import type { Pools } from "@/lib/decision/types";

export interface MutualMatchResult {
  /** One representative item per mutual match (deduped across owners). */
  matches: Item[];
  /** Winner drawn from the matches, or null when there is no overlap. */
  winner: Item | null;
}

/**
 * MODE 4 — Mutual Match ❤️
 *
 * "Everyone picks their favourites. We'll find something you all agree on."
 *
 * Each participant independently selects their top N. The intersection
 * is computed by canonical identity (same TMDB entity, or same
 * normalized title for plain-text items) — never by fuzzy name
 * similarity. Every participant has identical influence by construction.
 *
 * No overlap is NOT an error: the caller gracefully offers other modes.
 */
export function mutualMatch(picks: Pools, rng: Rng = secureRng): MutualMatchResult {
  const participants = Object.entries(picks).filter(([, items]) => items.length > 0);
  if (participants.length === 0) return { matches: [], winner: null };

  // Count, per canonical key, how many DISTINCT participants picked it.
  const byKey = new Map<string, { pickedBy: Set<string>; best: Item }>();
  for (const [userId, items] of participants) {
    for (const item of items) {
      const key = canonicalKey(item);
      const entry = byKey.get(key);
      if (!entry) {
        byKey.set(key, { pickedBy: new Set([userId]), best: item });
      } else {
        entry.pickedBy.add(userId);
        if (!entry.best.metadata?.poster_path && item.metadata?.poster_path) {
          entry.best = item;
        }
      }
    }
  }

  const needed = participants.length;
  const matches = [...byKey.values()]
    .filter((e) => e.pickedBy.size === needed)
    .map((e) => e.best);

  if (matches.length === 0) return { matches: [], winner: null };
  return { matches, winner: pickOne(matches, rng) };
}

/**
 * Overlap across FULL lists (used by "Just Decide For Us" to detect
 * whether a mutual-style decision is possible without asking anyone
 * to pick).
 */
export function fullListOverlap(pools: Pools): Item[] {
  return mutualMatch(pools, () => 0).matches;
}
