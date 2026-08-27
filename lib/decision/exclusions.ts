import { canonicalKey, type Item } from "@/lib/types";
import type { Pools } from "@/lib/decision/types";

export interface ExclusionOptions {
  /** Canonical keys of recently chosen winners to avoid. */
  recentKeys?: Set<string>;
  /** Drop items marked watched / visited. */
  excludeDone?: boolean;
}

export interface ExclusionResult {
  pools: Pools;
  removedRecent: number;
  removedDone: number;
  remaining: number;
}

/**
 * Apply pre-decision exclusions (spec §16/§31). Never silently fails:
 * the caller inspects `remaining` and offers "use your full list?"
 * when exclusions leave too few options.
 */
export function applyExclusions(pools: Pools, opts: ExclusionOptions): ExclusionResult {
  let removedRecent = 0;
  let removedDone = 0;
  const out: Pools = {};

  for (const [userId, items] of Object.entries(pools)) {
    out[userId] = items.filter((item: Item) => {
      if (opts.excludeDone && item.status === "done") {
        removedDone++;
        return false;
      }
      if (opts.recentKeys?.has(canonicalKey(item))) {
        removedRecent++;
        return false;
      }
      return true;
    });
  }

  const remaining = Object.values(out).reduce((n, i) => n + i.length, 0);
  return { pools: out, removedRecent, removedDone, remaining };
}
