import type { Item } from "@/lib/types";
import { pickOne, secureRng, type Rng } from "@/lib/decision/random";
import { fullListOverlap } from "@/lib/decision/mutualMatch";
import { pureRandom } from "@/lib/decision/pureRandom";
import type { Pools } from "@/lib/decision/types";

export interface AutoDecideResult {
  winner: Item;
  /** Which strategy actually produced the winner. */
  strategy: "mutual_overlap" | "balanced_pool";
  /** The pool the winner came from (for the reveal UI). */
  pool: Item[];
}

/**
 * "✨ Just Decide For Us" — zero-interaction decision.
 *
 * If the participants' full lists already overlap, we treat the overlap
 * as implicit mutual matches and pick from it (everyone provably likes
 * the result). Otherwise we fall back to an equal-contribution random
 * draw so nobody's giant list dominates.
 *
 * Users shouldn't have to decide how they want to decide.
 */
export function autoDecide(pools: Pools, rng: Rng = secureRng): AutoDecideResult {
  const overlap = fullListOverlap(pools);
  const participantCount = Object.values(pools).filter((p) => p.length > 0).length;

  if (participantCount > 1 && overlap.length > 0) {
    return { winner: pickOne(overlap, rng), strategy: "mutual_overlap", pool: overlap };
  }

  const { winner, pool } = pureRandom(pools, "person", rng);
  return { winner, strategy: "balanced_pool", pool };
}
