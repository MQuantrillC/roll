import { pickOne, secureRng, type Rng } from "@/lib/decision/random";
import { dedupeByCanonicalKey } from "@/lib/decision/dedupe";
import type { DecisionOutcome, Pools } from "@/lib/decision/types";

export type PureRandomWeighting = "item" | "person";

/**
 * MODE 1 — Pure Random 🎡
 *
 * "Everyone throws their options into one pool. Let fate decide."
 *
 * Fairness (documented per spec §30):
 * - weighting "item":   every distinct item has equal probability.
 *   Duplicates across members are collapsed first so an item two people
 *   added is not counted twice.
 * - weighting "person": every participant has equal influence
 *   (1 / participants), regardless of list size. A participant is drawn
 *   uniformly, then an item is drawn uniformly from their own pool.
 *   Participants with empty pools are excluded from the draw.
 */
export function pureRandom(
  pools: Pools,
  weighting: PureRandomWeighting = "item",
  rng: Rng = secureRng
): DecisionOutcome {
  const nonEmpty = Object.entries(pools).filter(([, items]) => items.length > 0);
  if (nonEmpty.length === 0) {
    throw new Error("No items available to decide from");
  }

  if (weighting === "person") {
    const [, items] = pickOne(nonEmpty, rng);
    const pool = dedupeByCanonicalKey(items);
    return { winner: pickOne(pool, rng), pool: dedupeByCanonicalKey(nonEmpty.flatMap(([, i]) => i)) };
  }

  const pool = dedupeByCanonicalKey(nonEmpty.flatMap(([, items]) => items));
  return { winner: pickOne(pool, rng), pool };
}
