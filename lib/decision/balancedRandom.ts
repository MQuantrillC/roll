import { pickOne, sample, secureRng, type Rng } from "@/lib/decision/random";
import { dedupeByCanonicalKey } from "@/lib/decision/dedupe";
import type { DecisionOutcome, Pools } from "@/lib/decision/types";

/**
 * MODE 2 — Balanced Random ⚖️  (recommended default)
 *
 * "Everyone picks a few options. We'll randomly choose from the group."
 *
 * Each participant contributes up to `picksPerPerson` items (their own
 * explicit picks). The combined pool is deduped by canonical identity
 * and a winner is drawn uniformly. Because contribution is capped per
 * person, list size does not translate into influence.
 */
export function balancedRandom(picks: Pools, rng: Rng = secureRng): DecisionOutcome {
  const pool = dedupeByCanonicalKey(Object.values(picks).flat());
  if (pool.length === 0) throw new Error("No picks available to decide from");
  return { winner: pickOne(pool, rng), pool };
}

/**
 * Auto-pick helper: when a participant doesn't want to choose manually,
 * sample N random items from their list. If N exceeds the list size the
 * whole list is used.
 */
export function autoPicksFor(items: Pools[string], n: number, rng: Rng = secureRng) {
  return sample(dedupeByCanonicalKey(items), Math.max(1, n), rng);
}
